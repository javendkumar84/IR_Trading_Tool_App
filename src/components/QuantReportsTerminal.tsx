import React, { useState, useEffect } from 'react';
import { FileText, Download, ShieldCheck, PieChart, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';

interface TradeSummary {
  product: string;
  count: number;
  notional: number;
  pv: number;
  currency: string;
}

interface AuditLog {
  timestamp: string;
  user: string;
  action: string;
  object: string;
  object_id: string;
  details: string;
}

interface ReportsData {
  trade_summary: TradeSummary[];
  risk_summary: {
    total_dv01: number;
    usd_dv01: number;
    inr_dv01: number;
  };
  pnl_summary: {
    mtd_pnl: number;
    ytd_pnl: number;
    unrealized_pnl: number;
    realized_pnl: number;
  };
}

export const QuantReportsTerminal: React.FC = () => {
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [repRes, auditRes] = await Promise.all([
        fetch('/api/quant/reports/summary').then(r => r.json()),
        fetch('/api/quant/reports/audit').then(r => r.json())
      ]);

      if (repRes.data) setReportsData(repRes.data);
      if (auditRes.data) setAuditLogs(auditRes.data);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportSummaryCSV = () => {
    if (!reportsData) return;
    const headers = ["Product Type", "Trade Count", "Total Notional", "Net PV ($)", "Currency"];
    const rows = reportsData.trade_summary.map(s => [
      s.product, s.count, s.notional, s.pv, s.currency
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Executive_Trading_Summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-cyan-400" />
            Quant Executive Reporting & Calculation Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Product activity matrices, risk summaries, P&L reports, and calculation audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <button
            onClick={exportSummaryCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Executive Report CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {reportsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Total Portfolio Notional</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-2">
              ${(reportsData.trade_summary.reduce((acc, s) => acc + s.notional, 0)).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Across 5 Asset Classes</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Total Net PV</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
              ${(reportsData.trade_summary.reduce((acc, s) => acc + s.pv, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Valuation Revaluation</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">YTD Realized & Unrealized P&L</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-2">
              ${reportsData.pnl_summary.ytd_pnl.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">MTD: ${reportsData.pnl_summary.mtd_pnl.toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <span className="text-xs text-slate-400">Total Parallel DV01 Risk</span>
            <div className="text-2xl font-extrabold text-purple-400 font-mono mt-2">
              ${reportsData.risk_summary.total_dv01.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">USD: ${reportsData.risk_summary.usd_dv01.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Main Content Grid: Activity Matrix & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Activity Matrix */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Product Volume & Exposure Breakdown
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 font-semibold uppercase">
                  <th className="py-3 px-4">Product Category</th>
                  <th className="py-3 px-4 text-center">Trades</th>
                  <th className="py-3 px-4 text-right">Total Notional ($)</th>
                  <th className="py-3 px-4 text-right">Net PV ($)</th>
                  <th className="py-3 px-4 text-center">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportsData?.trade_summary.map((row) => (
                  <tr key={row.product} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white font-sans">{row.product}</td>
                    <td className="py-3 px-4 text-center font-bold text-cyan-400">{row.count}</td>
                    <td className="py-3 px-4 text-right text-slate-300">${row.notional.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      row.pv >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ${row.pv.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">{row.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail Grid */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Calculation & Platform Audit Logs
            </h2>
          </div>

          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 font-semibold uppercase sticky top-0 bg-slate-900">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Object ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log, i) => (
                  <tr key={`${log.timestamp}-${log.object_id}-${i}`} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-emerald-400 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-emerald-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans">{log.user}</td>
                    <td className="py-2.5 px-4 text-cyan-300">{log.object_id}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] font-sans truncate max-w-[200px]">{log.details}</td>
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
