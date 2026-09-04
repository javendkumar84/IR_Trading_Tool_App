import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Layers, DollarSign, Activity } from 'lucide-react';
import { IRSwapTrade, Currency } from '../types';

interface TradePnL {
  trade_id: string;
  book: string;
  trader: string;
  currency: string;
  previous_pv: number;
  current_pv: number;
  total_pnl: number;
  rate_delta_pnl: number;
  time_decay_theta_pnl: number;
  fx_pnl: number;
  spread_pnl: number;
  residual_pnl: number;
  reconciliation_pass: boolean;
}

interface PortfolioPnLData {
  total_previous_pv: number;
  total_current_pv: number;
  total_pnl: number;
  total_rate_pnl: number;
  total_theta_pnl: number;
  total_fx_pnl: number;
  total_spread_pnl: number;
  total_residual_pnl: number;
  reconciliation_pass: boolean;
  reconciliation_error: number;
  trade_attributions: TradePnL[];
}

interface QuantPnlTerminalProps {
  trades?: IRSwapTrade[];
}

const DEFAULT_MOCK_TRADES: TradePnL[] = [
  {
    trade_id: 'IRS-USD-101',
    book: 'RATES_USD',
    trader: 'J. Doe (Head Rates)',
    currency: 'USD',
    previous_pv: 100000.0,
    current_pv: 125000.0,
    total_pnl: 25000.0,
    rate_delta_pnl: 23750.0,
    time_decay_theta_pnl: 500.0,
    fx_pnl: 0.0,
    spread_pnl: 0.0,
    residual_pnl: 750.0,
    reconciliation_pass: true,
  },
  {
    trade_id: 'IRS-USD-102',
    book: 'RATES_USD',
    trader: 'A. Smith (Senior)',
    currency: 'USD',
    previous_pv: 50000.0,
    current_pv: 48000.0,
    total_pnl: -2000.0,
    rate_delta_pnl: -2000.0,
    time_decay_theta_pnl: 100.0,
    fx_pnl: 0.0,
    spread_pnl: 0.0,
    residual_pnl: -100.0,
    reconciliation_pass: true,
  },
  {
    trade_id: 'IRS-EUR-201',
    book: 'RATES_EUR',
    trader: 'E. Vance (Quant)',
    currency: 'EUR',
    previous_pv: 180000.0,
    current_pv: 195000.0,
    total_pnl: 15000.0,
    rate_delta_pnl: 13500.0,
    time_decay_theta_pnl: 450.0,
    fx_pnl: 0.0,
    spread_pnl: 250.0,
    residual_pnl: 800.0,
    reconciliation_pass: true,
  },
];

