import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Layers, DollarSign } from 'lucide-react';

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

export const QuantPnlTerminal: React.FC = () => {
  const [pnlData, setPnlData] = useState<PortfolioPnLData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [tolerance, setTolerance] = useState<number>(100.0);

  const fetchPnLData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quant/pnl/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerance })
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          setPnlData(json.data);
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
  }, [tolerance]);

  const waterfallData = pnlData ? [
    { name: 'Rate Delta', value: pnlData.total_rate_pnl, fill: '#10b981' },
    { name: 'Time Decay (Theta)', value: pnlData.total_theta_pnl, fill: '#06b6d4' },
    { name: 'FX / Spread', value: pnlData.total_fx_pnl + pnlData.total_spread_pnl, fill: '#3b82f6' },
    { name: 'Unexplained Residual', value: pnlData.total_residual_pnl, fill: '#f43f5e' },
    { name: 'Total Portfolio P&L', value: pnlData.total_pnl, fill: '#8b5cf6' }
  ] : [];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            Quant P&L Attribution & Reconciliation Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic P&L waterfall breakdown into Rate Delta, Theta/Time Decay, Spread, FX, and Residual.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-400">Recon Tolerance ($):</span>
            <input
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
              className="w-20 bg-transparent text-white font-mono text-right focus:outline-none"
            />
          </div>

          <button
            onClick={fetchPnLData}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate P&L
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {pnlData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Total Portfolio P&L</span>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${
              pnlData.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ${pnlData.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 font-mono">Current - Previous PV</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Rate Delta P&L</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
              ${pnlData.total_rate_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">ΔRate × DV01 Impact</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Theta / Time Decay</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-2">
              ${pnlData.total_theta_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Carry & Accruals</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Residual Unexplained</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-2">
              ${pnlData.total_residual_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Higher-order effects</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400">Reconciliation Check</span>
            <div className="mt-2">
              {pnlData.reconciliation_pass ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  <CheckCircle className="w-4 h-4" />
                  RECON PASSED
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md">
                  <AlertTriangle className="w-4 h-4" />
                  UNEXPLAINED VAR
                </div>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 font-mono">Error: ${pnlData.reconciliation_error}</span>
          </div>
        </div>
      )}

      {/* Main Grid: P&L Waterfall Chart & Trade Attribution Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Waterfall Chart */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            P&L Attribution Waterfall Breakdown
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
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
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Individual Trade P&L Attribution Matrix
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 font-semibold uppercase">
                  <th className="py-3 px-4">Trade ID</th>
                  <th className="py-3 px-4">Book</th>
                  <th className="py-3 px-4">Trader</th>
                  <th className="py-3 px-4 text-right">Prev PV ($)</th>
                  <th className="py-3 px-4 text-right">Curr PV ($)</th>
                  <th className="py-3 px-4 text-right">Total P&L</th>
                  <th className="py-3 px-4 text-right">Rate Δ</th>
                  <th className="py-3 px-4 text-right">Theta</th>
                  <th className="py-3 px-4 text-right">Residual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pnlData?.trade_attributions.map((t) => (
                  <tr key={t.trade_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-emerald-400">{t.trade_id}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans">{t.book}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans">{t.trader}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300">${t.previous_pv.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300">${t.current_pv.toLocaleString()}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${
                      t.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ${t.total_pnl.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-300">${t.rate_delta_pnl.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-cyan-300">${t.time_decay_theta_pnl.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-amber-300">${t.residual_pnl.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-center">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
