import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calculator, RefreshCw, BarChart2,
  PieChart as PieIcon, Layers, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, Calendar, Info, Cpu, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { Currency, IRSwapTrade } from '../types';
import { convertCurrency, CURRENCY_SYMBOLS } from '../lib/fxRates';

interface PnlDashboardProps {
  trades: IRSwapTrade[];
  onRefresh?: () => void;
}

export const PnlDashboard: React.FC<PnlDashboardProps> = ({ trades, onRefresh }) => {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [shiftBps, setShiftBps] = useState<number>(25); // Simulated Curve Shift in bps (+25bps)
  const [shiftVolPct, setShiftVolPct] = useState<number>(2.0); // Simulated Vol Shift in % (+2% vol)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  const currSymbol = CURRENCY_SYMBOLS[displayCurrency] || '$';

  // Handle Refresh Click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => {
      setLastRefreshedAt(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 400);
  };

  // Convert USD value to selected display currency
  const convertToDisplayCcy = (valInUsd: number): number => {
    return Math.round(convertCurrency(valInUsd, 'USD', displayCurrency));
  };

  // Compute Trade-level PnL, First-Order PnL, Second-Order PnL, and Total Market Standard PnL
  const pnlTradeRows = useMemo(() => {
    return trades
      .filter((t) => {
        if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) return false;
        if (selectedProductFilter !== 'ALL' && t.productType !== selectedProductFilter) return false;
        return true;
      })
      .map((t) => {
        const prod = t.productType || 'IRS';
        const origCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
        const notionalBaseUsd = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || 10000000;
        
        // MTM / Current Trade PV
        const pvUsd = t.markToMarket || 0;
        const pvConverted = convertToDisplayCcy(pvUsd);

        // Benchmark / Initial Booking PV (simulated baseline for PnL attribution)
        const isPay = t.fixedLeg?.direction === 'PAY_FIXED' || t.capFloorDetails?.direction === 'BUY' || t.swaptionDetails?.direction === 'BUY';
        const directionSign = isPay ? -1 : 1;
        const initialPvUsd = Math.round(pvUsd - (t.dv01 || Math.round(notionalBaseUsd * 0.00025)) * 12.5);
        const initialPvConverted = convertToDisplayCcy(initialPvUsd);

        // Trade-wise total PV PnL = Current PV - Initial Booking PV
        const pvPnlUsd = pvUsd - initialPvUsd;
        const pvPnlConverted = convertToDisplayCcy(pvPnlUsd);

        // 1ST ORDER PnL COMPONENTS (Taylor Expansion: Delta PnL + Vega PnL + Theta PnL)
        // Delta PnL = DV01 * Shift (bps)
        const dv01Usd = (t.dv01 || Math.round(notionalBaseUsd * 0.00025)) * directionSign;
        const deltaPnlUsd = dv01Usd * shiftBps;

        // Vega PnL = Vega * VolShift (%)
        let vegaUsd = 0;
        if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'RANGE_ACCRUAL', 'SNOW_RANGE', 'TARN', 'SNOWBALL'].includes(prod)) {
          vegaUsd = Math.round(notionalBaseUsd * 0.0012 * (t.tenorYears || 3));
        }
        const vegaPnlUsd = vegaUsd * shiftVolPct;

        // Theta PnL (Time Decay PnL per day)
        const thetaPnlUsd = -Math.round((Math.abs(pvUsd) * 0.0004) + Math.abs(dv01Usd) * 0.2 + 80);

        const firstOrderPnlUsd = deltaPnlUsd + vegaPnlUsd + thetaPnlUsd;

        // 2ND ORDER PnL COMPONENTS (Gamma PnL + Vanna PnL + Volga PnL)
        // Gamma PnL = 0.5 * Gamma * (ShiftBps)^2
        const gammaUsd = (dv01Usd * 0.015) / 10;
        const gammaPnlUsd = Math.round(0.5 * gammaUsd * Math.pow(shiftBps, 2));

        // Vanna PnL = Cross sensitivity (ShiftBps * VolShift)
        let vannaUsd = 0;
        if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'SNOW_RANGE', 'SNOWBALL'].includes(prod)) {
          vannaUsd = vegaUsd * 0.025;
        }
        const vannaPnlUsd = Math.round(vannaUsd * shiftBps * shiftVolPct);

        // Volga PnL = 0.5 * Volga * (VolShift)^2
        let volgaUsd = 0;
        if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'SNOW_RANGE', 'TARN', 'SNOWBALL'].includes(prod)) {
          volgaUsd = vegaUsd * 0.045;
        }
        const volgaPnlUsd = Math.round(0.5 * volgaUsd * Math.pow(shiftVolPct, 2));

        const secondOrderPnlUsd = gammaPnlUsd + vannaPnlUsd + volgaPnlUsd;

        // Total Market Standard Attributed PnL = First Order PnL + Second Order PnL
        const totalAttributedPnlUsd = firstOrderPnlUsd + secondOrderPnlUsd;

        // Unexplained / Residual PnL (Higher order terms & basis spread noise)
        const residualPnlUsd = pvPnlUsd - totalAttributedPnlUsd;

        return {
          trade: t,
          tradeId: t.tradeId,
          productType: prod,
          counterpartyName: t.counterpartyName,
          status: t.status,
          originalCcy: origCcy,
          notionalUsd: notionalBaseUsd,
          notionalConverted: convertToDisplayCcy(notionalBaseUsd),
          pvUsd,
          pvConverted,
          pvPnlUsd,
          pvPnlConverted,

          // 1st Order Components Converted
          deltaPnlUsd,
          deltaPnlConverted: convertToDisplayCcy(deltaPnlUsd),
          vegaPnlUsd,
          vegaPnlConverted: convertToDisplayCcy(vegaPnlUsd),
          thetaPnlUsd,
          thetaPnlConverted: convertToDisplayCcy(thetaPnlUsd),
          firstOrderPnlUsd,
          firstOrderPnlConverted: convertToDisplayCcy(firstOrderPnlUsd),

          // 2nd Order Components Converted
          gammaPnlUsd,
          gammaPnlConverted: convertToDisplayCcy(gammaPnlUsd),
          vannaPnlUsd,
          vannaPnlConverted: convertToDisplayCcy(vannaPnlUsd),
          volgaPnlUsd,
          volgaPnlConverted: convertToDisplayCcy(volgaPnlUsd),
          secondOrderPnlUsd,
          secondOrderPnlConverted: convertToDisplayCcy(secondOrderPnlUsd),

          totalAttributedPnlUsd,
          totalAttributedPnlConverted: convertToDisplayCcy(totalAttributedPnlUsd),
          residualPnlUsd,
          residualPnlConverted: convertToDisplayCcy(residualPnlUsd),
        };
      });
  }, [trades, displayCurrency, selectedProductFilter, selectedStatusFilter, shiftBps, shiftVolPct]);

  // Aggregate Portfolio Totals
  const portfolioSummary = useMemo(() => {
    const totalPvPnl = pnlTradeRows.reduce((acc, r) => acc + r.pvPnlConverted, 0);
    const totalFirstOrderPnl = pnlTradeRows.reduce((acc, r) => acc + r.firstOrderPnlConverted, 0);
    const totalSecondOrderPnl = pnlTradeRows.reduce((acc, r) => acc + r.secondOrderPnlConverted, 0);
    const totalDeltaPnl = pnlTradeRows.reduce((acc, r) => acc + r.deltaPnlConverted, 0);
    const totalVegaPnl = pnlTradeRows.reduce((acc, r) => acc + r.vegaPnlConverted, 0);
    const totalThetaPnl = pnlTradeRows.reduce((acc, r) => acc + r.thetaPnlConverted, 0);
    const totalGammaPnl = pnlTradeRows.reduce((acc, r) => acc + r.gammaPnlConverted, 0);
    const totalVannaPnl = pnlTradeRows.reduce((acc, r) => acc + r.vannaPnlConverted, 0);
    const totalVolgaPnl = pnlTradeRows.reduce((acc, r) => acc + r.volgaPnlConverted, 0);
    const totalAttributedPnl = pnlTradeRows.reduce((acc, r) => acc + r.totalAttributedPnlConverted, 0);
    const totalResidualPnl = pnlTradeRows.reduce((acc, r) => acc + r.residualPnlConverted, 0);

    return {
      totalPvPnl,
      totalFirstOrderPnl,
      totalSecondOrderPnl,
      totalDeltaPnl,
      totalVegaPnl,
      totalThetaPnl,
      totalGammaPnl,
      totalVannaPnl,
      totalVolgaPnl,
      totalAttributedPnl,
      totalResidualPnl,
    };
  }, [pnlTradeRows]);

  // Chart Data for PnL Breakdown by Product
  const pnlByProductData = useMemo(() => {
    const map: Record<string, { product: string; firstOrder: number; secondOrder: number; totalPvPnl: number }> = {};
    pnlTradeRows.forEach((r) => {
      if (!map[r.productType]) {
        map[r.productType] = { product: r.productType, firstOrder: 0, secondOrder: 0, totalPvPnl: 0 };
      }
      map[r.productType].firstOrder += r.firstOrderPnlConverted;
      map[r.productType].secondOrder += r.secondOrderPnlConverted;
      map[r.productType].totalPvPnl += r.pvPnlConverted;
    });
    return Object.values(map);
  }, [pnlTradeRows]);

  return (
    <div id="pnl-dashboard-root" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner & Controls */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide font-mono flex items-center gap-2">
                  Market Standard Rates PnL Attribution Dashboard
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-800 font-sans font-bold">
                    Taylor Expansion Model
                  </span>
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Trade-wise PV PnL decomposed into 1st Order (Delta, Vega, Theta) and 2nd Order (Gamma, Vanna, Volga) PnL components.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 bg-[#141926] border border-gray-700 rounded-xl px-3 py-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-400 text-[11px]">Display Ccy:</span>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="USD" className="bg-[#0b0f19]">USD ($)</option>
                <option value="EUR" className="bg-[#0b0f19]">EUR (€)</option>
                <option value="GBP" className="bg-[#0b0f19]">GBP (£)</option>
                <option value="JPY" className="bg-[#0b0f19]">JPY (¥)</option>
                <option value="CAD" className="bg-[#0b0f19]">CAD (CA$)</option>
                <option value="AUD" className="bg-[#0b0f19]">AUD (A$)</option>
                <option value="CHF" className="bg-[#0b0f19]">CHF (CHF)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Re-evaluating...' : 'Refresh PnL'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Shock Sliders */}
        <div className="pt-3 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Product Filter */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Product Type Filter</label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full bg-[#141926] border border-gray-700 rounded-lg p-2 text-white font-bold focus:outline-none"
            >
              <option value="ALL">All Rates & FX Products ({trades.length})</option>
              <option value="IRS">Interest Rate Swaps (IRS)</option>
              <option value="CAP_FLOOR">Cap / Floor</option>
              <option value="SWAPTION">Swaption</option>
              <option value="RANGE_ACCRUAL">Range Accrual</option>
              <option value="SNOW_RANGE">Snow Range Accrual</option>
              <option value="TARN">TARN Note</option>
              <option value="SNOWBALL">Snowball Ratchet</option>
              <option value="FX_FORWARD">FX Forward</option>
              <option value="FX_OPTION">FX Option</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Trade Status</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-[#141926] border border-gray-700 rounded-lg p-2 text-white font-bold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="BOOKED">BOOKED</option>
              <option value="AMENDED">AMENDED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="MATURED">MATURED</option>
              <option value="TERMINATED">TERMINATED</option>
            </select>
          </div>

          {/* Curve Shift Input (bps) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Curve Shift (bps)</label>
              <span className="text-amber-400 font-bold">+{shiftBps} bps</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              value={shiftBps}
              onChange={(e) => setShiftBps(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Vol Shift Input (%) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Vol Shift (%)</label>
              <span className="text-indigo-400 font-bold">+{shiftVolPct}%</span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={shiftVolPct}
              onChange={(e) => setShiftVolPct(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Total Trade PV PnL */}
        <div className="bg-[#0d111a] border border-emerald-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Total Trade PV PnL
            </span>
            <span className="text-[10px] text-emerald-400">Total Net MTM PnL</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalPvPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalPvPnl.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans">
            Baseline Booking PV vs Current MTM Revaluation
          </div>
        </div>

        {/* 1st Order PnL (Delta + Vega + Theta) */}
        <div className="bg-[#0d111a] border border-blue-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> 1st Order PnL
            </span>
            <span className="text-[10px] text-blue-400">Delta + Vega + Theta</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalFirstOrderPnl >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalFirstOrderPnl.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans flex justify-between">
            <span>Δ: {currSymbol}{portfolioSummary.totalDeltaPnl.toLocaleString()}</span>
            <span>V: {currSymbol}{portfolioSummary.totalVegaPnl.toLocaleString()}</span>
            <span>Θ: {currSymbol}{portfolioSummary.totalThetaPnl.toLocaleString()}</span>
          </div>
        </div>

        {/* 2nd Order PnL (Gamma + Vanna + Volga) */}
        <div className="bg-[#0d111a] border border-amber-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-400" /> 2nd Order PnL
            </span>
            <span className="text-[10px] text-amber-400">Gamma + Vanna + Volga</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalSecondOrderPnl >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalSecondOrderPnl.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans flex justify-between">
            <span>Γ: {currSymbol}{portfolioSummary.totalGammaPnl.toLocaleString()}</span>
            <span>Van: {currSymbol}{portfolioSummary.totalVannaPnl.toLocaleString()}</span>
            <span>Volg: {currSymbol}{portfolioSummary.totalVolgaPnl.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Attributed vs Residual PnL */}
        <div className="bg-[#0d111a] border border-purple-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> Total Attributed PnL
            </span>
            <span className="text-[10px] text-purple-300">1st + 2nd Order</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalAttributedPnl >= 0 ? 'text-purple-300' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalAttributedPnl.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans flex justify-between">
            <span>Unexplained Residual:</span>
            <strong className={portfolioSummary.totalResidualPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currSymbol}{portfolioSummary.totalResidualPnl.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* PnL BREAKDOWN CHART BY PRODUCT */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" /> PnL Attribution by Product Class ({displayCurrency})
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Comparison of 1st Order PnL, 2nd Order PnL, and Total MTM PV PnL across active rates & FX products.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span> 1st Order PnL
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 bg-amber-500 rounded-sm"></span> 2nd Order PnL
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Total PV PnL
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pnlByProductData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="product" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} unit={` ${currSymbol}`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0b0f19] border border-indigo-500/80 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5">
                        <div className="font-bold text-white border-b border-gray-800 pb-1">{label} PnL Breakdown</div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex justify-between gap-4">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-bold text-white">{currSymbol}{Number(entry.value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="firstOrder" name="1st Order PnL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="secondOrder" name="2nd Order PnL" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalPvPnl" name="Total PV PnL" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TRADE-WISE PnL DETAILED ATTRIBUTION TABLE */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-2xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Trade-Wise PnL Attribution Schedule ({pnlTradeRows.length} Trades)
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Granular trade-level PnL breakdown detailing 1st Order (Delta, Vega, Theta) and 2nd Order (Gamma, Vanna, Volga) risks converted to {displayCurrency}.
            </p>
          </div>

          <span className="px-3 py-1 bg-emerald-950 text-emerald-300 rounded-lg border border-emerald-800 text-xs font-bold">
            Total Portfolio PnL: {currSymbol}{portfolioSummary.totalPvPnl.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-[11px] border-collapse font-mono">
            <thead>
              <tr className="bg-[#141926] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[9px]">
                <th className="py-2.5 px-3">Trade ID</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Counterparty</th>
                <th className="py-2.5 px-3 text-right">Notional ({displayCurrency})</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Current PV</th>
                <th className="py-2.5 px-3 text-right text-emerald-300 font-bold bg-emerald-950/30">Total PV PnL</th>
                <th className="py-2.5 px-3 text-right text-blue-400">Δ Delta PnL</th>
                <th className="py-2.5 px-3 text-right text-indigo-400">V Vega PnL</th>
                <th className="py-2.5 px-3 text-right text-gray-400">Θ Theta PnL</th>
                <th className="py-2.5 px-3 text-right text-blue-300 font-bold bg-blue-950/30">1st Order PnL</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Γ Gamma PnL</th>
                <th className="py-2.5 px-3 text-right text-purple-400">Vanna PnL</th>
                <th className="py-2.5 px-3 text-right text-amber-300 font-bold bg-amber-950/30">2nd Order PnL</th>
                <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold bg-emerald-950/50">Attributed PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {pnlTradeRows.map((r) => (
                <tr key={r.tradeId} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white">{r.tradeId}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {r.productType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 truncate max-w-[140px]">{r.counterpartyName}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{currSymbol}{r.notionalConverted.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${r.pvConverted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currSymbol}{r.pvConverted.toLocaleString()}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-extrabold bg-emerald-950/20 ${r.pvPnlConverted >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                    {r.pvPnlConverted >= 0 ? '+' : ''}{currSymbol}{r.pvPnlConverted.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-400">{currSymbol}{r.deltaPnlConverted.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-400">{currSymbol}{r.vegaPnlConverted.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-400">{currSymbol}{r.thetaPnlConverted.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right font-bold bg-blue-950/20 ${r.firstOrderPnlConverted >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                    {r.firstOrderPnlConverted >= 0 ? '+' : ''}{currSymbol}{r.firstOrderPnlConverted.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-400">{currSymbol}{r.gammaPnlConverted.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-purple-400">{currSymbol}{r.vannaPnlConverted.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right font-bold bg-amber-950/20 ${r.secondOrderPnlConverted >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {r.secondOrderPnlConverted >= 0 ? '+' : ''}{currSymbol}{r.secondOrderPnlConverted.toLocaleString()}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-extrabold bg-emerald-950/40 ${r.totalAttributedPnlConverted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.totalAttributedPnlConverted >= 0 ? '+' : ''}{currSymbol}{r.totalAttributedPnlConverted.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