export const QuantPnlTerminal: React.FC<QuantPnlTerminalProps> = ({ trades = [] }) => {
  const [pnlData, setPnlData] = useState<PortfolioPnLData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [tolerance, setTolerance] = useState<number>(100.0);

  // Compute live PnL attributions incorporating both booked trades and default portfolio
  const computedPnl = useMemo(() => {
    const tradeAttributions: TradePnL[] = [];

    // Map booked trades from App state
    if (Array.isArray(trades) && trades.length > 0) {
      trades.forEach((t) => {
        const notional = t.fixedLeg?.notional || t.notional || 10000000;
        const dv01 = t.dv01 || Math.round(notional * 0.00045);
        const ccy = t.fixedLeg?.currency || t.currency || 'USD';

        // Deterministic attribution math
        const prevPv = t.pv || Math.round(notional * 0.002);
        const rateDeltaPnl = Math.round(dv01 * 2.2); // +2.2 bps yield movement
        const thetaPnl = Math.round(notional * 0.000025); // Daily carry
        const spreadPnl = Math.round((t.floatingLeg?.spreadBps || 0) * 120);
        const residualPnl = Math.round(rateDeltaPnl * 0.015);
        const totalPnl = rateDeltaPnl + thetaPnl + spreadPnl + residualPnl;
        const currentPv = prevPv + totalPnl;

        const isReconPass = Math.abs(residualPnl) <= tolerance;

        tradeAttributions.push({
          trade_id: t.tradeId,
          book: t.book || 'RATES-OIS-BOOK',
          trader: t.traderUser || 'J. Doe (Head Rates)',
          currency: ccy,
          previous_pv: prevPv,
          current_pv: currentPv,
          total_pnl: totalPnl,
          rate_delta_pnl: rateDeltaPnl,
          time_decay_theta_pnl: thetaPnl,
          fx_pnl: 0,
          spread_pnl: spreadPnl,
          residual_pnl: residualPnl,
          reconciliation_pass: isReconPass,
        });
      });
    }

    // Add default mock trades if no custom trades exist yet
    if (tradeAttributions.length === 0) {
      DEFAULT_MOCK_TRADES.forEach((mock) => {
        tradeAttributions.push({
          ...mock,
          reconciliation_pass: Math.abs(mock.residual_pnl) <= tolerance,
        });
      });
    }

    // Portfolio Totals
    const total_previous_pv = tradeAttributions.reduce((acc, t) => acc + t.previous_pv, 0);
    const total_current_pv = tradeAttributions.reduce((acc, t) => acc + t.current_pv, 0);
    const total_pnl = tradeAttributions.reduce((acc, t) => acc + t.total_pnl, 0);
    const total_rate_pnl = tradeAttributions.reduce((acc, t) => acc + t.rate_delta_pnl, 0);
    const total_theta_pnl = tradeAttributions.reduce((acc, t) => acc + t.time_decay_theta_pnl, 0);
    const total_fx_pnl = tradeAttributions.reduce((acc, t) => acc + t.fx_pnl, 0);
    const total_spread_pnl = tradeAttributions.reduce((acc, t) => acc + t.spread_pnl, 0);
    const total_residual_pnl = tradeAttributions.reduce((acc, t) => acc + t.residual_pnl, 0);

    const recon_error = Math.abs(total_pnl - (total_rate_pnl + total_theta_pnl + total_fx_pnl + total_spread_pnl));
    const reconciliation_pass = recon_error <= tolerance;

    return {
      total_previous_pv,
      total_current_pv,
      total_pnl,
      total_rate_pnl,
      total_theta_pnl,
      total_fx_pnl,
      total_spread_pnl,
      total_residual_pnl,
      reconciliation_pass,
      reconciliation_error: recon_error,
      trade_attributions: tradeAttributions,
    };
  }, [trades, tolerance]);

  const fetchPnLData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quant/pnl/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerance, trades })
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          if (json.data) setPnlData(json.data);
        }
      }
    } catch (err) {
      console.error("Error fetching PnL data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnLData();
  }, [tolerance, trades]);

  const activePnl = pnlData || computedPnl;

  const waterfallData = activePnl ? [
    { name: 'Rate Delta', value: activePnl.total_rate_pnl, fill: '#10b981' },
    { name: 'Time Decay (Theta)', value: activePnl.total_theta_pnl, fill: '#0284c7' },
    { name: 'FX / Spread', value: activePnl.total_fx_pnl + activePnl.total_spread_pnl, fill: '#0284c7' },
    { name: 'Unexplained Residual', value: activePnl.total_residual_pnl, fill: '#f43f5e' },
    { name: 'Total Portfolio P&L', value: activePnl.total_pnl, fill: '#8b5cf6' }
  ] : [];

  const getCurrencySymbol = (ccy: string) => {
    switch (ccy) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'INR': return '₹';
      default: return '$';
    }
  };

  return (
    <div id="quant-pnl-terminal-root" className="p-4 sm:p-6 bg-[#0f172a] min-h-screen text-slate-100 font-sans space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="p-1.5 bg-[#0284c7]/20 text-[#0284c7] rounded-lg border border-[#0284c7]/30">
              <TrendingUp className="w-5 h-5" />
            </span>
            Quant P&L Attribution & Reconciliation Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic P&L waterfall breakdown into Rate Delta, Theta/Time Decay, Spread, FX, and Residual for all booked trades ({activePnl.trade_attributions.length} trades loaded).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-400">Recon Tolerance ($):</span>
            <input
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
              className="w-20 bg-transparent text-white font-mono text-right focus:outline-none font-bold"
            />
          </div>

          <button
            onClick={fetchPnLData}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate P&L
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {activePnl && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">Total Portfolio P&L</span>
            <div className={`text-xl font-extrabold font-mono mt-2 ${
              activePnl.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ${activePnl.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 font-mono">Current - Previous PV</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">Rate Delta P&L</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-2">
              ${activePnl.total_rate_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">ΔRate × DV01 Impact</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">Theta / Time Decay</span>
            <div className="text-xl font-extrabold text-[#0284c7] font-mono mt-2">
              ${activePnl.total_theta_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Carry & Accruals</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">Residual Unexplained</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono mt-2">
              ${activePnl.total_residual_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Higher-order effects</span>
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">Reconciliation Check</span>
            <div className="mt-2">
              {activePnl.reconciliation_pass ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  <CheckCircle className="w-3.5 h-3.5" />
                  RECON PASSED
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  UNEXPLAINED VAR
                </div>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 font-mono">Error: ${activePnl.reconciliation_error.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Main Grid: P&L Waterfall Chart & Trade Attribution Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Chart */}
        <div className="lg:col-span-1 bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#334155] pb-3">
            <Layers className="w-4 h-4 text-[#0284c7]" />
            P&L Attribution Waterfall Breakdown
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Trade Attribution Table */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#0284c7]" />
              Booked Trades P&L Attribution Matrix
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Trades: <strong>{activePnl?.trade_attributions.length || 0}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0f172a] text-slate-400 border-b border-[#334155] font-semibold">
                  <th className="py-3 px-3">Trade ID</th>
                  <th className="py-3 px-3">Book</th>
                  <th className="py-3 px-3">Trader</th>
                  <th className="py-3 px-3 text-right">Prev PV</th>
                  <th className="py-3 px-3 text-right">Curr PV</th>
                  <th className="py-3 px-3 text-right">Total P&L</th>
                  <th className="py-3 px-3 text-right">Rate Δ</th>
                  <th className="py-3 px-3 text-right">Theta</th>
                  <th className="py-3 px-3 text-right">Residual</th>
                  <th className="py-3 px-3 text-center">Recon Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {activePnl?.trade_attributions.map((t) => {
                  const sym = getCurrencySymbol(t.currency);
                  return (
                    <tr key={t.trade_id} className="hover:bg-[#0f172a]/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#0284c7]">{t.trade_id}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{t.book}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{t.trader}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{sym}{t.previous_pv.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{sym}{t.current_pv.toLocaleString()}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        t.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {sym}{t.total_pnl.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-300">{sym}{t.rate_delta_pnl.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-cyan-300">{sym}{t.time_decay_theta_pnl.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-amber-300">{sym}{t.residual_pnl.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        {t.reconciliation_pass ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            PASS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
