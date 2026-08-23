import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, Layers, ArrowUpRight, TrendingUp } from 'lucide-react';

interface CurvePoint {
  tenor: string;
  time: number;
  discount_factor: number;
  zero_rate: number;
}

interface CurveData {
  valuation_date: string;
  currency: string;
  index_name: string;
  points: CurvePoint[];
}

export const InteractiveCurveDashboard: React.FC = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-23');
  const [curveData, setCurveData] = useState<CurveData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCurve = async (ccy: string, dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/quant/curves/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valuation_date: dateStr,
          currency: ccy,
          index_name: ccy === 'USD' ? 'SOFR' : 'OIS'
        })
      });
      if (res.ok) {
        const json = await res.json();
        setCurveData(json.data);
      }
    } catch (err) {
      console.error("Error bootstrapping curve:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurve(currency, valuationDate);
  }, [currency, valuationDate]);

  const chartData = curveData?.points.map(p => ({
    tenor: p.tenor,
    zeroRatePercent: (p.zero_rate * 100).toFixed(3),
    discountFactor: p.discount_factor.toFixed(6)
  })) || [];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-emerald-400" />
            Yield & Discount Curve Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-curve term structure bootstrapped via Python Quant Engine using Brent-q root solvers.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
            {['USD', 'INR', 'EUR', 'GBP'].map((ccy) => (
              <button
                key={ccy}
                onClick={() => setCurrency(ccy)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  currency === ccy
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ccy}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-400">Valuation Date:</span>
            <input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              className="bg-transparent text-white font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {curveData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {curveData.points.slice(0, 4).map((pt) => (
            <div key={pt.tenor} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{currency} {curveData.index_name} ({pt.tenor})</span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {(pt.zero_rate * 100).toFixed(3)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                DF: <span className="text-emerald-300">{pt.discount_factor.toFixed(6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recharts Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zero Rate Curve Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Zero Rate Term Structure ({currency})
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="tenor" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="zeroRatePercent" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Zero Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discount Factor Curve Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            Discount Factor Curve ({currency})
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="tenor" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0.8, 1.0]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="discountFactor" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4' }} name="Discount Factor" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
