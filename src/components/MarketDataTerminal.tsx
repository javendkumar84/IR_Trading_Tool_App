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

export const MarketDataTerminal: React.FC = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingTenor, setEditingTenor] = useState<string | null>(null);
  const [editMidRate, setEditMidRate] = useState<string>('');

  const fetchQuotes = async (ccy: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quant/market-data?currency=${ccy}`);
      if (res.ok) {
        const json = await res.json();
        setQuotes(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching market quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes(currency);
  }, [currency]);

  const handleSaveEdit = async (tenor: string) => {
    const rateVal = parseFloat(editMidRate);
    if (isNaN(rateVal)) return;

    try {
      await fetch('/api/quant/market-data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          tenor,
          mid: rateVal
        })
      });
      setEditingTenor(null);
      fetchQuotes(currency);
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
    link.setAttribute("download", `${currency}_Market_Quotes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Market Data Quote Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time market rate quotes feeding the Python Quant Engine curve bootstrap solver.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            onClick={() => fetchQuotes(currency)}
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

      {/* Quote Grid Table */}
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
    </div>
  );
};
