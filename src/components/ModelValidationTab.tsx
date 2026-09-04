import React, { useState, useMemo } from 'react';
import {
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  BookOpen,
  PlusCircle,
  ShieldCheck,
  Zap,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { IRSwapTrade } from '../types';
import { runModelValidationCheck, getPresetBenchmarkTestTrades, ModelValidationResult } from '../lib/benchmarkValuation';

interface ModelValidationTabProps {
  trades: IRSwapTrade[];
  onTradeBooked?: (trade: IRSwapTrade) => void;
}

export const ModelValidationTab: React.FC<ModelValidationTabProps> = ({ trades, onTradeBooked }) => {
  const presetTrades = useMemo(() => getPresetBenchmarkTestTrades(), []);
  
  const [selectedTradeId, setSelectedTradeId] = useState<string>(trades[0]?.tradeId || 'IRS-2026-000101');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-14');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [isBookingPreset, setIsBookingPreset] = useState<boolean>(false);

  // Selected trade object
  const currentTrade = useMemo(() => {
    return trades.find((t) => t.tradeId === selectedTradeId) || trades[0] || null;
  }, [trades, selectedTradeId]);

  // Model Validation Check Result
  const validationResult = useMemo<ModelValidationResult | null>(() => {
    if (!currentTrade) return null;
    return runModelValidationCheck(currentTrade, valuationDate);
  }, [currentTrade, valuationDate]);

  // 1-Click Quick Book Preset Benchmark Trade
  const handleQuickBookPreset = async (presetIdx: number) => {
    const preset = presetTrades[presetIdx];
    if (!preset) return;

    setIsBookingPreset(true);
    setBookingSuccessMsg(null);

    try {
      const tradeId = `BENCH-${preset.productType}-${Date.now().toString().slice(-4)}`;
      const payload: Partial<IRSwapTrade> = {
        ...preset,
        tradeId,
        tradeDate: new Date().toISOString().split('T')[0],
        status: 'BOOKED',
        counterpartyName: 'Benchmark Quant Desk',
        counterpartyLei: 'LEI-BENCHMARK-9999',
        traderId: 'QUANT_MODEL_DESK',
        clearingHouse: 'LCH',
        calculationAgent: 'CALC_AGENT_SELF',
      };

      const resp = await fetch('/api/trades/book-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade: payload, user: { id: 'QUANT_VALIDATOR', name: 'Model Validation Desk' } }),
      });

      if (!resp.ok) {
        throw new Error('Failed to book preset benchmark trade.');
      }

      const newTrade: IRSwapTrade = await resp.json();
      setBookingSuccessMsg(`Preset Trade [${newTrade.tradeId}] successfully booked into SQLite!`);
      if (onTradeBooked) onTradeBooked(newTrade);
      setSelectedTradeId(newTrade.tradeId);
    } catch (err: any) {
      console.error('Error booking preset trade:', err);
    } finally {
      setIsBookingPreset(false);
    }
  };

  if (!currentTrade || !validationResult) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <Scale className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white">No Active Trades Available for Model Validation</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Book a trade in the capture suite or click below to quick-book a benchmark test trade for side-by-side valuation comparison.
        </p>
        <button
          type="button"
          onClick={() => handleQuickBookPreset(0)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs font-mono shadow"
        >
          Book Sample 5Y SOFR IRS
        </button>
      </div>
    );
  }

  return (
    <div id="model-validation-tab-root" className="space-y-6 pb-12">
      
      {/* Header Banner & Controls */}
      <div className="bg-[#0e1320] border border-blue-900/60 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              Market Standard Model Validation & Side-by-Side Comparison Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Side-by-side verification of Trade PV, Leg Cashflows, and Discount Factors against QuantLib / Bloomberg SWPM Market Standards.
            </p>
          </div>

          {/* Trade Selection & Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400">Trade ID:</label>
              <select
                value={selectedTradeId}
                onChange={(e) => setSelectedTradeId(e.target.value)}
                className="bg-[#161d2f] border border-cyan-600/80 rounded px-3 py-1.5 text-xs text-white font-mono font-bold"
              >
                {trades.map((t) => (
                  <option key={t.tradeId} value={t.tradeId}>
                    {t.tradeId} [{t.productType}] - ${((t.notionalUsd || 10000000) / 1000000).toFixed(1)}M {t.leg1?.currency || t.fixedLeg?.currency || t.floatingLeg?.currency || 'USD'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400">Val Date:</label>
              <input
                type="date"
                value={valuationDate}
                onChange={(e) => setValuationDate(e.target.value)}
                className="bg-[#161d2f] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Quick-Book Preset Benchmark Test Trades */}
        <div className="bg-[#131929] border border-slate-800 p-3.5 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick-Book Benchmark Test Trades for Instant Model Validation:
            </span>
            {bookingSuccessMsg && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded">
                {bookingSuccessMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {presetTrades.map((preset, idx) => (
              <button
                key={preset.label}
                type="button"
                disabled={isBookingPreset}
                onClick={() => handleQuickBookPreset(idx)}
                className="p-2 bg-[#1b2338] hover:bg-blue-900/50 border border-slate-700/80 hover:border-cyan-500 rounded text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-300 truncate">
                  + {preset.label}
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Summary Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Tool Trade PV */}
        <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-xl space-y-1 shadow">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Our Tool Trade PV</span>
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ${validationResult.toolPv.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {validationResult.currency} {validationResult.notional.toLocaleString()} Notional
          </div>
        </div>

        {/* Benchmark Market System PV */}
        <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-xl space-y-1 shadow">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Benchmark Market System PV</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ${validationResult.benchmarkPv.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            QuantLib Continuous Zero Curve Discounting
          </div>
        </div>

        {/* PV Difference & Variance */}
        <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-xl space-y-1 shadow">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>PV Difference / Variance</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            ${validationResult.pvDifference.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {validationResult.pvDiffBps} bps of Notional
          </div>
        </div>

        {/* Validation Health Status */}
        <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-xl space-y-1 shadow">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-400">
            Model Validation Status
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono flex items-center gap-1 ${
              validationResult.status === 'PASSED'
                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                : validationResult.status === 'ALIGNED'
                ? 'bg-blue-950/80 border border-cyan-700 text-blue-300'
                : 'bg-rose-950/80 border border-rose-700 text-rose-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validationResult.status} ({validationResult.modelQualityScorePct}% Score)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono pt-1">
            Par Rate Diff: {validationResult.parRateDiffBps}bps | DV01 Diff: ${validationResult.dv01Diff}
          </div>
        </div>

      </div>

      {/* Side-by-Side Detailed Period Cashflow Comparison Table */}
      <div className="bg-[#0e1320] border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Side-by-Side Cashflow & Discount Factor Comparison Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Period-by-period comparison of Rate (%), Cashflow ($), Discount Factor (DF), and Discounted PV ($) between Our System and Benchmark System.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded">
            {validationResult.periods.length} Schedule Periods Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121828] text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Prd</th>
                <th className="py-2.5 px-3">Start → End</th>
                <th className="py-2.5 px-3">Pay Date</th>
                <th className="py-2.5 px-3">DCF (α)</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Tool Rate</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Bench Rate</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Tool Cashflow</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Bench Cashflow</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Tool DF</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Bench DF</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Tool PV</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Bench PV</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Δ PV ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {validationResult.periods.map((p) => (
                <tr key={p.periodNumber} className="hover:bg-blue-950/20 transition-colors">
                  <td className="py-2 px-3 font-bold text-white">#{p.periodNumber}</td>
                  <td className="py-2 px-3 text-slate-400">{p.startDate} → {p.endDate}</td>
                  <td className="py-2 px-3 text-slate-300 font-bold">{p.payDate}</td>
                  <td className="py-2 px-3 text-slate-400">{p.dcf.toFixed(4)}</td>

                  <td className="py-2 px-3 text-right text-blue-300 font-bold">{p.toolRatePct.toFixed(4)}%</td>
                  <td className="py-2 px-3 text-right text-emerald-300 font-bold">{p.benchmarkRatePct.toFixed(4)}%</td>

                  <td className="py-2 px-3 text-right font-mono text-blue-200">
                    ${p.toolCashflow.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-200">
                    ${p.benchmarkCashflow.toLocaleString()}
                  </td>

                  <td className="py-2 px-3 text-right font-mono text-blue-300">{p.toolDf.toFixed(5)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-300">{p.benchmarkDf.toFixed(5)}</td>

                  <td className="py-2 px-3 text-right font-bold text-blue-300">${p.toolPv.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-300">${p.benchmarkPv.toLocaleString()}</td>

                  <td className={`py-2 px-3 text-right font-bold ${p.pvDiff === 0 ? 'text-slate-500' : 'text-amber-400'}`}>
                    ${p.pvDiff.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quant Model & Mathematical Formulas Audit Card */}
      <div className="bg-[#0e1320] border border-slate-800 p-5 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          QuantLib / Market Standard Valuation Methodology & Discounting Rules
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-300">
          <div className="bg-[#121828] p-3 rounded border border-slate-800 space-y-1">
            <div className="font-bold text-blue-300">1. Zero Coupon Continuous Discounting</div>
            <div className="text-[11px] text-slate-400">
              DF(T) = exp(-r_zero × τ) where τ = ACT/365 from valuation date T0 to cashflow payment date T_pay.
            </div>
          </div>

          <div className="bg-[#121828] p-3 rounded border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-300">2. Forward Index Benchmark Projection</div>
            <div className="text-[11px] text-slate-400">
              F(t_i, t_i+1) = (1/α) × [DF(t_i) / DF(t_i+1) - 1] + SpreadBps/10000 with exact day count fraction α.
            </div>
          </div>

          <div className="bg-[#121828] p-3 rounded border border-slate-800 space-y-1">
            <div className="font-bold text-amber-300">3. Net Present Value (NPV) Summation</div>
            <div className="text-[11px] text-slate-400">
              NPV = ∑ [C_i × DF(T_i)] + CashOnTheDay for all schedule cashflows.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
