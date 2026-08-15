import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Search,
  Download,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  Layers,
  Info,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { IRSwapTrade, Currency } from '../types';
import { generateCashflowSchedule, generateIndependentLeg1Schedule, generateIndependentLeg2Schedule, getBenchmarkFixingRate, derivePeriodFixingRate, getPeriodFixingRate } from '../lib/cashflowGenerator';
import { calculateBenchmarkDiscountFactor } from '../lib/benchmarkValuation';

interface CashExplainTabProps {
  trades: IRSwapTrade[];
}

export type PaymentBasis = 'FIXED' | 'FLOATING_SOFR' | 'FLOATING_EURIBOR' | 'FLOATING_SONIA' | 'FLOATING_LIBOR' | 'UPFRONT_PREMIUM' | 'STRIKE_PAYOFF';
export type CashState = 'Paid' | 'Expected' | 'Unknown';

export interface CashExplainRow {
  tradeId: string;
  legId: 'LEG_1' | 'LEG_2' | 'UPFRONT';
  legName: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  payDate: string;
  paymentBasis: PaymentBasis | string;
  dcf: number; // Day Count Fraction alpha
  numberOfDays: number;
  notional: number;
  currency: Currency;
  resetDate: string; // Reset/Fixing Date
  fixingRate: number; // % e.g. 3.92%
  couponRate: number; // % e.g. 3.85%
  spreadBps: number;
  cashAmount: number;
  discountFactor: number;
  discountedPV: number;
  state: CashState;
  calculationFormula: string; // Dynamic math step explanation for hover tooltip
}

