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
import { EodRiskDashboard } from './components/EodRiskDashboard';
import { PnlDashboard } from './components/PnlDashboard';
import { VarDashboard } from './components/VarDashboard';
import { RiskCalculationGuide } from './components/RiskCalculationGuide';
import { AuditLogEntry, IRSwapTrade, MarketRateQuote, PositionSummary, TenorDv01Risk, WebSocketMessage } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation'>('dashboard');
  const [traderUser, setTraderUser] = useState<string>('J. Doe (Head Rates Trader)');

  // Real-time State
  const [trades, setTrades] = useState<IRSwapTrade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [tenorRisk, setTenorRisk] = useState<TenorDv01Risk[]>([]);
  const [marketRates, setMarketRates] = useState<MarketRateQuote[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initial REST Fetch fallback
  const fetchInitialData = async () => {
    try {
      const [tradesResp, logsResp, posResp] = await Promise.all([
        fetch('/api/trades').then((r) => r.json()),
        fetch('/api/audit-logs').then((r) => r.json()),
        fetch('/api/positions').then((r) => r.json()),
      ]);

      if (Array.isArray(tradesResp)) setTrades(tradesResp);
      if (Array.isArray(logsResp)) setAuditLogs(logsResp);
      if (posResp.positions) setPositions(posResp.positions);
      if (posResp.tenorRisk) setTenorRisk(posResp.tenorRisk);
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
    setTrades((prev) => [bookedTrade, ...prev.filter((t) => t.tradeId !== bookedTrade.tradeId)]);
  };

  const handleTradeStatusUpdated = (tradeId: string, status: any) => {
    setTrades((prev) =>
      prev.map((t) => (t.tradeId === tradeId ? { ...t, status } : t))
    );
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
          <XmlBooking
            traderUser={traderUser}
            onTradeBooked={handleTradeBooked}
          />
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
          <TradeValidationDashboard />
        )}
      </main>

    </div>
  );
}
