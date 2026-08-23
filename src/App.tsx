import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { XmlBooking } from './components/XmlBooking';
import { TradeBlotter } from './components/TradeBlotter';
import { AuditTrail } from './components/AuditTrail';
import { DotnetSchemaViewer } from './components/DotnetSchemaViewer';
import TradeAmendment from './components/TradeAmendment';
import { RegressionQaSuite } from './components/RegressionQaSuite';
import { TradeValidationDashboard } from './components/TradeValidationDashboard';
import { ModelValidationTab } from './components/ModelValidationTab';
import { EodRiskDashboard } from './components/EodRiskDashboard';
import { PnlDashboard } from './components/PnlDashboard';
import { VarDashboard } from './components/VarDashboard';
import { RiskCalculationGuide } from './components/RiskCalculationGuide';
import { MarketDataTab } from './components/MarketDataTab';
import { CashExplainTab } from './components/CashExplainTab';
import { MarketDataTerminal } from './components/MarketDataTerminal';
import { InteractiveCurveDashboard } from './components/InteractiveCurveDashboard';
import { QuantPricingTerminal } from './components/QuantPricingTerminal';
import { QuantRiskTerminal } from './components/QuantRiskTerminal';
import { QuantPnlTerminal } from './components/QuantPnlTerminal';
import { QuantReportsTerminal } from './components/QuantReportsTerminal';
import { ExoticQuantTerminal } from './components/ExoticQuantTerminal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuditLogEntry, IRSwapTrade, MarketRateQuote, PositionSummary, TenorDv01Risk, WebSocketMessage } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation' | 'market-data' | 'cash-explain' | 'quant-pricing' | 'curves' | 'quant-risk' | 'quant-pnl' | 'quant-reports' | 'exotics'>('dashboard');
  const [traderUser, setTraderUser] = useState<string>('J. Doe (Head Rates Trader)');

  // Real-time State
  const [trades, setTrades] = useState<IRSwapTrade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [tenorRisk, setTenorRisk] = useState<TenorDv01Risk[]>([]);
  const [marketRates, setMarketRates] = useState<MarketRateQuote[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initial REST Fetch fallback + localStorage restore
  const fetchInitialData = async () => {
    try {
      const savedTrades = localStorage.getItem('ir_trading_tool_trades');
      if (savedTrades) {
        const parsed = JSON.parse(savedTrades);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrades(parsed);
        }
      }

      const safeParse = async (url: string) => {
        try {
          const r = await fetch(url);
          if (!r.ok) return null;
          const text = await r.text();
          if (!text || text.trim().startsWith('<')) return null;
          return JSON.parse(text);
        } catch (_e) {
          return null;
        }
      };

      const [tradesResp, logsResp, posResp] = await Promise.all([
        safeParse('/api/trades'),
        safeParse('/api/audit-logs'),
        safeParse('/api/positions'),
      ]);

      if (Array.isArray(tradesResp) && tradesResp.length > 0) {
        setTrades(tradesResp);
      }
      if (Array.isArray(logsResp)) setAuditLogs(logsResp);
      if (posResp && posResp.positions) setPositions(posResp.positions);
      if (posResp && posResp.tenorRisk) setTenorRisk(posResp.tenorRisk);
    } catch (err) {
      console.error('REST initial fetch error:', err);
    }
  };

  // Setup Real-time WebSockets
  useEffect(() => {
    fetchInitialData();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    function connectWs() {
      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as WebSocketMessage;

            if (msg.type === 'INIT_STATE') {
              const { trades: initTrades, auditLogs: initLogs, positions: initPos, tenorRisk: initRisk, marketRates: initRates } = msg.payload;
              if (initTrades) setTrades(initTrades);
              if (initLogs) setAuditLogs(initLogs);
              if (initPos) setPositions(initPos);
              if (initRisk) setTenorRisk(initRisk);
              if (initRates) setMarketRates(initRates);
            } else if (msg.type === 'TRADE_BOOKED' || msg.type === 'TRADE_UPDATED') {
              const { trade, positions: updatedPos, tenorRisk: updatedRisk, auditLogs: updatedLogs } = msg.payload;
              
              setTrades((prev) => {
                const idx = prev.findIndex((t) => t.tradeId === trade.tradeId);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = trade;
                  return copy;
                }
                return [trade, ...prev];
              });

              if (updatedPos) setPositions(updatedPos);
              if (updatedRisk) setTenorRisk(updatedRisk);
              if (updatedLogs) setAuditLogs(updatedLogs);
            } else if (msg.type === 'MARKET_TICK') {
              const { marketRates: tickedRates } = msg.payload;
              if (tickedRates) setMarketRates(tickedRates);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        socket.onclose = () => {
          setIsWsConnected(false);
          setTimeout(connectWs, 3000); // Auto reconnect
        };

        socket.onerror = () => {
          setIsWsConnected(false);
        };
      } catch (err) {
        console.error('WS Connection error:', err);
        setIsWsConnected(false);
      }
    }

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleTradeBooked = (bookedTrade: IRSwapTrade) => {
    setTrades((prev) => {
      const updated = [bookedTrade, ...prev.filter((t) => t.tradeId !== bookedTrade.tradeId)];
      try {
        localStorage.setItem('ir_trading_tool_trades', JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });
  };

  const handleTradeStatusUpdated = (tradeId: string, status: any) => {
    setTrades((prev) => {
      const updated = prev.map((t) => (t.tradeId === tradeId ? { ...t, status } : t));
      try {
        localStorage.setItem('ir_trading_tool_trades', JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#0b0f19] text-[#f8fafc] font-sans">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWsConnected={isWsConnected}
        traderUser={traderUser}
        setTraderUser={setTraderUser}
        tradeCount={trades.length}
      />

      {/* Main Container */}
      <main id="main-content-area" className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            trades={trades}
            positions={positions}
            tenorRisk={tenorRisk}
            marketRates={marketRates}
            onOpenXmlCapture={() => setActiveTab('xml')}
            onOpenBlotter={() => setActiveTab('blotter')}
          />
        )}

        {activeTab === 'xml' && (
          <ErrorBoundary fallbackTitle="Trade Capture Screen encountered a temporary state error">
            <XmlBooking
              traderUser={traderUser}
              onTradeBooked={handleTradeBooked}
              onOpenMarketData={() => setActiveTab('market-data')}
              onOpenBlotter={() => setActiveTab('blotter')}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'blotter' && (
          <TradeBlotter
            trades={trades}
            traderUser={traderUser}
            onTradeStatusUpdated={handleTradeStatusUpdated}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrail
            auditLogs={auditLogs}
            onRefresh={fetchInitialData}
          />
        )}

        {activeTab === 'dotnet' && (
          <DotnetSchemaViewer />
        )}

        {activeTab === 'amend' && (
          <TradeAmendment
            trades={trades}
            onAmendmentComplete={handleTradeBooked}
          />
        )}

        {activeTab === 'eod-risk' && (
          <EodRiskDashboard trades={trades} onRefresh={fetchInitialData} />
        )}

        {activeTab === 'pnl' && (
          <PnlDashboard trades={trades} onRefresh={fetchInitialData} />
        )}

        {activeTab === 'var' && (
          <VarDashboard trades={trades} onRefresh={fetchInitialData} />
        )}

        {activeTab === 'risk-calc' && (
          <RiskCalculationGuide />
        )}

        {activeTab === 'qa' && (
          <RegressionQaSuite
            existingTrades={trades}
            onRefreshData={fetchInitialData}
          />
        )}

        {activeTab === 'validation' && (
          <ModelValidationTab trades={trades} onTradeBooked={handleTradeBooked} />
        )}

        {activeTab === 'market-data' && (
          <MarketDataTerminal />
        )}

        {activeTab === 'curves' && (
          <InteractiveCurveDashboard />
        )}

        {activeTab === 'quant-pricing' && (
          <QuantPricingTerminal />
        )}

        {activeTab === 'quant-risk' && (
          <QuantRiskTerminal />
        )}

        {activeTab === 'quant-pnl' && (
          <QuantPnlTerminal />
        )}

        {activeTab === 'quant-reports' && (
          <QuantReportsTerminal />
        )}

        {activeTab === 'exotics' && (
          <ExoticQuantTerminal />
        )}

        {activeTab === 'cash-explain' && (
          <CashExplainTab trades={trades} />
        )}
      </main>

    </div>
  );
}