export const CashExplainTab: React.FC<CashExplainTabProps> = ({ trades }) => {
  const [selectedTradeId, setSelectedTradeId] = useState<string>(trades[0]?.tradeId || 'IRS-2026-000101');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [legFilter, setLegFilter] = useState<'ALL' | 'LEG_1' | 'LEG_2'>('ALL');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'Paid' | 'Expected' | 'Unknown'>('ALL');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-14');

  // Selected trade object
  const currentTrade = useMemo(() => {
    return trades.find(t => t.tradeId === selectedTradeId) || trades[0] || null;
  }, [trades, selectedTradeId]);

  // Generate Explicit Leg 1 vs Leg 2 Cashflows for the selected Trade ID
  const cashExplainRows = useMemo<CashExplainRow[]>(() => {
    if (!currentTrade) return [];

    const today = valuationDate;
    const rows: CashExplainRow[] = [];

    // Extract independent schedules for Leg 1 and Leg 2
    const leg1Sched = generateIndependentLeg1Schedule(currentTrade);
    const leg2Sched = generateIndependentLeg2Schedule(currentTrade);

    // 1. Leg 1 Flow Processing (Fixed / Structured Payoff Leg)
    (leg1Sched.periods || []).forEach((p) => {
      let state: CashState = 'Expected';
      const payD = p.payDate || p.paymentDate || p.endDate;
      if (payD < today) {
        state = 'Paid';
      } else if (payD === today) {
        state = 'Expected';
      }

      const notional = p.notional || leg1Sched.notional || currentTrade.notionalUsd || 10000000;
      const ccy = p.currency || leg1Sched.currency || 'USD';
      const dcf = p.dayCountFraction || 0.5;
      const cpnRate = p.ratePct ?? p.rate ?? currentTrade.fixedLeg?.fixedRate ?? currentTrade.parRate ?? 3.85;
      const rawCash = p.cashflowAmount ?? p.cashflow ?? Math.round(notional * (cpnRate / 100) * dcf);
      
      const df = p.discountFactor || calculateBenchmarkDiscountFactor(today, payD, ccy, getBenchmarkFixingRate(ccy));
      const pvVal = Math.round(rawCash * df);

      // Formula breakdown string for hover tooltip
      const formulaStr = `Leg 1 Period #${p.periodNumber}:\nNotional × CouponRate × DCF (alpha)\n= $${notional.toLocaleString()} × ${cpnRate.toFixed(4)}% × ${dcf.toFixed(4)}\n= ${ccy} ${rawCash.toLocaleString()}\nDiscounted PV: ${rawCash.toLocaleString()} × DF(${df.toFixed(4)}) = ${ccy} ${pvVal.toLocaleString()}`;

      rows.push({
        tradeId: currentTrade.tradeId,
        legId: 'LEG_1',
        legName: 'Leg 1 (Fixed / Structured)',
        periodNumber: p.periodNumber,
        startDate: p.startDate,
        endDate: p.endDate,
        payDate: payD,
        paymentBasis: 'FIXED',
        dcf,
        numberOfDays: p.numberOfDays || 180,
        notional,
        currency: ccy,
        resetDate: p.resetStartDate || p.startDate,
        fixingRate: 0,
        couponRate: parseFloat(cpnRate.toFixed(4)),
        spreadBps: 0,
        cashAmount: rawCash,
        discountFactor: df,
        discountedPV: pvVal,
        state,
        calculationFormula: formulaStr
      });
    });

    // 2. Leg 2 Flow Processing (Floating / Funding Index Leg)
    (leg2Sched.periods || []).forEach((p) => {
      let state: CashState = 'Expected';
      const payD = p.payDate || p.paymentDate || p.endDate;
      if (payD < today) {
        state = 'Paid';
      } else if (payD === today) {
        state = 'Expected';
      } else if (!p.fixingRate && p.ratePct === 0) {
        state = 'Unknown';
      }

      const notional = p.notional || leg2Sched.notional || currentTrade.notionalUsd || 10000000;
      const ccy = p.currency || leg2Sched.currency || 'USD';
      const dcf = p.dayCountFraction || 0.25;
      const floatIdx = currentTrade.floatingLeg?.index || currentTrade.leg2?.index || 'SOFR';
      const floatTenor = currentTrade.floatingLeg?.indexTenor || currentTrade.leg2?.indexTenor;
      const defaultBase = getBenchmarkFixingRate(floatIdx || ccy, floatTenor);
      const fixRate = p.fixingRate ?? p.floatingFixingRate ?? getPeriodFixingRate(floatIdx || ccy, p.startDate, p.periodNumber || 1, defaultBase, floatTenor);
      const sprd = p.spreadBps ?? currentTrade.floatingLeg?.spreadBps ?? currentTrade.leg2?.spreadBps ?? 0;
      const totalRate = p.ratePct ?? (fixRate + sprd / 100);
      const rawCash = p.cashflowAmount ?? p.cashflow ?? Math.round(notional * (totalRate / 100) * dcf);
      
      const df = p.discountFactor || calculateBenchmarkDiscountFactor(today, payD, ccy, getBenchmarkFixingRate(ccy, floatTenor));
      const pvVal = Math.round(rawCash * df);

      // Formula breakdown string for hover tooltip
      const formulaStr = `Leg 2 Period #${p.periodNumber}:\nNotional × (FixingRate + Spread) × DCF (alpha)\n= $${notional.toLocaleString()} × (${fixRate.toFixed(4)}% + ${sprd}bps) × ${dcf.toFixed(4)}\n= ${ccy} ${rawCash.toLocaleString()}\nDiscounted PV: ${rawCash.toLocaleString()} × DF(${df.toFixed(4)}) = ${ccy} ${pvVal.toLocaleString()}`;

      rows.push({
        tradeId: currentTrade.tradeId,
        legId: 'LEG_2',
        legName: 'Leg 2 (Floating / Funding)',
        periodNumber: p.periodNumber,
        startDate: p.startDate,
        endDate: p.endDate,
        payDate: payD,
        paymentBasis: `FLOATING_${floatIdx}`,
        dcf,
        numberOfDays: p.numberOfDays || 90,
        notional,
        currency: ccy,
        resetDate: p.resetStartDate || p.startDate,
        fixingRate: parseFloat(fixRate.toFixed(4)),
        couponRate: parseFloat(totalRate.toFixed(4)),
        spreadBps: sprd,
        cashAmount: rawCash,
        discountFactor: df,
        discountedPV: pvVal,
        state,
        calculationFormula: formulaStr
      });
    });

    return rows;
  }, [currentTrade, valuationDate]);

  // Separate Leg 1 and Leg 2 rows
  const leg1Rows = useMemo(() => {
    return cashExplainRows.filter(r => r.legId === 'LEG_1').filter(r => {
      const matchesSearch = r.paymentBasis.toLowerCase().includes(searchTerm.toLowerCase()) || r.payDate.includes(searchTerm) || r.startDate.includes(searchTerm);
      const matchesState = stateFilter === 'ALL' || r.state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [cashExplainRows, searchTerm, stateFilter]);

  const leg2Rows = useMemo(() => {
    return cashExplainRows.filter(r => r.legId === 'LEG_2').filter(r => {
      const matchesSearch = r.paymentBasis.toLowerCase().includes(searchTerm.toLowerCase()) || r.payDate.includes(searchTerm) || r.startDate.includes(searchTerm);
      const matchesState = stateFilter === 'ALL' || r.state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [cashExplainRows, searchTerm, stateFilter]);

  // Combined metrics
  const leg1TotalCash = useMemo(() => leg1Rows.reduce((a, r) => a + r.cashAmount, 0), [leg1Rows]);
  const leg2TotalCash = useMemo(() => leg2Rows.reduce((a, r) => a + r.cashAmount, 0), [leg2Rows]);

  // Export CSV
  const handleExportCsv = () => {
    if (!currentTrade) return;
    const headers = ['Trade ID', 'Leg ID', 'Leg Name', 'Period', 'Start Date', 'End Date', 'Pay Date', 'Payment Basis', 'DCF (alpha)', 'Notional', 'Currency', 'Reset Date', 'Fixing Rate (%)', 'Coupon Rate (%)', 'Cash Amount', 'State'];
    const csvRows = [...leg1Rows, ...leg2Rows].map(r => [
      r.tradeId,
      r.legId,
      `"${r.legName}"`,
      r.periodNumber,
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
    a.download = `Cash_Explain_LegBreakdown_${currentTrade.tradeId}_${valuationDate}.csv`;
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
                Trade Cash Explain Details Repository (Leg 1 vs Leg 2 Separated)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 uppercase">
                INVESTMENT BANKING CASH ATTRIBUTION
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Separated Leg 1 vs Leg 2 cashflows with interactive hover calculation popups for formula breakdown.
            </p>
          </div>
        </div>

        {/* Trade Selector & Valuation Controls */}
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

      {/* Trade Level Executive Leg Overview */}
      {currentTrade && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-sans text-xs">
          <div className="p-4 bg-[#0e1220] border border-cyan-900/60 rounded-xl space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-mono">Active Trade Metadata</div>
            <div className="text-sm font-extrabold text-white font-mono">{currentTrade.tradeId}</div>
            <div className="text-[11px] text-cyan-300 font-sans">
              Product: <strong>{currentTrade.productType}</strong> | Cpty: <strong>{currentTrade.counterpartyName}</strong>
            </div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-indigo-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-indigo-400 uppercase font-sans">Leg 1 Cashflow Sum</div>
            <div className={`text-base font-extrabold ${leg1TotalCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cashExplainRows[0]?.currency || 'USD'} {leg1TotalCash.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Fixed / Structured Payoff Cashflows</div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-teal-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-teal-400 uppercase font-sans">Leg 2 Cashflow Sum</div>
            <div className={`text-base font-extrabold ${leg2TotalCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cashExplainRows[0]?.currency || 'USD'} {leg2TotalCash.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Floating / Funding Benchmark Index</div>
          </div>

          <div className="p-4 bg-[#0e1220] border border-amber-900/60 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Net Cash Settlement</div>
            <div className={`text-base font-extrabold ${(leg1TotalCash + leg2TotalCash) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cashExplainRows[0]?.currency || 'USD'} {(leg1TotalCash + leg2TotalCash).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Combined Leg 1 + Leg 2 Cash Sum</div>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
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

          {/* Leg View Filter Pills */}
          <div className="flex items-center gap-1 bg-[#141826] p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setLegFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${legFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              All Legs
            </button>
            <button
              onClick={() => setLegFilter('LEG_1')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${legFilter === 'LEG_1' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Leg 1 Only
            </button>
            <button
              onClick={() => setLegFilter('LEG_2')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${legFilter === 'LEG_2' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Leg 2 Only
            </button>
          </div>

          {/* State Filter Pills */}
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

      {/* SECTION 1: LEG 1 CASHFLOW SCHEDULE TABLE */}
      {(legFilter === 'ALL' || legFilter === 'LEG_1') && (
        <div className="bg-[#0a0d16] border border-indigo-900/80 rounded-2xl overflow-hidden shadow-2xl font-mono space-y-0">
          <div className="px-6 py-4 bg-[#101426] border-b border-indigo-900/60 flex items-center justify-between font-sans">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              LEG 1 CASHFLOWS (Fixed / Structured Payoff Leg) — Trade ID: <strong className="text-white font-mono">{selectedTradeId}</strong>
            </h3>
            <span className="text-[10px] text-indigo-300 font-mono">Total Leg 1 Net: {cashExplainRows[0]?.currency || 'USD'} {leg1TotalCash.toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12162a] text-indigo-300 border-b border-indigo-900/60 text-[11px] font-mono uppercase">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-3">StartDate</th>
                  <th className="py-3 px-3">EndDate</th>
                  <th className="py-3 px-3 text-cyan-300 font-bold">PayDate</th>
                  <th className="py-3 px-3">PaymentBasis</th>
                  <th className="py-3 px-3 text-center">DCF ($\alpha$)</th>
                  <th className="py-3 px-3 text-right">Notional</th>
                  <th className="py-3 px-3 text-center">Ccy</th>
                  <th className="py-3 px-3">ResetDate</th>
                  <th className="py-3 px-3 text-right">Fixing Rate (%)</th>
                  <th className="py-3 px-3 text-right text-indigo-300 font-bold">CouponRate</th>
                  <th className="py-3 px-3 text-right font-extrabold text-emerald-400">CashAmount</th>
                  <th className="py-3 px-3 text-center">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {leg1Rows.length > 0 ? (
                  leg1Rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[#131830] transition-colors relative group">
                      <td className="py-3 px-3 text-center font-bold text-gray-400">
                        {r.periodNumber}
                        
                        {/* Interactive Hover Popup Box displaying exact Math Step Calculation */}
                        <div className="absolute left-10 top-0 hidden group-hover:block z-50 w-80 bg-[#090b14] border border-indigo-500 rounded-xl p-3.5 shadow-2xl text-left font-sans text-xs space-y-1.5 pointer-events-none">
                          <div className="flex items-center justify-between text-indigo-300 font-bold font-mono border-b border-indigo-900 pb-1">
                            <span>HOVER CALCULATED FORMULA</span>
                            <span className="text-[10px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-700">Period #{r.periodNumber}</span>
                          </div>
                          <pre className="text-[10px] font-mono text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {r.calculationFormula}
                          </pre>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-gray-300">{r.startDate}</td>
                      <td className="py-3 px-3 text-gray-300">{r.endDate}</td>
                      <td className="py-3 px-3 text-cyan-300 font-bold">{r.payDate}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                          {r.paymentBasis}
                        </span>
                      </td>

                      {/* DCF Cell with Hover Formula */}
                      <td className="py-3 px-3 text-center text-indigo-300 font-bold hover:bg-indigo-950/60 rounded cursor-help" title={`Day Count Fraction: ${r.numberOfDays} days / 360 = ${r.dcf.toFixed(4)}`}>
                        {r.dcf.toFixed(4)}
                      </td>

                      <td className="py-3 px-3 text-right text-white font-bold">{r.notional.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-gray-400">{r.currency}</td>
                      <td className="py-3 px-3 text-gray-300">{r.resetDate}</td>
                      <td className="py-3 px-3 text-right text-gray-500">{r.fixingRate > 0 ? `${r.fixingRate.toFixed(4)}%` : '—'}</td>

                      {/* Coupon Rate Cell with Hover Formula */}
                      <td className="py-3 px-3 text-right text-indigo-300 font-bold hover:bg-indigo-950/60 rounded cursor-help" title={`Leg 1 Coupon Rate: ${r.couponRate.toFixed(4)}%`}>
                        {r.couponRate.toFixed(4)}%
                      </td>

                      {/* CashAmount Cell with Hover Formula */}
                      <td className={`py-3 px-3 text-right font-extrabold text-sm hover:bg-emerald-950/60 rounded cursor-help ${r.cashAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={`CashAmount Formula: Notional (${r.notional.toLocaleString()}) × CouponRate (${r.couponRate}%) × DCF (${r.dcf.toFixed(4)}) = ${r.cashAmount.toLocaleString()}`}>
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
                      No Leg 1 cash explain records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: LEG 2 CASHFLOW SCHEDULE TABLE */}
      {(legFilter === 'ALL' || legFilter === 'LEG_2') && (
        <div className="bg-[#0a0d16] border border-teal-900/80 rounded-2xl overflow-hidden shadow-2xl font-mono space-y-0">
          <div className="px-6 py-4 bg-[#101924] border-b border-teal-900/60 flex items-center justify-between font-sans">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              LEG 2 CASHFLOWS (Floating / Funding Index Leg) — Trade ID: <strong className="text-white font-mono">{selectedTradeId}</strong>
            </h3>
            <span className="text-[10px] text-teal-300 font-mono">Total Leg 2 Net: {cashExplainRows[0]?.currency || 'USD'} {leg2TotalCash.toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#121c2a] text-teal-300 border-b border-teal-900/60 text-[11px] font-mono uppercase">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-3">StartDate</th>
                  <th className="py-3 px-3">EndDate</th>
                  <th className="py-3 px-3 text-cyan-300 font-bold">PayDate</th>
                  <th className="py-3 px-3">PaymentBasis</th>
                  <th className="py-3 px-3 text-center">DCF ($\alpha$)</th>
                  <th className="py-3 px-3 text-right">Notional</th>
                  <th className="py-3 px-3 text-center">Ccy</th>
                  <th className="py-3 px-3">ResetDate</th>
                  <th className="py-3 px-3 text-right text-cyan-300 font-bold">Fixing Rate (%)</th>
                  <th className="py-3 px-3 text-right font-extrabold text-emerald-400">CashAmount</th>
                  <th className="py-3 px-3 text-right text-teal-300 font-bold">CouponRate</th>
                  <th className="py-3 px-3 text-center">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {leg2Rows.length > 0 ? (
                  leg2Rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[#132030] transition-colors relative group">
                      <td className="py-3 px-3 text-center font-bold text-gray-400">
                        {r.periodNumber}

                        {/* Interactive Hover Popup Box displaying exact Math Step Calculation */}
                        <div className="absolute left-10 top-0 hidden group-hover:block z-50 w-80 bg-[#090b14] border border-teal-500 rounded-xl p-3.5 shadow-2xl text-left font-sans text-xs space-y-1.5 pointer-events-none">
                          <div className="flex items-center justify-between text-teal-300 font-bold font-mono border-b border-teal-900 pb-1">
                            <span>HOVER CALCULATED FORMULA</span>
                            <span className="text-[10px] bg-teal-950 px-1.5 py-0.5 rounded border border-teal-700">Period #{r.periodNumber}</span>
                          </div>
                          <pre className="text-[10px] font-mono text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {r.calculationFormula}
                          </pre>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-gray-300">{r.startDate}</td>
                      <td className="py-3 px-3 text-gray-300">{r.endDate}</td>
                      <td className="py-3 px-3 text-cyan-300 font-bold">{r.payDate}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-teal-950 text-teal-300 border border-teal-700/60 font-mono">
                          {r.paymentBasis}
                        </span>
                      </td>

                      {/* DCF Cell with Hover Formula */}
                      <td className="py-3 px-3 text-center text-teal-300 font-bold hover:bg-teal-950/60 rounded cursor-help" title={`Day Count Fraction: ${r.numberOfDays} days / 360 = ${r.dcf.toFixed(4)}`}>
                        {r.dcf.toFixed(4)}
                      </td>

                      <td className="py-3 px-3 text-right text-white font-bold">{r.notional.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-gray-400">{r.currency}</td>
                      <td className="py-3 px-3 text-gray-300">{r.resetDate}</td>

                      {/* Fixing Rate Cell with Hover Formula */}
                      <td className="py-3 px-3 text-right text-cyan-300 font-bold hover:bg-cyan-950/60 rounded cursor-help" title={`Benchmark Fixing Rate: ${r.fixingRate.toFixed(4)}%`}>
                        {r.fixingRate > 0 ? `${r.fixingRate.toFixed(4)}%` : '—'}
                      </td>

                      {/* CashAmount Cell with Hover Formula */}
                      <td className={`py-3 px-3 text-right font-extrabold text-sm hover:bg-emerald-950/60 rounded cursor-help ${r.cashAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={`CashAmount Formula: Notional (${r.notional.toLocaleString()}) × Total CouponRate (${r.couponRate}%) × DCF (${r.dcf.toFixed(4)}) = ${r.cashAmount.toLocaleString()}`}>
                        {r.currency} {r.cashAmount.toLocaleString()}
                      </td>

                      {/* CouponRate Cell with Hover Formula */}
                      <td className="py-3 px-3 text-right text-teal-300 font-bold hover:bg-teal-950/60 rounded cursor-help" title={`Total Floating Coupon Rate: Fixing (${r.fixingRate.toFixed(4)}%) + Spread (${r.spreadBps}bp) = ${r.couponRate.toFixed(4)}%`}>
                        {r.couponRate > 0 ? `${r.couponRate.toFixed(4)}%` : '—'}
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
                      No Leg 2 cash explain records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
