import React, { useState, useEffect } from 'react';
import { Flame, Calculator, TrendingUp, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface BermudanResult {
  price: number;
  european_price: number;
  bermudan_premium: number;
  model: string;
  volatility: number;
  mean_reversion: number;
  early_exercise_options: number;
}

interface CMSResult {
  forward_swap_rate: number;
  convexity_adjustment_bps: number;
  adjusted_cms_rate: number;
  pv: number;
  cms_tenor: number;
  volatility_used: number;
}

interface HistogramBin {
  bin_label: string;
  pnl: number;
  frequency: number;
}

interface VaRResult {
  var_95: number;
  var_99: number;
  expected_shortfall_97_5: number;
  historical_days: number;
  portfolio_dv01: number;
  histogram: HistogramBin[];
}

export const ExoticQuantTerminal: React.FC = () => {
  // State for Bermudan
  const [bermudanNotional, setBermudanNotional] = useState<number>(10000000);
  const [bermudanStrike, setBermudanStrike] = useState<number>(4.50);
  const [bermudanExpiry, setBermudanExpiry] = useState<number>(5);
  const [bermudanTenor, setBermudanTenor] = useState<number>(5);
  const [bermudanVol, setBermudanVol] = useState<number>(1.50);
  const [bermudanRes, setBermudanRes] = useState<BermudanResult | null>(null);

  // State for CMS
  const [cmsNotional, setCmsNotional] = useState<number>(10000000);
  const [cmsTenor, setCmsTenor] = useState<number>(10);
  const [cmsForwardRate, setCmsForwardRate] = useState<number>(4.85);
  const [cmsVol, setCmsVol] = useState<number>(20.0);
  const [cmsRes, setCmsRes] = useState<CMSResult | null>(null);

  // State for VaR
  const [varDv01, setVarDv01] = useState<number>(9500);
  const [varRes, setVarRes] = useState<VaRResult | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  const calculateAllExotics = async () => {
    setLoading(true);
    try {
      const [bermRes, cRes, vRes] = await Promise.all([
        fetch('/api/quant/exotics/bermudan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notional: bermudanNotional,
            strike_rate: bermudanStrike / 100.0,
            expiry_years: bermudanExpiry,
            tenor_years: bermudanTenor,
            volatility: bermudanVol / 100.0
          })
        }).then(r => r.json()),

        fetch('/api/quant/exotics/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notional: cmsNotional,
            cms_tenor: cmsTenor,
            forward_swap_rate: cmsForwardRate / 100.0,
            time_to_expiry: 1.0
          })
        }).then(r => r.json()),

        fetch('/api/quant/exotics/historical-var', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolio_pv: 125000.0,
            portfolio_dv01: varDv01,
            historical_days: 500
          })
        }).then(r => r.json())
      ]);

      if (bermRes.data) setBermudanRes(bermRes.data);
      if (cRes.data) setCmsRes(cRes.data);
      if (vRes.data) setVarRes(vRes.data);
    } catch (err) {
      console.error("Error evaluating exotic quant models:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateAllExotics();
  }, []);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flame className="w-7 h-7 text-amber-400" />
            Exotic Quant Engine & Historical Simulation VaR/ES
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Hull-White 1-Factor Trinomial Tree, CMS SABR Convexity, and 500-Day Historical VaR.
          </p>
        </div>

        <button
          onClick={calculateAllExotics}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition shadow-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recalculate Models
        </button>
      </div>

      {/* Grid: Bermudan & CMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bermudan Swaption Trinomial Tree */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            Bermudan Swaption (Hull-White Trinomial Tree)
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Notional ($)</label>
              <input
                type="number"
                value={bermudanNotional}
                onChange={e => setBermudanNotional(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Strike Rate (%)</label>
              <input
                type="number"
                step="0.05"
                value={bermudanStrike}
                onChange={e => setBermudanStrike(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Expiry (Yrs)</label>
              <input
                type="number"
                value={bermudanExpiry}
                onChange={e => setBermudanExpiry(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Swap Tenor (Yrs)</label>
              <input
                type="number"
                value={bermudanTenor}
                onChange={e => setBermudanTenor(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
          </div>

          {bermudanRes && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xs">Bermudan Swaption Price:</span>
                <span className="text-lg font-bold text-amber-400">${bermudanRes.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">European Price:</span>
                <span className="text-slate-300">${bermudanRes.european_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <span>Early Exercise Premium:</span>
                <span>+${bermudanRes.bermudan_premium.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* CMS Convexity Calculator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Constant Maturity Swap (CMS Convexity Adjustment)
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">CMS Tenor (Years)</label>
              <input
                type="number"
                value={cmsTenor}
                onChange={e => setCmsTenor(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Forward Swap Rate (%)</label>
              <input
                type="number"
                step="0.05"
                value={cmsForwardRate}
                onChange={e => setCmsForwardRate(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
          </div>

          {cmsRes && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xs">Adjusted CMS Rate:</span>
                <span className="text-lg font-bold text-cyan-400">{(cmsRes.adjusted_cms_rate * 100).toFixed(3)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Convexity Adjustment:</span>
                <span className="text-emerald-400">+{cmsRes.convexity_adjustment_bps} bps</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Estimated CMS Leg PV:</span>
                <span className="text-white">${cmsRes.pv.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 500-Day Historical Simulation VaR / ES Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            500-Day Historical Simulation Value-at-Risk (VaR) & Expected Shortfall (ES)
          </h2>

          <div className="flex items-center gap-2 text-xs font-mono">
            <label className="text-slate-400">Portfolio DV01 ($):</label>
            <input
              type="number"
              value={varDv01}
              onChange={e => setVarDv01(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded p-1 text-white w-24 text-right"
            />
          </div>
        </div>

        {varRes && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400">95% Historical VaR (1-Day)</span>
                <div className="text-xl font-bold text-rose-400 font-mono mt-1">${varRes.var_95.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400">99% Historical VaR (1-Day)</span>
                <div className="text-xl font-bold text-rose-500 font-mono mt-1">${varRes.var_99.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400">Expected Shortfall (ES 97.5%)</span>
                <div className="text-xl font-bold text-amber-400 font-mono mt-1">${varRes.expected_shortfall_97_5.toLocaleString()}</div>
              </div>
            </div>

            {/* Recharts P&L Simulation Histogram */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varRes.histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="bin_label" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="frequency" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
