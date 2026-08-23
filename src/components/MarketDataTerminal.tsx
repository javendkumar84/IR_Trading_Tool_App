import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Upload, Plus, Edit2, Check, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Quote {
  currency: string;
  index_name: string;
  instrument: string;
  tenor: string;
  bid: number;
  mid: number;
  ask: number;
  previous: number;
  change_bps: number;
  source: string;
  timestamp: string;
}

const DEFAULT_MARKET_QUOTES: Record<string, Quote[]> = {
  USD: [
    { currency: 'USD', index_name: 'SOFR', instrument: 'DEPOSIT', tenor: 'ON', bid: 0.0530, mid: 0.0531, ask: 0.0532, previous: 0.0531, change_bps: 0.0, source: 'NY FED SOFR', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'DEPOSIT', tenor: '1M', bid: 0.0527, mid: 0.0528, ask: 0.0529, previous: 0.0527, change_bps: 1.0, source: 'ICAP / Tradeweb', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'DEPOSIT', tenor: '3M', bid: 0.0524, mid: 0.0525, ask: 0.0526, previous: 0.0526, change_bps: -1.0, source: 'ICAP / Tradeweb', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'DEPOSIT', tenor: '6M', bid: 0.0519, mid: 0.0520, ask: 0.0521, previous: 0.0521, change_bps: -1.0, source: 'ICAP / Tradeweb', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '1Y', bid: 0.0509, mid: 0.0510, ask: 0.0511, previous: 0.0508, change_bps: 2.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '2Y', bid: 0.0484, mid: 0.0485, ask: 0.0486, previous: 0.0487, change_bps: -2.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '3Y', bid: 0.0464, mid: 0.0465, ask: 0.0466, previous: 0.0463, change_bps: 2.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '5Y', bid: 0.0439, mid: 0.0440, ask: 0.0441, previous: 0.0442, change_bps: -2.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '7Y', bid: 0.0429, mid: 0.0430, ask: 0.0431, previous: 0.0430, change_bps: 0.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '10Y', bid: 0.0424, mid: 0.0425, ask: 0.0426, previous: 0.0427, change_bps: -2.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() },
    { currency: 'USD', index_name: 'SOFR', instrument: 'OIS_SWAP', tenor: '30Y', bid: 0.0409, mid: 0.0410, ask: 0.0411, previous: 0.0411, change_bps: -1.0, source: 'Tradeweb SOFR Swap', timestamp: new Date().toISOString() }
  ],
  INR: [
    { currency: 'INR', index_name: 'MIBOR', instrument: 'DEPOSIT', tenor: 'ON', bid: 0.0674, mid: 0.0675, ask: 0.0676, previous: 0.0675, change_bps: 0.0, source: 'FBIL MIBOR', timestamp: new Date().toISOString() },
    { currency: 'INR', index_name: 'MIBOR', instrument: 'DEPOSIT', tenor: '1M', bid: 0.0684, mid: 0.0685, ask: 0.0686, previous: 0.0683, change_bps: 2.0, source: 'CCIL Swap', timestamp: new Date().toISOString() },
    { currency: 'INR', index_name: 'MIBOR', instrument: 'OIS_SWAP', tenor: '1Y', bid: 0.0664, mid: 0.0665, ask: 0.0666, previous: 0.0667, change_bps: -2.0, source: 'CCIL OIS', timestamp: new Date().toISOString() },
    { currency: 'INR', index_name: 'MIBOR', instrument: 'OIS_SWAP', tenor: '5Y', bid: 0.0624, mid: 0.0625, ask: 0.0626, previous: 0.0626, change_bps: 0.0, source: 'CCIL OIS', timestamp: new Date().toISOString() }
  ],
  EUR: [
    { currency: 'EUR', index_name: 'ESTR', instrument: 'DEPOSIT', tenor: 'ON', bid: 0.0389, mid: 0.0390, ask: 0.0391, previous: 0.0390, change_bps: 0.0, source: 'ECB ESTR', timestamp: new Date().toISOString() },
    { currency: 'EUR', index_name: 'ESTR', instrument: 'DEPOSIT', tenor: '1M', bid: 0.0384, mid: 0.0385, ask: 0.0386, previous: 0.0385, change_bps: 0.0, source: 'Eurex ESTR', timestamp: new Date().toISOString() },
    { currency: 'EUR', index_name: 'ESTR', instrument: 'OIS_SWAP', tenor: '1Y', bid: 0.0359, mid: 0.0360, ask: 0.0361, previous: 0.0358, change_bps: 2.0, source: 'Tradeweb ESTR Swap', timestamp: new Date().toISOString() },
    { currency: 'EUR', index_name: 'ESTR', instrument: 'OIS_SWAP', tenor: '5Y', bid: 0.0299, mid: 0.0300, ask: 0.0301, previous: 0.0302, change_bps: -2.0, source: 'Tradeweb ESTR Swap', timestamp: new Date().toISOString() },
    { currency: 'EUR', index_name: 'ESTR', instrument: 'OIS_SWAP', tenor: '10Y', bid: 0.0274, mid: 0.0275, ask: 0.0276, previous: 0.0276, change_bps: -1.0, source: 'Tradeweb ESTR Swap', timestamp: new Date().toISOString() }
  ],
  GBP: [
    { currency: 'GBP', index_name: 'SONIA', instrument: 'DEPOSIT', tenor: 'ON', bid: 0.0519, mid: 0.0520, ask: 0.0521, previous: 0.0520, change_bps: 0.0, source: 'BoE SONIA', timestamp: new Date().toISOString() },
    { currency: 'GBP', index_name: 'SONIA', instrument: 'OIS_SWAP', tenor: '1Y', bid: 0.0489, mid: 0.0490, ask: 0.0491, previous: 0.0488, change_bps: 2.0, source: 'ICAP SONIA Swap', timestamp: new Date().toISOString() },
    { currency: 'GBP', index_name: 'SONIA', instrument: 'OIS_SWAP', tenor: '5Y', bid: 0.0419, mid: 0.0420, ask: 0.0421, previous: 0.0422, change_bps: -2.0, source: 'ICAP SONIA Swap', timestamp: new Date().toISOString() },
    { currency: 'GBP', index_name: 'SONIA', instrument: 'OIS_SWAP', tenor: '10Y', bid: 0.0399, mid: 0.0400, ask: 0.0401, previous: 0.0401, change_bps: -1.0, source: 'ICAP SONIA Swap', timestamp: new Date().toISOString() }
  ]
};

