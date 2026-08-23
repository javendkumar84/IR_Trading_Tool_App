import React, { useState } from 'react';
import { Calendar, DollarSign, Download, FileText, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Clock, Percent, TrendingUp, Cpu, Info, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { IRSwapTrade } from '../types';
import { generateCashflowSchedule, CashflowScheduleSummary, CashflowPeriod } from '../lib/cashflowGenerator';
import { PRODUCT_VALUATION_MODELS, getValuationModelForProduct } from './XmlBooking';

interface CashflowScheduleModalProps {
  trade: IRSwapTrade;
  onClose: () => void;
}

export const CashflowScheduleModal: React.FC<CashflowScheduleModalProps> = ({ trade, onClose }) => {
  const schedule: CashflowScheduleSummary = generateCashflowSchedule(trade);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'CHART_ANALYTICS' | 'YIELD_CURVES'>('YIELD_CURVES');
  const [activeValuationModel, setActiveValuationModel] = useState<string>(
    trade.valuationModel || PRODUCT_VALUATION_MODELS[trade.productType || 'IRS']?.[0]?.id || ''
  );

  const activeModelDetails = getValuationModelForProduct(trade.productType || 'IRS', activeValuationModel);

  const handleExportCsv = () => {
    const headers = [
      'Period #',
      'Type',
      'Start Date',
      'End Date',
      'Payment Date',
      'Fixing Date',
      'Reset Start Date',
      'Reset End Date',
      'Pay Reset Date',
      'Number of Days',
      'Day Count Fraction',
      'Day Count Convention',
      'Notional',
      'Fixed Coupon Rate (%)',
      'Fixing Rate (%)',
      'Float Spread (bps)',
      'Float Total Rate (%)',
      'Fixed Cashflow',
      'Floating Cashflow',
      'Net Cashflow',
      'IRDelta (DV01/1bp)',
      'Discount Factor',
      'Discounted PV',
      'Cumulative Cashflow',
      'Description',
    ];

    const rows = schedule.periods.map((p) => [
      p.periodNumber,
      p.type,
      p.startDate,
      p.endDate,
      p.paymentDate,
      p.fixingDate || '',
      p.resetStartDate,
      p.resetEndDate,
      p.payResetDate,
      p.numberOfDays,
      p.dayCountFraction,
      p.dayCountConvention,
      p.notional,
      p.fixedCouponRate ?? p.couponRate ?? p.fixedRate ?? p.strikeRate ?? '',
      p.floatingFixingRate ?? p.fixingRate ?? '',
      p.floatingSpreadBps ?? 0,
      p.floatingTotalRate ?? p.floatingRate ?? '',
      p.fixedCashflow ?? 0,
      p.floatingCashflow ?? 0,
      p.netCashflow,
      p.irDelta ?? 0,
      p.discountFactor,
      p.discountedCashflow,
      p.cumulativeCashflow,
      `"${p.description}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cashflow_Schedule_${trade.tradeId}_${trade.productType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBadgeStyle = (type: CashflowPeriod['type']) => {
    switch (type) {
      case 'PREMIUM':
        return 'bg-purple-950/80 text-purple-300 border-purple-700';
      case 'INTEREST':
        return 'bg-blue-950/80 text-blue-300 border-blue-700';
      case 'OPTION_EXERCISE':
        return 'bg-amber-950/80 text-amber-300 border-amber-700';
      case 'EXCHANGE':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      case 'SETTLEMENT':
        return 'bg-pink-950/80 text-pink-300 border-pink-700';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl sm:rounded-2xl w-full max-w-7xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Modal Header */}
        <div className="bg-[#0a0b0d] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-950/80 border border-blue-700/60 rounded-lg text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Cashflow Schedule & IRDelta Sensitivity — {trade.tradeId}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-950 text-blue-300 border border-blue-800">
                  {trade.productType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-gray-800 text-gray-300">
                  {trade.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">
                Counterparty: <strong className="text-gray-200">{trade.counterpartyName}</strong> ({trade.counterpartyLei})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="py-1.5 px-3 bg-[#16181d] hover:bg-gray-800 border border-gray-700 text-blue-400 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="bg-[#12141a] px-6 py-3 border-b border-gray-800 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-[#16181d] border border-gray-800 rounded-lg">
            <div className="text-[10px] text-gray-500 uppercase font-sans">Notional Principal</div>
            <div className="text-white font-bold mt-0.5">
              {schedule.currency} {schedule.notional.toLocaleString()}
            </div>
          </div>

          <div className="p-2.5 bg-[#16181d] border border-gray-800 rounded-lg">
            <div className="text-[10px] text-gray-500 uppercase font-sans">Effective / Maturity</div>
            <div className="text-blue-400 font-bold mt-0.5">{schedule.effectiveDate} → {schedule.maturityDate}</div>
          </div>

          <div className="p-2.5 bg-[#16181d] border border-gray-800 rounded-lg">
            <div className="text-[10px] text-gray-500 uppercase font-sans">Total Periods</div>
            <div className="text-gray-200 font-bold mt-0.5">{schedule.periods.length} Periods</div>
          </div>

          <div className="p-2.5 bg-[#16181d] border border-gray-800 rounded-lg">
            <div className="text-[10px] text-gray-500 uppercase font-sans">Net Cashflow</div>
            <div className={`font-bold mt-0.5 ${schedule.totalNetCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {schedule.currency} {schedule.totalNetCashflow.toLocaleString()}
            </div>
          </div>

          <div className="p-2.5 bg-[#16181d] border border-indigo-700/80 rounded-lg space-y-0.5">
            <div className="text-[10px] text-indigo-300 font-bold uppercase font-sans flex items-center justify-between">
              <span>Net Present Value (PV)</span>
              <span className="text-[9px] text-indigo-300 font-mono font-normal bg-indigo-950 px-1 rounded border border-indigo-700/60">
                {activeModelDetails.name.split(' ')[0]}
              </span>
            </div>
            <div className={`font-bold text-sm ${schedule.totalPV >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {schedule.currency} {schedule.totalPV.toLocaleString()}
            </div>
            <div className="text-[9px] text-amber-300/90 font-sans tracking-tight">
              Valuation Date: <strong>{trade.tradeDate || new Date().toISOString().split('T')[0]}</strong>
            </div>
          </div>

          <div className="p-2.5 bg-[#16181d] border border-emerald-900/60 rounded-lg">
            <div className="text-[10px] text-emerald-400 uppercase font-sans font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Total IRDelta (DV01)
            </div>
            <div className="text-emerald-300 font-bold mt-0.5">
              {schedule.currency} {schedule.totalIrDelta.toLocaleString()} / bp
            </div>
          </div>
        </div>

        {/* Market Data Information Banner */}
        <div className="bg-[#0f121a] px-6 py-2.5 border-b border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between text-[11px] font-mono gap-3">
          <div className="flex items-center gap-3 text-gray-300 flex-wrap">
            <span className="text-indigo-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Valuation Context:
            </span>
            <span>Valuation Date: <strong className="text-amber-300">{trade.tradeDate || new Date().toISOString().split('T')[0]} (COB)</strong></span>
            <span>Forecast Curve: <strong className="text-indigo-300">{trade.marketData?.yieldCurveName || `${schedule.currency}-SOFR-OIS-CURVE`}</strong></span>
            <span>Discount Curve: <strong className="text-emerald-300">{trade.marketData?.discountCurveName || `${schedule.currency}-DISCOUNT-OIS`}</strong></span>
            {trade.marketData?.volSurfaceName && (
              <span>Vol Surface: <strong className="text-amber-300">{trade.marketData.volSurfaceName}</strong></span>
            )}
            {trade.marketData?.fxCurveName && (
              <span>FX Ref: <strong className="text-cyan-300">{trade.marketData.fxCurveName}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[#141722] px-3 py-1.5 rounded-lg border border-indigo-700/60 shrink-0">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 font-bold uppercase text-[10px]">Valuation Model:</span>
            <select
              value={activeValuationModel}
              onChange={(e) => setActiveValuationModel(e.target.value)}
              className="bg-[#090a0d] text-white border border-indigo-500 rounded px-2 py-0.5 text-xs font-mono font-bold focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              {(PRODUCT_VALUATION_MODELS[trade.productType || 'IRS'] || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-indigo-300 font-sans italic border-l border-indigo-800 pl-2">
              [{activeModelDetails.category}]
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 pt-3 bg-[#0a0b0d] border-b border-gray-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`pb-2.5 px-3 text-xs font-bold font-mono tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'SCHEDULE'
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-white'
                }`}
            >
              Periodic Cashflow Table
            </button>
            <button
              onClick={() => setActiveTab('YIELD_CURVES')}
              className={`pb-2.5 px-3 text-xs font-bold font-mono tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${activeTab === 'YIELD_CURVES'
                ? 'text-indigo-400 border-indigo-500'
                : 'text-gray-400 border-transparent hover:text-white'
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Discount & Forward Yield Curves
            </button>
            <button
              onClick={() => setActiveTab('CHART_ANALYTICS')}
              className={`pb-2.5 px-3 text-xs font-bold font-mono tracking-wider transition-colors border-b-2 cursor-pointer ${activeTab === 'CHART_ANALYTICS'
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-white'
                }`}
            >
              Cashflow Profile & Cumulative NPV
            </button>
          </div>
          <div className="text-[11px] text-gray-400 font-mono pb-2 flex items-center gap-3 flex-wrap">
            <span>Accrual Cal: <strong className="text-blue-400">{trade.fixedLeg?.accrualCalendar || trade.capFloorDetails?.accrualCalendar || trade.swaptionDetails?.accrualCalendar || 'USNY'}</strong></span>
            <span>Payment Cal: <strong className="text-emerald-400">{trade.fixedLeg?.paymentCalendar || trade.capFloorDetails?.paymentCalendar || trade.swaptionDetails?.paymentCalendar || 'USNY'}</strong></span>
            <span>Accrual Roll: <strong className="text-amber-400">{trade.fixedLeg?.accrualRollConvention || trade.fixedLeg?.businessDayConvention || 'MODFOLLOWING'}</strong></span>
            <span>Payment Roll: <strong className="text-purple-400">{trade.fixedLeg?.paymentRollConvention || trade.fixedLeg?.businessDayConvention || 'MODFOLLOWING'}</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">

          {activeTab === 'SCHEDULE' ? (
            <div className="bg-[#0a0b0d] border border-gray-800 rounded-xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#12141a] border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                      <th className="py-3 px-3"># Period</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3 text-cyan-400">Accrual Period (Start → End)</th>
                      <th className="py-3 px-3 text-amber-400">Reset Type</th>
                      <th className="py-3 px-3">Reset Period (Start → End)</th>
                      <th className="py-3 px-3">Pay/Reset Date</th>
                      <th className="py-3 px-3 text-center">Days</th>
                      <th className="py-3 px-3 text-center">Fraction (α)</th>
                      <th className="py-3 px-3 text-right text-blue-400">Fixed Coupon Rate (%)</th>
                      <th className="py-3 px-3 text-right text-amber-400">Fixing Rate (%)</th>
                      <th className="py-3 px-3 text-right text-emerald-400">Float Coupon Rate (%)</th>
                      <th className="py-3 px-3 text-right">Fixed Leg Cashflow</th>
                      <th className="py-3 px-3 text-right">Float Leg Cashflow</th>
                      <th className="py-3 px-3 text-right">Net Cashflow</th>
                      <th className="py-3 px-3 text-right text-emerald-300">IRDelta ($/1bp)</th>
                      <th className="py-3 px-3 text-right">DF & PV</th>
                      <th className="py-3 px-3 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                    {schedule.periods.map((p) => {
                      const isPositive = p.netCashflow >= 0;
                      const fixedRateVal = p.fixedCouponRate ?? p.couponRate ?? p.fixedRate ?? p.strikeRate;
                      const floatFixingVal = p.floatingFixingRate ?? p.fixingRate;
                      const floatTotalVal = p.floatingTotalRate ?? p.floatingRate ?? floatFixingVal;
                      const rType = p.resetType || 'ADVANCE';

                      return (
                        <tr key={p.periodNumber} className="hover:bg-gray-800/40 transition-colors">

                          {/* Period # */}
                          <td className="py-3 px-3 font-bold text-white">
                            P-{p.periodNumber}
                          </td>

                          {/* Type Badge */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getBadgeStyle(p.type)}`}>
                              {p.type}
                            </span>
                          </td>

                          {/* Accrual Dates */}
                          <td className="py-3 px-3 text-cyan-300 font-bold">
                            <div>{p.accrualStartDate || p.startDate} → <strong className="text-white">{p.accrualEndDate || p.endDate}</strong></div>
                            {p.fixingDate && (
                              <div className="text-[10px] text-gray-500 font-normal">Fixing: {p.fixingDate}</div>
                            )}
                          </td>

                          {/* Reset Type Badge */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${rType === 'ARREARS' ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-blue-950 text-blue-300 border-blue-700'}`}>
                              {rType}
                            </span>
                          </td>

                          {/* Reset Dates */}
                          <td className="py-3 px-3 text-amber-300">
                            {p.resetStartDate} → {p.resetEndDate}
                          </td>

                          {/* Pay Reset Date */}
                          <td className="py-3 px-3 text-emerald-300 font-bold">
                            {p.payResetDate}
                          </td>

                          {/* Number of Days */}
                          <td className="py-3 px-3 text-center font-bold text-amber-300">
                            {p.numberOfDays}d
                          </td>

                          {/* Day Count Fraction */}
                          <td className="py-3 px-3 text-center text-gray-300">
                            <div>{p.dayCountFraction > 0 ? p.dayCountFraction.toFixed(4) : '-'}</div>
                            <div className="text-[9px] text-gray-500">{p.dayCountConvention}</div>
                          </td>

                          {/* Fixed Leg Coupon Rate (%) with Hover Calculation Breakdown */}
                          <td className="py-3 px-3 text-right font-bold text-blue-400">
                            {fixedRateVal !== undefined ? (
                              <div className="relative group/fixedTooltip inline-block cursor-help">
                                <span className="border-b border-dashed border-blue-400/80 pb-0.5 hover:text-white transition-colors">
                                  {fixedRateVal.toFixed(4)}%
                                </span>

                                {/* Fixed Rate Calculation Popover */}
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/fixedTooltip:block w-80 p-3 bg-[#0d1017] border border-blue-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
                                  <div className="font-bold text-blue-400 border-b border-gray-800 pb-1 mb-1.5 flex items-center justify-between">
                                    <span>Fixed Coupon Calculation</span>
                                    <span className="text-[9px] text-gray-400">P-{p.periodNumber}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Agreed Fixed Rate (r):</span>
                                      <span className="text-blue-300 font-bold">{fixedRateVal.toFixed(4)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Day Count Convention:</span>
                                      <span className="text-gray-200">{p.fixedLegConvention || p.dayCountConvention || '30/360'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Day Count Fraction (α):</span>
                                      <span className="text-cyan-300 font-bold">{(p.dayCountFraction || 0.5).toFixed(6)}</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-blue-400">Fixed Coupon Rate:</span>
                                      <span className="text-blue-400 font-bold">{fixedRateVal.toFixed(4)}%</span>
                                    </div>
                                    <div className="bg-blue-950/40 p-2 rounded mt-1.5 border border-blue-900/60 text-[9px] space-y-1">
                                      <div className="text-gray-300 font-sans font-bold">Formula Validation:</div>
                                      <div className="text-gray-400 font-mono text-[9.5px]">Cashflow = Notional × Rate × α</div>
                                      <div className="text-blue-200 font-mono">
                                        ${(p.fixedLegNotional || p.notional || schedule.notional).toLocaleString()} × {fixedRateVal.toFixed(4)}% × {(p.dayCountFraction || 0.5).toFixed(4)} = <strong className="text-blue-300">${(p.fixedCashflow || 0).toLocaleString()}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Float Leg Benchmark Fixing Rate (%) */}
                          <td className="py-3 px-3 text-right font-bold text-amber-400">
                            {floatFixingVal !== undefined ? `${floatFixingVal.toFixed(4)}%` : '-'}
                          </td>

                          {/* Float Leg Coupon Rate (%) with Hover Calculation Breakdown */}
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                            {floatTotalVal !== undefined ? (
                              <div className="relative group/floatTooltip inline-block cursor-help">
                                <div className="border-b border-dashed border-emerald-400/80 pb-0.5 hover:text-white transition-colors">
                                  <span>{floatTotalVal.toFixed(4)}%</span>
                                  {p.floatingSpreadBps !== undefined && p.floatingSpreadBps !== 0 && (
                                    <div className="text-[9px] text-gray-400">({p.floatingSpreadBps > 0 ? '+' : ''}{p.floatingSpreadBps}bps)</div>
                                  )}
                                </div>

                                {/* Float Coupon Rate Calculation Popover */}
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/floatTooltip:block w-80 p-3 bg-[#0d1017] border border-amber-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
                                  <div className="font-bold text-amber-400 border-b border-gray-800 pb-1 mb-1.5 flex items-center justify-between">
                                    <span>Float Coupon Rate Calculation</span>
                                    <span className="text-[9px] text-gray-400">P-{p.periodNumber}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Benchmark Index Fixing:</span>
                                      <span className="text-amber-300 font-bold">{floatFixingVal !== undefined ? `${floatFixingVal.toFixed(4)}%` : '3.8000%'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Floating Leg Spread:</span>
                                      <span className="text-emerald-300 font-bold">{p.floatingSpreadBps !== undefined ? `${p.floatingSpreadBps > 0 ? '+' : ''}${p.floatingSpreadBps} bps` : '+0 bps'} ({((p.floatingSpreadBps || 0) / 100).toFixed(4)}%)</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-emerald-400">Total Float Coupon Rate:</span>
                                      <span className="text-emerald-400 font-bold">{floatTotalVal.toFixed(4)}%</span>
                                    </div>
                                    <div className="bg-amber-950/40 p-2 rounded mt-1.5 border border-amber-900/60 text-[9px] space-y-1">
                                      <div className="text-gray-300 font-sans font-bold">Formula Validation:</div>
                                      <div className="text-gray-400 font-mono text-[9.5px]">Float Coupon Rate = Fixing Rate + (Spread / 100)</div>
                                      <div className="text-amber-200 font-mono text-[9.5px]">
                                        {floatFixingVal !== undefined ? floatFixingVal.toFixed(4) : '3.8000'}% + {((p.floatingSpreadBps || 0) / 100).toFixed(4)}% = <strong>{floatTotalVal.toFixed(4)}%</strong>
                                      </div>
                                      <div className="text-gray-400 font-mono text-[9.5px] pt-1 border-t border-gray-800">Cashflow = Notional × Float Rate × α</div>
                                      <div className="text-emerald-300 font-mono">
                                        ${(p.floatingLegNotional || p.notional || schedule.notional).toLocaleString()} × {floatTotalVal.toFixed(4)}% × {(p.dayCountFraction || 0.25).toFixed(4)} = <strong className="text-emerald-300">${(p.floatingCashflow || 0).toLocaleString()}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Fixed Leg Cashflow */}
                          <td className="py-3 px-3 text-right">
                            {p.fixedCashflow !== undefined ? (
                              <span className={p.fixedCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {p.fixedCashflow > 0 ? '+' : ''}{p.fixedCashflow.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>

                          {/* Floating Leg Cashflow */}
                          <td className="py-3 px-3 text-right">
                            {p.floatingCashflow !== undefined ? (
                              <span className={p.floatingCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {p.floatingCashflow > 0 ? '+' : ''}{p.floatingCashflow.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>

                          {/* Net Cashflow */}
                          <td className="py-3 px-3 text-right font-bold">
                            <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {p.netCashflow.toLocaleString()}
                            </span>
                          </td>

                          {/* IRDelta (DV01) */}
                          <td className="py-3 px-3 text-right font-bold text-emerald-300">
                            ${p.irDelta?.toLocaleString()}
                          </td>

                          {/* Discount Factor & PV */}
                          <td className="py-3 px-3 text-right text-gray-300">
                            <div>DF: {p.discountFactor.toFixed(4)}</div>
                            <div className="text-[10px] text-blue-300 font-bold">{p.discountedCashflow.toLocaleString()}</div>
                          </td>

                          {/* Cumulative Net Cashflow */}
                          <td className="py-3 px-3 text-right font-bold text-gray-200">
                            {p.cumulativeCashflow.toLocaleString()}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'YIELD_CURVES' ? (
            /* Yield Curve & Forward Curve Analytics Tab */
            <div className="space-y-6">
              {/* Curve Overview Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#12151f] border border-indigo-700/60 rounded-xl p-4 space-y-1">
                  <div className="text-gray-400 text-[10px] uppercase font-sans font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Selected Trade Curves
                  </div>
                  <div className="text-white font-bold text-sm">
                    {trade.marketData?.yieldCurveName || `${schedule.currency}-SOFR-OIS-CURVE`}
                  </div>
                  <div className="text-gray-400 text-[11px]">
                    Discounting: <strong className="text-emerald-400">{trade.marketData?.discountCurveName || `${schedule.currency}-DISCOUNT-OIS`}</strong>
                  </div>
                </div>

                <div className="bg-[#12151f] border border-blue-700/60 rounded-xl p-4 space-y-1">
                  <div className="text-gray-400 text-[10px] uppercase font-sans font-bold flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" /> Average Forward Rate & DF
                  </div>
                  <div className="text-amber-400 font-bold text-sm">
                    {(schedule.periods.reduce((acc, p) => acc + (p.floatingTotalRate ?? p.floatingFixingRate ?? 3.8), 0) / Math.max(1, schedule.periods.length)).toFixed(4)}%
                  </div>
                  <div className="text-gray-400 text-[11px]">
                    Terminal Discount Factor: <strong className="text-blue-300">{(schedule.periods[schedule.periods.length - 1]?.discountFactor || 0.85).toFixed(4)}</strong>
                  </div>
                </div>

                <div className="bg-[#12151f] border border-emerald-700/60 rounded-xl p-4 space-y-1">
                  <div className="text-gray-400 text-[10px] uppercase font-sans font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Active Valuation Engine
                  </div>
                  <div className="text-emerald-300 font-bold text-xs truncate" title={activeModelDetails.name}>
                    {activeModelDetails.name}
                  </div>
                  <div className="text-gray-400 text-[10px] italic truncate">
                    {activeModelDetails.description}
                  </div>
                </div>
              </div>

              {/* Interactive Curve Visualizer (Area & Line Chart) */}
              <div className="bg-[#0a0b0d] border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" /> Discount Curve & Forward Yield Curve Trajectory
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                      Hover cursor anywhere over the chart to inspect period-by-period discount factors, forward fixing rates, and zero yields.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Forward Rate (%)
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span> Discount Factor (DF)
                    </span>
                  </div>
                </div>

                {/* Recharts Curve Visualization */}
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={schedule.periods.map((p) => {
                        const floatVal = p.floatingTotalRate ?? p.floatingFixingRate ?? p.floatingRate ?? 3.85;
                        const df = p.discountFactor || 1;
                        // Implied zero yield rate: r_zero = -ln(DF) / tenor
                        const yearFrac = p.dayCountFraction > 0 ? p.dayCountFraction : 0.5;
                        return {
                          period: `P-${p.periodNumber}`,
                          paymentDate: p.paymentDate,
                          resetPeriod: `${p.resetStartDate} → ${p.resetEndDate}`,
                          forwardRate: parseFloat(floatVal.toFixed(4)),
                          discountFactor: parseFloat(df.toFixed(4)),
                          zeroYield: parseFloat((((1 / df - 1) / Math.max(0.1, p.periodNumber * yearFrac)) * 100).toFixed(4)),
                          fixedRate: p.fixedCouponRate ?? p.couponRate ?? p.fixedRate ?? 0,
                          netCashflow: p.netCashflow,
                          irDelta: p.irDelta,
                          notional: p.notional,
                        };
                      })}
                      margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="forwardGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="discountGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#f59e0b"
                        tick={{ fontSize: 11, fill: '#f59e0b' }}
                        domain={['auto', 'auto']}
                        unit="%"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#818cf8"
                        tick={{ fontSize: 11, fill: '#818cf8' }}
                        domain={[0, 1.05]}
                      />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0b0e14] border border-indigo-500/80 rounded-xl p-3.5 shadow-2xl font-mono text-xs space-y-2 max-w-sm backdrop-blur-md">
                                <div className="font-bold text-white border-b border-gray-800 pb-1 flex justify-between items-center">
                                  <span className="text-indigo-400">{label} ({data.paymentDate})</span>
                                  <span className="text-[10px] text-gray-400 font-normal">Pay/Reset Date</span>
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Reset Period:</span>
                                    <span className="text-amber-300 font-bold">{data.resetPeriod}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-amber-400 font-bold">Forward Fixing Yield Rate:</span>
                                    <span className="text-amber-300 font-bold">{data.forwardRate}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-indigo-400 font-bold">OIS Discount Factor (DF):</span>
                                    <span className="text-indigo-300 font-bold">{data.discountFactor}</span>
                                  </div>
                                  <div className="flex justify-between text-cyan-300">
                                    <span>Implied Zero-Coupon Yield:</span>
                                    <span className="font-bold">{data.zeroYield}%</span>
                                  </div>
                                  {data.fixedRate > 0 && (
                                    <div className="flex justify-between text-blue-400">
                                      <span>Fixed Leg Coupon Rate:</span>
                                      <span className="font-bold">{data.fixedRate}%</span>
                                    </div>
                                  )}
                                  <div className="border-t border-gray-800 pt-1 flex justify-between">
                                    <span className="text-gray-400">Net Period Cashflow:</span>
                                    <span className={data.netCashflow >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                      ${data.netCashflow.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-emerald-300">
                                    <span>Period DV01 Sensitivity:</span>
                                    <span className="font-bold">${data.irDelta?.toLocaleString()} / bp</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="forwardRate"
                        name="Forward Yield Rate (%)"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#forwardGrad)"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="discountFactor"
                        name="Discount Factor (DF)"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#discountGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Discount Curve & Forward Rate Data Grid with Cursor Hover */}
              <div className="bg-[#0a0b0d] border border-gray-800 rounded-xl overflow-hidden shadow-inner space-y-2">
                <div className="px-5 py-3 bg-[#12141a] border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-400" /> Interactive Yield & Discount Curve Table (Hover Cursor to Inspect Details)
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Curve ID: <strong className="text-indigo-300">{trade.marketData?.yieldCurveName || `${schedule.currency}-SOFR-OIS-CURVE`}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#141720] border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3">Reset Period (Start → End)</th>
                        <th className="py-2.5 px-3 text-right text-amber-400">Forward Rate (%)</th>
                        <th className="py-2.5 px-3 text-right text-indigo-400">Discount Factor (DF)</th>
                        <th className="py-2.5 px-3 text-right text-cyan-400">Implied Zero Yield (%)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Net Discounted PV</th>
                        <th className="py-2.5 px-3 text-right text-emerald-300">Period DV01</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                      {schedule.periods.map((p) => {
                        const floatVal = p.floatingTotalRate ?? p.floatingFixingRate ?? p.floatingRate ?? 3.85;
                        const df = p.discountFactor || 1;
                        const yearFrac = p.dayCountFraction > 0 ? p.dayCountFraction : 0.5;
                        const zeroYield = ((1 / df - 1) / Math.max(0.1, p.periodNumber * yearFrac)) * 100;

                        return (
                          <tr key={p.periodNumber} className="hover:bg-indigo-950/40 transition-colors group/row cursor-pointer">

                            {/* Period # */}
                            <td className="py-2.5 px-3 font-bold text-white group-hover/row:text-indigo-300">
                              P-{p.periodNumber}
                            </td>

                            {/* Payment Date */}
                            <td className="py-2.5 px-3 text-gray-300">
                              {p.paymentDate}
                            </td>

                            {/* Reset Period */}
                            <td className="py-2.5 px-3 text-amber-300 text-[10px]">
                              {p.resetStartDate} → {p.resetEndDate}
                            </td>

                            {/* Forward Rate with Hover Tooltip */}
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                              <div className="relative group/fwdTooltip inline-block cursor-help">
                                <span className="border-b border-dashed border-amber-400/80 pb-0.5 hover:text-white transition-colors">
                                  {floatVal.toFixed(4)}%
                                </span>

                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/fwdTooltip:block w-72 p-3 bg-[#0d1017] border border-amber-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
                                  <div className="font-bold text-amber-400 border-b border-gray-800 pb-1 mb-1 flex justify-between">
                                    <span>Forward Fixing Breakdown</span>
                                    <span>P-{p.periodNumber}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Index Benchmark:</span>
                                      <span className="text-amber-300 font-bold">{(p.floatingFixingRate ?? floatVal).toFixed(4)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Spread:</span>
                                      <span className="text-emerald-300 font-bold">+{p.floatingSpreadBps || 0} bps</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-amber-400">Total Forward Rate:</span>
                                      <span>{floatVal.toFixed(4)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Discount Factor with Hover Tooltip */}
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                              <div className="relative group/dfTooltip inline-block cursor-help">
                                <span className="border-b border-dashed border-indigo-400/80 pb-0.5 hover:text-white transition-colors">
                                  {df.toFixed(4)}
                                </span>

                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/dfTooltip:block w-72 p-3 bg-[#0d1017] border border-indigo-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
                                  <div className="font-bold text-indigo-400 border-b border-gray-800 pb-1 mb-1 flex justify-between">
                                    <span>OIS Discount Factor Data</span>
                                    <span>P-{p.periodNumber}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Discount Factor (DF):</span>
                                      <span className="text-indigo-300 font-bold">{df.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Discount Curve:</span>
                                      <span className="text-gray-200">{trade.marketData?.discountCurveName || 'OIS-USD-DISCOUNT'}</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-blue-300">Discounted Period Cashflow:</span>
                                      <span className="text-blue-300">${p.discountedCashflow.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Implied Zero Yield */}
                            <td className="py-2.5 px-3 text-right text-cyan-300 font-bold">
                              {zeroYield.toFixed(4)}%
                            </td>

                            {/* Net Discounted PV */}
                            <td className="py-2.5 px-3 text-right text-blue-300 font-bold">
                              ${p.discountedCashflow.toLocaleString()}
                            </td>

                            {/* Period DV01 */}
                            <td className="py-2.5 px-3 text-right text-emerald-300 font-bold">
                              ${p.irDelta?.toLocaleString()}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Analytics Chart & Breakdown */
            <div className="space-y-4">
              <div className="bg-[#0a0b0d] border border-gray-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Cashflow Profile Bar Visualization
                </h3>
                <div className="space-y-2 pt-2">
                  {schedule.periods.map((p) => {
                    const isPositive = p.netCashflow >= 0;
                    const maxFlow = Math.max(...schedule.periods.map((item) => Math.abs(item.netCashflow)), 1);
                    const widthPercent = Math.min(100, Math.max(5, (Math.abs(p.netCashflow) / maxFlow) * 100));

                    return (
                      <div key={p.periodNumber} className="flex items-center gap-3 text-xs font-mono">
                        <span className="w-16 text-gray-400 shrink-0">P-{p.periodNumber} ({p.paymentDate.substring(2)})</span>
                        <div className="flex-1 bg-[#16181d] rounded-full h-4 relative overflow-hidden flex items-center">
                          <div
                            className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <span className={`w-28 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {p.netCashflow.toLocaleString()}
                        </span>
                        <span className="w-24 text-right text-emerald-300 text-[10px]">
                          DV01: ${p.irDelta?.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#0a0b0d] px-6 py-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
          <span>Net Cumulative Cashflow: <strong className="text-white">{schedule.currency} {schedule.totalNetCashflow.toLocaleString()}</strong></span>
          <span>Total IRDelta (DV01): <strong className="text-emerald-400">{schedule.currency} {schedule.totalIrDelta.toLocaleString()} / bp</strong></span>
          <button
            onClick={onClose}
            className="py-1 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded font-bold transition-all cursor-pointer"
          >
            Close Modal
          </button>
        </div>

      </div>
    </div>
  );
};
