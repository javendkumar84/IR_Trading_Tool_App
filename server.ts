import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  getAuditLogs,
  getNextTradeId,
  getDatabase,
  getDatabasePath,
  getAllTrades,
  getTradeById,
  getTradeVersions,
  logAuditEvent,
  saveTrade,
  updateTradeStatus,
  amendTrade,
} from './src/db/sqliteDb';
import { calculateTenorRiskBuckets, summarizePositionsByCurrency } from './src/lib/financialMath';
import { generateIRSwapXml, parseIRSwapXml } from './src/lib/xmlParser';
import { IRSwapTrade, MarketRateQuote, TradeStatus, WebSocketMessage } from './src/types';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // Initialize DB
  await getDatabase();

  const server = http.createServer(app);

  // WebSocket Server setup (noServer mode to avoid collision with Vite HMR)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // If request is for Vite HMR (contains vite-hmr header or sec-websocket-protocol), let Vite handle it
    const isViteHmr = request.headers['sec-websocket-protocol'] === 'vite-hmr';
    if (!isViteHmr) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  function broadcast(message: WebSocketMessage) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Initial Market Rates Quote State
  let liveMarketRates: MarketRateQuote[] = [
    { symbol: 'USD_SOFR_3M', name: 'USD SOFR 3M', currency: 'USD', rate: 3.82, changeBps: 0.5, updatedAt: new Date().toISOString() },
    { symbol: 'EUR_EURIBOR_6M', name: 'EUR EURIBOR 6M', currency: 'EUR', rate: 2.65, changeBps: -0.8, updatedAt: new Date().toISOString() },
    { symbol: 'GBP_SONIA_3M', name: 'GBP SONIA 3M', currency: 'GBP', rate: 4.12, changeBps: 1.2, updatedAt: new Date().toISOString() },
    { symbol: 'JPY_TONA_3M', name: 'JPY TONA 3M', currency: 'JPY', rate: 0.62, changeBps: 0.1, updatedAt: new Date().toISOString() },
    { symbol: 'UST_10Y_YIELD', name: 'US Treasury 10Y Benchmark', currency: 'USD', rate: 4.08, changeBps: 2.1, updatedAt: new Date().toISOString() },
  ];

  wss.on('connection', async (ws) => {
    try {
      const trades = await getAllTrades();
      const logs = await getAuditLogs();
      const positions = summarizePositionsByCurrency(trades);
      const tenorRisk = calculateTenorRiskBuckets(trades);

      const initStateMsg: WebSocketMessage = {
        type: 'INIT_STATE',
        payload: {
          trades,
          auditLogs: logs,
          positions,
          tenorRisk,
          marketRates: liveMarketRates,
        },
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(initStateMsg));
    } catch (err) {
      console.error('Error sending WS init state:', err);
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WebSocketMessage;
        if (msg.type === 'MARKET_TICK') {
          // Manual trigger from client if requested
          broadcast(msg);
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    });
  });

  // REST API Routes

  // Health check
  app.get('/api/health', async (req, res) => {
    try {
      const trades = await getAllTrades();
      res.json({
        status: 'ok',
        serverTime: new Date().toISOString(),
        database: {
          engine: 'SQLite',
          path: getDatabasePath(),
          tradeCount: trades.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Get all trades
  app.get('/api/trades', async (req, res) => {
    try {
      const trades = await getAllTrades();
      res.json(trades);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Book trade from XML
  app.post('/api/trades/book-xml', async (req, res) => {
    try {
      const { xml, user } = req.body;
      if (!xml) {
        return res.status(400).json({ error: 'XML string is required.' });
      }

      const userInfo = user || { id: 'TRADER_01', name: 'Head IR Trader' };
      const parseResult = parseIRSwapXml(xml);

      if (!parseResult.success || !parseResult.trade) {
        return res.status(400).json({
          error: 'XML Validation & Schema Error',
          details: parseResult.errors,
        });
      }

      const extracted = parseResult.trade;
      const tradeId = extracted.tradeId || await getNextTradeId();
      const now = new Date().toISOString();

      const newTrade: IRSwapTrade = {
        id: `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tradeId,
        productType: extracted.productType || 'IRS',
        tradeDate: extracted.tradeDate || now.split('T')[0],
        effectiveDate: extracted.effectiveDate || '2026-08-01',
        maturityDate: extracted.maturityDate || '2031-08-01',
        counterpartyLei: extracted.counterpartyLei || 'CPTY-LEI-9999',
        counterpartyName: extracted.counterpartyName || 'Global Bank Corp',
        traderId: extracted.traderId || userInfo.id,
        calculationAgent: extracted.calculationAgent || 'CALC_AGENT_SELF',
        status: (extracted.status as TradeStatus) || 'BOOKED',
        fixedLeg: extracted.fixedLeg!,
        floatingLeg: extracted.floatingLeg!,
        tenorYears: extracted.tenorYears || 5,
        parRate: extracted.parRate || 3.85,
        dv01: extracted.dv01 || 4500,
        markToMarket: extracted.markToMarket || 0,
        notionalUsd: extracted.notionalUsd || extracted.fixedLeg?.notional || 0,
        rawXml: xml,
        createdAt: now,
        updatedAt: now,
      };

      // Always format clean XML back
      newTrade.rawXml = generateIRSwapXml(newTrade);

      const savedTrade = await saveTrade(newTrade, userInfo, 'IMPORT_XML');
      const allTrades = await getAllTrades();
      const logs = await getAuditLogs();
      const positions = summarizePositionsByCurrency(allTrades);
      const tenorRisk = calculateTenorRiskBuckets(allTrades);

      broadcast({
        type: 'TRADE_BOOKED',
        payload: { trade: savedTrade, positions, tenorRisk, auditLogs: logs },
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(savedTrade);
    } catch (err: any) {
      console.error('Error booking XML trade:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Book trade from JSON Form
  app.post('/api/trades/book-json', async (req, res) => {
    try {
      const { trade: tradePayload, user } = req.body;
      const userInfo = user || { id: 'TRADER_01', name: 'Head IR Trader' };

      const tradeId = await getNextTradeId();
      const now = new Date().toISOString();

      // Generate FpML and parse back to compute risk metrics for all product types
      const previewTrade: Partial<IRSwapTrade> = { ...tradePayload, tradeId };
      const xml = generateIRSwapXml(previewTrade);
      const parseResult = parseIRSwapXml(xml);

      if (!parseResult.success || !parseResult.trade) {
        return res.status(400).json({
          error: 'Trade validation failed',
          details: parseResult.errors,
        });
      }

      const extracted = parseResult.trade;

      const newTrade: IRSwapTrade = {
        id: `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tradeId,
        productType: extracted.productType || tradePayload.productType || 'IRS',
        tradeDate: tradePayload.tradeDate || extracted.tradeDate || now.split('T')[0],
        effectiveDate: tradePayload.effectiveDate || extracted.effectiveDate!,
        maturityDate: tradePayload.maturityDate || extracted.maturityDate!,
        counterpartyLei: tradePayload.counterpartyLei,
        counterpartyName: tradePayload.counterpartyName,
        traderId: tradePayload.traderId || userInfo.id,
        calculationAgent: tradePayload.calculationAgent || 'CALC_AGENT_SELF',
        clearingHouse: tradePayload.clearingHouse,
        status: 'BOOKED',
        fixedLeg: extracted.fixedLeg!,
        floatingLeg: extracted.floatingLeg!,
        capFloorDetails: extracted.capFloorDetails || tradePayload.capFloorDetails,
        swaptionDetails: extracted.swaptionDetails || tradePayload.swaptionDetails,
        fxForwardDetails: extracted.fxForwardDetails || tradePayload.fxForwardDetails,
        fxOptionDetails: extracted.fxOptionDetails || tradePayload.fxOptionDetails,
        tenorYears: extracted.tenorYears!,
        parRate: extracted.parRate!,
        dv01: extracted.dv01!,
        markToMarket: extracted.markToMarket!,
        notionalUsd: extracted.notionalUsd || tradePayload.notionalUsd || 0,
        rawXml: xml,
        createdAt: now,
        updatedAt: now,
      };

      const savedTrade = await saveTrade(newTrade, userInfo, 'BOOK_TRADE');
      const allTrades = await getAllTrades();
      const logs = await getAuditLogs();
      const positions = summarizePositionsByCurrency(allTrades);
      const tenorRisk = calculateTenorRiskBuckets(allTrades);

      broadcast({
        type: 'TRADE_BOOKED',
        payload: { trade: savedTrade, positions, tenorRisk, auditLogs: logs },
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(savedTrade);
    } catch (err: any) {
      console.error('Error booking JSON trade:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update Trade Status (e.g. Terminate, Amend, Confirm)
  app.put('/api/trades/:tradeId/status', async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { status, user, reason } = req.body;
      const userInfo = user || { id: 'TRADER_01', name: 'Head IR Trader' };

      const updated = await updateTradeStatus(tradeId, status as TradeStatus, userInfo, reason);
      if (!updated) {
        return res.status(404).json({ error: `Trade ${tradeId} not found.` });
      }

      const allTrades = await getAllTrades();
      const logs = await getAuditLogs();
      const positions = summarizePositionsByCurrency(allTrades);
      const tenorRisk = calculateTenorRiskBuckets(allTrades);

      broadcast({
        type: 'TRADE_UPDATED',
        payload: { trade: updated, positions, tenorRisk, auditLogs: logs },
        timestamp: new Date().toISOString(),
      });

      res.json(updated);
    } catch (err: any) {
      if (err?.message?.includes('final')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Load Trade by ID
  app.get('/api/trades/:tradeId', async (req, res) => {
    try {
      const { tradeId } = req.params;
      const trade = await getTradeById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: `Trade ${tradeId} not found.` });
      }
      res.json(trade);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Trade Version History
  app.get('/api/trades/:tradeId/versions', async (req, res) => {
    try {
      const { tradeId } = req.params;
      const versions = await getTradeVersions(tradeId);
      res.json(versions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Amend Trade with Version Control
  app.put('/api/trades/:tradeId/amend', async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { amendments, user, reason } = req.body;
      const userInfo = user || { id: 'TRADER_01', name: 'Head IR Trader' };

      if (!amendments) {
        return res.status(400).json({ error: 'Amendments object is required.' });
      }

      const amended = await amendTrade(tradeId, amendments, userInfo, reason);
      if (!amended) {
        return res.status(404).json({ error: `Trade ${tradeId} not found.` });
      }

      const allTrades = await getAllTrades();
      const logs = await getAuditLogs();
      const positions = summarizePositionsByCurrency(allTrades);
      const tenorRisk = calculateTenorRiskBuckets(allTrades);

      broadcast({
        type: 'TRADE_UPDATED',
        payload: { trade: amended, positions, tenorRisk, auditLogs: logs },
        timestamp: new Date().toISOString(),
      });

      res.json(amended);
    } catch (err: any) {
      console.error('Error amending trade:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Audit Logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const logs = await getAuditLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Positions & Risk Metrics
  app.get('/api/positions', async (req, res) => {
    try {
      const trades = await getAllTrades();
      const positions = summarizePositionsByCurrency(trades);
      const tenorRisk = calculateTenorRiskBuckets(trades);
      res.json({ positions, tenorRisk });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get C# EF Core Entity & SQL Server Schema Code
  app.get('/api/csharp-models', (req, res) => {
    res.json({
      entityClass: `
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SwapTradingEngine.Data.Entities
{
    [Table("IRSwapTrades")]
    public class IRSwapTrade
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [StringLength(30)]
        public string TradeId { get; set; } = null!; // Generated via SQL Sequence: IRS-{Year}-{Seq:D6}

        [Required]
        public DateTime TradeDate { get; set; }

        [Required]
        public DateTime EffectiveDate { get; set; }

        [Required]
        public DateTime MaturityDate { get; set; }

        [Required]
        [StringLength(50)]
        public string CounterpartyLei { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string CounterpartyName { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string TraderId { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string CalculationAgent { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "BOOKED";

        // Fixed Leg
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Notional { get; set; }

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "USD";

        [Required]
        [Column(TypeName = "decimal(10,6)")]
        public decimal FixedRate { get; set; }

        [Required]
        [StringLength(20)]
        public string PayReceive { get; set; } = "PAY_FIXED";

        // Floating Leg
        [Required]
        [StringLength(20)]
        public string FloatingIndex { get; set; } = "SOFR";

        [Required]
        [StringLength(10)]
        public string FloatingTenor { get; set; } = "3M";

        // Risk & Valuation
        [Column(TypeName = "decimal(8,2)")]
        public decimal TenorYears { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Dv01 { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MarkToMarket { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string RawXml { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("AuditLogs")]
    public class AuditLog
    {
        [Key]
        public Guid Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(50)]
        public string UserId { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string UserName { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string Action { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string TradeId { get; set; } = null!;

        [Required]
        public string Details { get; set; } = null!;

        public string? PreviousState { get; set; }
        public string? NewState { get; set; }

        [Required]
        [StringLength(45)]
        public string IpAddress { get; set; } = "127.0.0.1";

        [Required]
        [StringLength(64)]
        public string Hash { get; set; } = null!; // SHA-256 HMAC for tamper detection
    }
}
      `.trim(),
      dbContextClass: `
using Microsoft.EntityFrameworkCore;
using SwapTradingEngine.Data.Entities;

namespace SwapTradingEngine.Data
{
    public class TradingDbContext : DbContext
    {
        public TradingDbContext(DbContextOptions<TradingDbContext> options) : base(options) { }

        public DbSet<IRSwapTrade> IRSwapTrades { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure SQL Server Sequence for Unique Trade IDs
            modelBuilder.HasSequence<int>("TradeIdSequence", schema: "dbo")
                .StartsAt(100)
                .IncrementsBy(1);

            modelBuilder.Entity<IRSwapTrade>(entity =>
            {
                entity.HasIndex(e => e.TradeId).IsUnique();
                entity.HasIndex(e => e.CounterpartyLei);
                entity.HasIndex(e => e.Currency);
                entity.HasIndex(e => e.Status);
                entity.Property(e => e.TradeId)
                    .HasDefaultValueSql("('IRS-' + CONVERT(varchar(4), YEAR(GETUTCDATE())) + '-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.TradeIdSequence AS varchar(6)), 6))");
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasIndex(e => e.TradeId);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.Hash);
            });
        }
    }
}
      `.trim(),
      sqlServerDdl: `
-- =========================================================
-- SQL Server T-SQL Schema & Audit Sequence Engine
-- Database: SwapTradingDB (SQL Server 2022 / Azure SQL)
-- =========================================================

CREATE SEQUENCE dbo.TradeIdSequence
    AS INT
    START WITH 100
    INCREMENT BY 1
    NO CYCLE;
GO

CREATE TABLE dbo.IRSwapTrades (
    Id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    TradeId VARCHAR(30) NOT NULL UNIQUE DEFAULT ('IRS-' + CAST(YEAR(GETDATE()) AS VARCHAR) + '-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.TradeIdSequence AS VARCHAR), 6)),
    TradeDate DATE NOT NULL,
    EffectiveDate DATE NOT NULL,
    MaturityDate DATE NOT NULL,
    CounterpartyLei VARCHAR(50) NOT NULL,
    CounterpartyName NVARCHAR(100) NOT NULL,
    TraderId VARCHAR(50) NOT NULL,
    CalculationAgent VARCHAR(50) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    Notional DECIMAL(18,2) NOT NULL,
    Currency VARCHAR(3) NOT NULL,
    FixedRate DECIMAL(10,6) NOT NULL,
    PayReceive VARCHAR(20) NOT NULL,
    FloatingIndex VARCHAR(20) NOT NULL,
    FloatingTenor VARCHAR(10) NOT NULL,
    TenorYears DECIMAL(8,2) NOT NULL,
    Dv01 DECIMAL(18,2) NOT NULL,
    MarkToMarket DECIMAL(18,2) NOT NULL,
    RawXml NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.AuditLogs (
    Id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    Timestamp DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UserId VARCHAR(50) NOT NULL,
    UserName NVARCHAR(100) NOT NULL,
    Action VARCHAR(50) NOT NULL,
    TradeId VARCHAR(30) NOT NULL,
    Details NVARCHAR(MAX) NOT NULL,
    PreviousState NVARCHAR(MAX) NULL,
    NewState NVARCHAR(MAX) NULL,
    IpAddress VARCHAR(45) NOT NULL,
    Hash VARCHAR(64) NOT NULL
);
GO

CREATE NONCLUSTERED INDEX IX_IRSwapTrades_Currency ON dbo.IRSwapTrades(Currency);
CREATE NONCLUSTERED INDEX IX_AuditLogs_TradeId ON dbo.AuditLogs(TradeId);
GO
      `.trim(),
    });
  });

  // Background Live Market Rate Simulator (wiggles yield rates every 5 seconds)
  setInterval(() => {
    liveMarketRates = liveMarketRates.map((q) => {
      const deltaBps = (Math.random() - 0.48) * 0.4; // slight random fluctuation
      const newRate = parseFloat((q.rate + deltaBps / 100).toFixed(4));
      return {
        ...q,
        rate: Math.max(0.05, newRate),
        changeBps: parseFloat((q.changeBps + deltaBps).toFixed(2)),
        updatedAt: new Date().toISOString(),
      };
    });

    broadcast({
      type: 'MARKET_TICK',
      payload: { marketRates: liveMarketRates },
      timestamp: new Date().toISOString(),
    });
  }, 5000);

  // Dev vs Production serving
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const listenWithRetry = (portToTry: number) => {
    const onError = (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${portToTry} is in use. Trying port ${portToTry + 1}...`);
        server.removeListener('error', onError);
        listenWithRetry(portToTry + 1);
      } else {
        console.error('Server error:', err);
      }
    };

    server.once('error', onError);
    server.listen(portToTry, '0.0.0.0', () => {
      console.log(`Server & WebSockets running on http://0.0.0.0:${portToTry}`);
    });
  };

  listenWithRetry(PORT);
}

startServer();