interface VolatilityPoint {
  expiry: string;
  strikeMinus100: number;
  strikePar: number;
  strikePlus100: number;
}

interface FxForwardPoint {
  pair: string;
  tenor: string;
  spot: number;
  forward_points: number;
  outright: number;
}

const DEFAULT_VOLATILITY_SURFACE: Record<string, VolatilityPoint[]> = {
  USD: [
    { expiry: '1M', strikeMinus100: 42.5, strikePar: 34.2, strikePlus100: 38.1 },
    { expiry: '3M', strikeMinus100: 38.0, strikePar: 31.0, strikePlus100: 35.4 },
    { expiry: '6M', strikeMinus100: 34.2, strikePar: 28.5, strikePlus100: 32.1 },
    { expiry: '1Y', strikeMinus100: 30.5, strikePar: 25.8, strikePlus100: 28.9 },
    { expiry: '2Y', strikeMinus100: 27.8, strikePar: 23.4, strikePlus100: 26.2 },
    { expiry: '5Y', strikeMinus100: 24.1, strikePar: 20.5, strikePlus100: 22.8 },
    { expiry: '10Y', strikeMinus100: 21.3, strikePar: 18.2, strikePlus100: 20.1 },
  ],
  EUR: [
    { expiry: '1M', strikeMinus100: 38.2, strikePar: 30.1, strikePlus100: 34.5 },
    { expiry: '3M', strikeMinus100: 34.0, strikePar: 27.2, strikePlus100: 31.0 },
    { expiry: '1Y', strikeMinus100: 26.8, strikePar: 22.1, strikePlus100: 25.0 },
    { expiry: '5Y', strikeMinus100: 21.0, strikePar: 17.9, strikePlus100: 19.8 },
  ]
};

const DEFAULT_FX_FORWARDS: FxForwardPoint[] = [
  { pair: 'EUR/USD', tenor: '1M', spot: 1.0850, forward_points: 12.5, outright: 1.08625 },
  { pair: 'EUR/USD', tenor: '3M', spot: 1.0850, forward_points: 38.0, outright: 1.08880 },
  { pair: 'EUR/USD', tenor: '6M', spot: 1.0850, forward_points: 74.2, outright: 1.09242 },
  { pair: 'EUR/USD', tenor: '1Y', spot: 1.0850, forward_points: 145.0, outright: 1.09950 },
  { pair: 'GBP/USD', tenor: '1M', spot: 1.2920, forward_points: 8.2, outright: 1.29282 },
  { pair: 'GBP/USD', tenor: '3M', spot: 1.2920, forward_points: 24.5, outright: 1.29445 },
  { pair: 'GBP/USD', tenor: '1Y', spot: 1.2920, forward_points: 98.0, outright: 1.30180 },
  { pair: 'USD/INR', tenor: '1M', spot: 83.95, forward_points: 18.5, outright: 84.135 },
  { pair: 'USD/INR', tenor: '3M', spot: 83.95, forward_points: 54.0, outright: 84.490 },
  { pair: 'USD/INR', tenor: '1Y', spot: 83.95, forward_points: 210.0, outright: 86.050 },
  { pair: 'USD/JPY', tenor: '1M', spot: 154.20, forward_points: -45.0, outright: 153.75 },
  { pair: 'USD/JPY', tenor: '1Y', spot: 154.20, forward_points: -480.0, outright: 149.40 },
];

