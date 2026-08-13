import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Building,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { IRSwapTrade, Currency } from '../types';
import { generateCashflowSchedule } from '../lib/cashflowGenerator';

interface CashExplainTabProps {
  trades: IRSwapTrade[];
}

export type PaymentBasis = 'FIXED' | 'FLOATING_SOFR' | 'FLOATING_EURIBOR' | 'FLOATING_SONIA' | 'FLOATING_LIBOR' | 'UPFRONT_PREMIUM' | 'STRIKE_PAYOFF';
export type CashState = 'Paid' | 'Expected' | 'Unknown';

export interface CashExplainRow {
  tradeId: string;
  legName: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  payDate: string;
  paymentBasis: PaymentBasis | string;
  dcf: number; // Day Count Fraction
  notional: number;
  currency: Currency;
  resetDate: string; // Reset/Fixing Date
  fixingRate: number; // % e.g. 3.92%
  couponRate: number; // % e.g. 3.85%
  cashAmount: number;
  state: CashState;
}

export const CashExplainTab: React.FC<CashExplainTabProps> = ({ trades }) => {
  const [selectedTradeId, setSelectedTradeId] = useState<string>(trades[0]?.tradeId || 'IRS-2026-000101');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'Paid' | 'Expected' | 'Unknown'>('ALL');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-13');

  // Selected trade object
  const currentTrade = useMemo(() => {
    return trades.find(t => t.tradeId === selectedTradeId) || trades[0] || null;
  }, [trades, selectedTradeId]);

  // Generate Cash Explain Breakdown Rows for the selected Trade ID
  const cashExplainRows = useMemo<CashExplainRow[]>(() => {
    if (!currentTrade) return [];

    const schedule = generateCashflowSchedule(currentTrade);
    const today = valuationDate;

    const rows: CashExplainRow[] = [];

    // 1. Process upfront/premium/period 0 cashflows if any
    (schedule.periods || []).forEach((p) => {
      // Determine Settlement Cash State (Paid vs Expected vs Unknown)
      let state: CashState = 'Expected';
      if (p.paymentDate < today) {
        state = 'Paid';
      } else if (p.paymentDate === today) {
        state = 'Expected';
      } else if (!p.fixingDate && p.type !== 'PREMIUM' && p.floatingFixingRate === 0) {
        state = 'Unknown';
      }

      // Format Payment Basis string as per IB standards
      let basis: string = 'FIXED';
      if (p.type === 'PREMIUM') {
        basis = 'UPFRONT_PREMIUM';
      } else if (p.floatingFixingRate !== undefined || p.fixingRate !== undefined) {
        const floatIdx = currentTrade.floatingLeg?.index || currentTrade.leg2?.index || 'SOFR';
        basis = `FLOATING_${floatIdx}`;
      } else if (p.fixedCouponRate !== undefined) {
        basis = 'FIXED';
      }

      const notionalVal = p.notional || p.fixedLegNotional || p.floatingLegNotional || schedule.notional || currentTrade.notionalUsd || 10000000;
      const ccy = p.fixedLegCurrency || schedule.currency || 'USD';

      // Fixings & Coupon Rates
      const cpnRate = p.fixedCouponRate ?? p.couponRate ?? p.fixedRate ?? currentTrade.fixedLeg?.fixedRate ?? currentTrade.parRate ?? 0;
      const fixRate = p.floatingFixingRate ?? p.fixingRate ?? p.floatingRate ?? 0;

      rows.push({
        tradeId: currentTrade.tradeId,
        legName: p.type === 'PREMIUM' ? 'Upfront Premium' : (p.description.includes('L2') ? 'Floating Leg' : 'Fixed Leg'),
        periodNumber: p.periodNumber,
        startDate: p.startDate,
        endDate: p.endDate,
        payDate: p.paymentDate,
        paymentBasis: basis,
        dcf: p.dayCountFraction,
        notional: notionalVal,
        currency: ccy,
        resetDate: p.resetStartDate || p.fixingDate || p.startDate,
        fixingRate: parseFloat(fixRate.toFixed(4)),
        couponRate: parseFloat(cpnRate.toFixed(4)),
        cashAmount: p.netCashflow || p.discountedCashflow || 0,
        state
      });
    });

    return rows;
  }, [currentTrade, valuationDate]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return cashExplainRows.filter(r => {
      const matchesSearch =
        r.paymentBasis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.payDate.includes(searchTerm) ||
        r.startDate.includes(searchTerm) ||
        r.endDate.includes(searchTerm);
      const matchesState = stateFilter === 'ALL' || r.state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [cashExplainRows, searchTerm, stateFilter]);

  // Summary Metrics for Selected Trade ID
  const summaryMetrics = useMemo(() => {
    const totalCash = cashExplainRows.reduce((acc, r) => acc + r.cashAmount, 0);
    const paidCash = cashExplainRows.filter(r => r.state === 'Paid').reduce((acc, r) => acc + r.cashAmount, 0);
    const expectedCash = cashExplainRows.filter(r => r.state === 'Expected').reduce((acc, r) => acc + r.cashAmount, 0);
    const unknownCount = cashExplainRows.filter(r => r.state === 'Unknown').length;

    return { totalCash, paidCash, expectedCash, unknownCount };
  }, [cashExplainRows]);

  // Export Cash Explain CSV
  const handleExportCsv = () => {
    if (!currentTrade) return;
    const headers = ['Trade ID', 'Period', 'Leg Name', 'Start Date', 'End Date', 'Pay Date', 'Payment Basis', 'DCF (alpha)', 'Notional', 'Currency', 'Reset Date', 'Fixing Rate (%)', 'Coupon Rate (%)', 'Cash Amount', 'State'];
    const csvRows = filteredRows.map(r => [
      r.tradeId,
      r.periodNumber,
      `"${r.legName}"`,
      r.startDate,
      r.endDate,
      r.payDate,
      r.paymentBasis,
      r.dcf,
      r.notional,
      r.currency,
      r.resetDate,
      r.fixingRate,
      r.couponRate,
      r.cashAmount,
      r.state
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cash_Explain_Details_${currentTrade.tradeId}_${valuationDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="cash-explain-tab-suite" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#0b101c] border border-cyan-900/60 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-950/80 border border-cyan-700/80 rounded-2xl text-cyan-400 shadow-inner">
            <ReceiptText className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-white tracking-wide font-sans">
                Trade Cash Explain Details Repository
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 uppercase">
                INVESTMENT BANKING CASH ATTRIBUTION
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Market-standard trade-level cash settlement breakdown by StartDate, EndDate, PayDate, PaymentBasis, DCF, ResetDate, FixingRate, and State.
            </p>
          </div>
        </div>

        {/* Trade Selector & Valuation Date Controls */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#121624] border border-cyan-800/80 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-gray-400 font-sans font-bold">Select Trade ID:</span>
            <select
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
              className="bg-[#0a0d16] border border-cyan-600 text-cyan-300 font-extrabold rounded-lg px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
            >
              {trades.map((t) => (
                <option key={t.id || t.tradeId} value={t.tradeId}>
                  {t.tradeId} — {t.productType} ({t.counterpartyName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#121624] border border-gray-800 rounded-xl px-3 py-1.5">
            <span className="text-gray-400 font-sans font-bold">As-of Date:</span>
            <input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              className="bg-[#0a0d16] border border-gray-700 text-white rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Trade Level Executive Summary Banner */}
      {currentTrade && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-sans text-xs">
          <div className="p-4 bg-[#0e1220] border border-cyan-900/60 rounded-xl space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-mono">Active Trade Metadata</div>
            <div className="text-sm font-extrabold text-white font-mono">{currentTrade.tradeId}</div>
            <div className="text-[11px] text-cyan-300 font-sans">
              Product: <strong>{currentTrade.productType}</strong> | Cpty: <strong>{currentTrade.counterpartyName}</strong>
            </div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-emerald-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Total Paid Cashflows</div>
            <div className="text-base font-extrabold text-emerald-400">
              {cashExplainRows[0]?.currency || 'USD'} {summaryMetrics.paidCash.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Historical settled & cleared cashflows</div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-blue-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Total Expected Cashflows</div>
            <div className="text-base font-extrabold text-blue-300">
              {cashExplainRows[0]?.currency || 'USD'} {summaryMetrics.expectedCash.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Future scheduled cash settlements</div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-amber-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Net Cash Settlement Sum</div>
            <div className={`text-base font-extrabold ${summaryMetrics.totalCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cashExplainRows[0]?.currency || 'USD'} {summaryMetrics.totalCash.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Sum over all periods (Paid + Expected)</div>
          </div>
        </div>
      )}

      {/* Filter Bar & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs bg-[#0c0f1a] p-4 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by PaymentBasis, PayDate, Start/End Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141826] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#141826] p-1 rounded-lg border border-gray-800">
            {(['ALL', 'Paid', 'Expected', 'Unknown'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  stateFilter === st
                    ? st === 'Paid'
                      ? 'bg-emerald-600 text-white'
                      : st === 'Expected'
                      ? 'bg-blue-600 text-white'
                      : st === 'Unknown'
                      ? 'bg-amber-600 text-white'
                      : 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export Cash Explain CSV
        </button>
      </div>

      {/* Tabulated Market Standard Cash Explain Table */}
      <div className="bg-[#0a0d16] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl font-mono">
        <div className="px-6 py-4 bg-[#101424] border-b border-gray-800 flex items-center justify-between font-sans">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-cyan-400" />
            Cash Explain Details Table — Trade ID: <strong className="text-cyan-300 font-mono">{selectedTradeId}</strong>
          </h3>
          <span className="text-[10px] text-cyan-300 font-mono">Showing {filteredRows.length} Cash Periods</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#121628] text-gray-400 border-b border-gray-800 text-[11px] font-mono uppercase">
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-3">StartDate</th>
                <th className="py-3 px-3">EndDate</th>
                <th className="py-3 px-3 text-cyan-300 font-bold">PayDate</th>
                <th className="py-3 px-3 text-indigo-300">PaymentBasis</th>
                <th className="py-3 px-3 text-center">DCF ($\alpha$)</th>
                <th className="py-3 px-3 text-right">Notional</th>
                <th className="py-3 px-3 text-center">Ccy</th>
                <th className="py-3 px-3">ResetDate</th>
                <th className="py-3 px-3 text-right text-cyan-300">FixingRate</th>
                <th className="py-3 px-3 text-right text-indigo-300">CouponRate</th>
                <th className="py-3 px-3 text-right font-extrabold text-emerald-400">CashAmount</th>
                <th className="py-3 px-3 text-center">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850">
              {filteredRows.length > 0 ? (
                filteredRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#131728]/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-gray-500">{r.periodNumber}</td>
                    <td className="py-3 px-3 text-gray-300">{r.startDate}</td>
                    <td className="py-3 px-3 text-gray-300">{r.endDate}</td>
                    <td className="py-3 px-3 text-cyan-300 font-bold">{r.payDate}</td>
                    <td className="py-3 px-3 font-bold">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                        {r.paymentBasis}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-300">{r.dcf.toFixed(4)}</td>
                    <td className="py-3 px-3 text-right text-white font-bold">{r.notional.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center font-bold text-gray-400">{r.currency}</td>
                    <td className="py-3 px-3 text-gray-300">{r.resetDate}</td>
                    <td className="py-3 px-3 text-right text-cyan-300 font-bold">{r.fixingRate > 0 ? `${r.fixingRate.toFixed(4)}%` : '—'}</td>
                    <td className="py-3 px-3 text-right text-indigo-300 font-bold">{r.couponRate > 0 ? `${r.couponRate.toFixed(4)}%` : '—'}</td>
                    <td className={`py-3 px-3 text-right font-extrabold text-sm ${r.cashAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.currency} {r.cashAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {r.state === 'Paid' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
                        </span>
                      )}
                      {r.state === 'Expected' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-950 text-blue-300 border border-blue-700 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" /> Expected
                        </span>
                      )}
                      {r.state === 'Unknown' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-400 border border-amber-700 flex items-center justify-center gap-1">
                          <HelpCircle className="w-3 h-3 text-amber-400" /> Unknown
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-gray-500 font-sans">
                    No cash explain records found for Trade ID <strong className="text-white">{selectedTradeId}</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