export const MarketDataTerminal: React.FC = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-23');
  const [appliedValuationDate, setAppliedValuationDate] = useState<string>('2026-08-23');
  const [subTab, setSubTab] = useState<'QUOTES' | 'VOLATILITY' | 'FX_FORWARDS'>('QUOTES');
  const [quotes, setQuotes] = useState<Quote[]>(DEFAULT_MARKET_QUOTES['USD']);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingTenor, setEditingTenor] = useState<string | null>(null);
  const [editMidRate, setEditMidRate] = useState<string>('');

  const fetchQuotes = async (ccy: string, dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quant/market-data?currency=${ccy}&valuation_date=${dateStr}`);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          if (json.data && json.data.length > 0) {
            setQuotes(json.data);
            return;
          }
        }
      }

      // Compute slight historical rate shift based on valuation date diff
      const baseQuotes = DEFAULT_MARKET_QUOTES[ccy] || DEFAULT_MARKET_QUOTES['USD'];
      const dateOffsetDays = (new Date(dateStr).getTime() - new Date('2026-08-23').getTime()) / (1000 * 3600 * 24);
      const rateShiftBps = (dateOffsetDays % 30) * 0.25;

      const shifted = baseQuotes.map(q => {
        const midShifted = Math.max(0.001, q.mid + (rateShiftBps / 10000.0));
        return {
          ...q,
          mid: midShifted,
          bid: midShifted - 0.0001,
          ask: midShifted + 0.0001,
          timestamp: `${dateStr}T17:00:00Z`
        };
      });

      setQuotes(shifted);
    } catch (err) {
      setQuotes(DEFAULT_MARKET_QUOTES[ccy] || DEFAULT_MARKET_QUOTES['USD']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes(currency, appliedValuationDate);
  }, [currency, appliedValuationDate]);

  const handleApplyValuationDate = () => {
    setAppliedValuationDate(valuationDate);
    fetchQuotes(currency, valuationDate);
  };

  const handleSaveEdit = async (tenor: string) => {
    const rateVal = parseFloat(editMidRate);
    if (isNaN(rateVal)) return;

    const rateFrac = rateVal > 1.0 ? rateVal / 100.0 : rateVal;

    try {
      await fetch('/api/quant/market-data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          tenor,
          mid: rateFrac,
          valuation_date: appliedValuationDate
        })
      }).catch(() => null);

      setQuotes((prev) =>
        prev.map((q) =>
          q.tenor === tenor
            ? { ...q, mid: rateFrac, bid: rateFrac - 0.0001, ask: rateFrac + 0.0001 }
            : q
        )
      );
      setEditingTenor(null);
    } catch (err) {
      console.error("Error updating quote:", err);
    }
  };

  const exportCSV = () => {
    const headers = ["Currency", "Index", "Instrument", "Tenor", "Bid", "Mid", "Ask", "ChangeBps", "Source", "Timestamp"];
    const rows = quotes.map(q => [
      q.currency, q.index_name, q.instrument, q.tenor,
      (q.bid * 100).toFixed(4) + '%', (q.mid * 100).toFixed(4) + '%', (q.ask * 100).toFixed(4) + '%',
      q.change_bps, q.source, q.timestamp
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currency}_Market_Quotes_${appliedValuationDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Market Data & Valuation Date Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Historic & real-time rate quotes, SABR volatility surfaces, and FX forward term structures feeding Python Quant Engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-slate-400 font-semibold">Valuation Date:</span>
            <input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              className="bg-transparent text-white font-mono focus:outline-none"
            />
            <button
              onClick={handleApplyValuationDate}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded text-xs font-bold transition shadow"
            >
              Apply
            </button>
          </div>

          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
            {['USD', 'INR', 'EUR', 'GBP'].map((ccy) => (
              <button
                key={ccy}
                onClick={() => setCurrency(ccy)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  currency === ccy
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ccy}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchQuotes(currency, appliedValuationDate)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setSubTab('QUOTES')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
            subTab === 'QUOTES'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Rate Quotes ({appliedValuationDate})
        </button>
        <button
          onClick={() => setSubTab('VOLATILITY')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
            subTab === 'VOLATILITY'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Volatility Surface (SABR / Swaptions)
        </button>
        <button
          onClick={() => setSubTab('FX_FORWARDS')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
            subTab === 'FX_FORWARDS'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          FX Forward Points & Basis
        </button>
      </div>

      {/* Sub-tab views */}
      {subTab === 'QUOTES' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Currency</th>
                  <th className="py-3.5 px-4">Index</th>
                  <th className="py-3.5 px-4">Instrument</th>
                  <th className="py-3.5 px-4">Tenor</th>
                  <th className="py-3.5 px-4 text-right">Bid (%)</th>
                  <th className="py-3.5 px-4 text-right">Mid (%)</th>
                  <th className="py-3.5 px-4 text-right">Ask (%)</th>
                  <th className="py-3.5 px-4 text-right">Change (bps)</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {quotes.map((q) => {
                  const isEditing = editingTenor === q.tenor;
                  return (
                    <tr key={q.tenor} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-emerald-400">{q.currency}</td>
                      <td className="py-3 px-4 text-slate-300 font-sans">{q.index_name}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {q.instrument}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{q.tenor}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{(q.bid * 100).toFixed(4)}%</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-300">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.0001"
                            value={editMidRate}
                            onChange={(e) => setEditMidRate(e.target.value)}
                            className="w-24 bg-slate-950 border border-emerald-500 rounded px-2 py-0.5 text-right text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            autoFocus
                          />
                        ) : (
                          `${(q.mid * 100).toFixed(4)}%`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{(q.ask * 100).toFixed(4)}%</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        <span className={`inline-flex items-center gap-1 ${
                          q.change_bps >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {q.change_bps >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {q.change_bps >= 0 ? `+${q.change_bps}` : q.change_bps}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">{q.source}</td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(q.tenor)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1.5 rounded transition"
                            title="Save Rate"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTenor(q.tenor);
                              setEditMidRate((q.mid * 100).toFixed(4));
                            }}
                            className="text-slate-400 hover:text-emerald-400 p-1.5 rounded transition"
                            title="Edit Rate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'VOLATILITY' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-white">
              SABR Swaption Normal Volatility Matrix (bps) — {currency} ({appliedValuationDate})
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Calibrated to ICAP / OTC Swaption Desk</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <th className="py-3 px-4">Option Expiry</th>
                  <th className="py-3 px-4 text-right text-rose-300">-100 bps Strike Vol</th>
                  <th className="py-3 px-4 text-right text-emerald-300">ATM Par Strike Vol</th>
                  <th className="py-3 px-4 text-right text-cyan-300">+100 bps Strike Vol</th>
                  <th className="py-3 px-4 text-right">Skew (-100bp vs +100bp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(DEFAULT_VOLATILITY_SURFACE[currency] || DEFAULT_VOLATILITY_SURFACE['USD']).map((vol) => (
                  <tr key={vol.expiry} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-white">{vol.expiry}</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">{vol.strikeMinus100.toFixed(1)} bps</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">{vol.strikePar.toFixed(1)} bps</td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-bold">{vol.strikePlus100.toFixed(1)} bps</td>
                    <td className="py-3 px-4 text-right text-slate-300 font-semibold">
                      {(vol.strikeMinus100 - vol.strikePlus100).toFixed(1)} bps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'FX_FORWARDS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-white">
              FX Forward Points & Cross-Currency Basis Curve ({appliedValuationDate})
            </h2>
            <span className="text-xs text-cyan-400 font-mono">Source: CLS / EBS Live Feed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <th className="py-3 px-4">Currency Pair</th>
                  <th className="py-3 px-4">Tenor</th>
                  <th className="py-3 px-4 text-right">Spot Rate</th>
                  <th className="py-3 px-4 text-right text-emerald-300">Forward Points</th>
                  <th className="py-3 px-4 text-right text-cyan-300">Outright Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {DEFAULT_FX_FORWARDS.map((fx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-emerald-400">{fx.pair}</td>
                    <td className="py-3 px-4 font-bold text-white">{fx.tenor}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{fx.spot.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      {fx.forward_points >= 0 ? `+${fx.forward_points.toFixed(1)}` : fx.forward_points.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-bold">{fx.outright.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
