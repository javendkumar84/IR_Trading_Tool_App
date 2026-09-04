import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calculator, RefreshCw, BarChart2,
  PieChart as PieIcon, Layers, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, Calendar, Info, Cpu, Activity, Eye, ChevronRight, X, BookOpen, Layers3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Currency, IRSwapTrade } from '../types';
import { convertCurrency, CURRENCY_SYMBOLS } from '../lib/fxRates';

interface PnlDashboardProps {
  trades: IRSwapTrade[];
  onRefresh?: () => void;
}

export interface BankPnlAttribution {
  // Valuation 3 Numbers
  tMinus1NpvNoCash: number;
  t0OpeningNpv: number;
  t0ClosingNpv: number;
  cashPl: number;
  actualPl: number;

  // Trading Activity
  newTradesPl: number;
  amendTradesPl: number;

  // IR Risk
  irDeltaPl: number;
  irBasisDeltaNormalConstraintPl: number;
  irDiscountBasisDeltaNormalConstraintPl: number;

  // IR Volatility
  irAtmBpVegaPl: number;
  irVolBetaNormalConstraintPl: number;
  irVolNuNormalConstraintPl: number;
  irVolRhoNormalConstraintPl: number;

  // IR Revaluation & Fixing
  irResetPl: number;
  revalIRCrossResidualPl: number;
  revalCurveResidualPl: number;

  // FX Risk
  fxDeltaPl: number;
  fxVegaPl: number;
  fxSegaPl: number;

  // FX Revaluation & Residuals
  revalFXSpotResidualPl: number;
  revalFXVolResidualPl: number;
  revalFXCrossResidualPl: number;

  // Time & Reconciliation
  thetaPl: number;
  revalVolResidualPl: number;
  explainedPl: number;
  unexplainedPl: number;
}

export const PnlDashboard: React.FC<PnlDashboardProps> = ({ trades, onRefresh }) => {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [shiftBps, setShiftBps] = useState<number>(20); // 20 bps move like in PDF
  const [shiftFxPct, setShiftFxPct] = useState<number>(0.6); // 0.6% FX spot move
  const [selectedTradeModal, setSelectedTradeModal] = useState<IRSwapTrade | null>(null);
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

  /**
   * Calculates all 25 PDF Bank PnL Explain buckets for a specific trade
   */
  const computeTradePnlExplain = (t: IRSwapTrade): BankPnlAttribution => {
    const prod = t.productType || 'IRS';
    const notionalBaseUsd = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || 10000000;
    const isPay = t.fixedLeg?.direction === 'PAY_FIXED' || t.capFloorDetails?.direction === 'BUY' || t.swaptionDetails?.direction === 'BUY';
    const directionSign = isPay ? -1 : 1;

    // 1. Valuation Numbers
    const t0ClosingNpvUsd = t.markToMarket || 0;
    
    // Calculate T-1 Opening NPV based on baseline rate vs current par rate
    const dv01PerBpUsd = (t.dv01 || Math.round(notionalBaseUsd * 0.00025)) * directionSign;
    const openingNpvDeltaUsd = dv01PerBpUsd * shiftBps; // PnL from rate move
    const t0OpeningNpvUsd = t0ClosingNpvUsd - openingNpvDeltaUsd;
    const tMinus1NpvNoCashUsd = t0OpeningNpvUsd;
    
    const cashPlUsd = 0; // Assume no cash settlement today
    const actualPlUsd = t0ClosingNpvUsd - t0OpeningNpvUsd + cashPlUsd;

    // 2. Trading Activity
    const newTradesPlUsd = t.status === 'BOOKED' && t.tradeDate === new Date().toISOString().split('T')[0] ? Math.round(t0ClosingNpvUsd * 0.05) : 0;
    const amendTradesPlUsd = t.status === 'AMENDED' ? Math.round(dv01PerBpUsd * 2.5) : 0;

    // 3. IR Delta & Basis
    const irDeltaPlUsd = dv01PerBpUsd * shiftBps; // Linear IR Delta PnL
    
    // Basis buckets (Non-zero for multi-curve / basis swaps)
    const isMultiCurve = prod === 'IRS' || prod === 'RANGE_ACCRUAL' || prod === 'TARN';
    const irBasisDeltaNormalConstraintPlUsd = isMultiCurve ? Math.round(dv01PerBpUsd * 0.08 * shiftBps) : 0;
    const irDiscountBasisDeltaNormalConstraintPlUsd = isMultiCurve ? Math.round(dv01PerBpUsd * 0.03 * shiftBps) : 0;

    // 4. IR Volatility Buckets (Non-zero for Options: Cap/Floor, Swaption, Exotic Range Accruals)
    const isIrOption = ['CAP_FLOOR', 'SWAPTION', 'RANGE_ACCRUAL', 'SNOW_RANGE', 'TARN', 'SNOWBALL'].includes(prod);
    const irAtmBpVegaPlUsd = isIrOption ? Math.round(notionalBaseUsd * 0.0012 * (t.tenorYears || 3) * 1.5) : 0;
    const irVolBetaNormalConstraintPlUsd = isIrOption ? Math.round(irAtmBpVegaPlUsd * 0.05) : 0;
    const irVolNuNormalConstraintPlUsd = isIrOption ? Math.round(irAtmBpVegaPlUsd * 0.03) : 0;
    const irVolRhoNormalConstraintPlUsd = isIrOption ? Math.round(irAtmBpVegaPlUsd * 0.02) : 0;

    // 5. IR Reset & Revaluation
    const irResetPlUsd = (prod === 'IRS' || prod === 'RANGE_ACCRUAL') ? Math.round(notionalBaseUsd * 0.00005 * shiftBps) : 0;
    const gammaUsd = (dv01PerBpUsd * 0.015) / 10;
    const revalCurveResidualPlUsd = Math.round(0.5 * gammaUsd * Math.pow(shiftBps, 2)); // Convexity/Second order
    const revalIRCrossResidualPlUsd = isMultiCurve ? Math.round(revalCurveResidualPlUsd * 0.15) : 0;

    // 6. FX Risk Buckets (Active when reporting currency differs or FX trades)
    const isFxTrade = ['FX_FORWARD', 'FX_OPTION'].includes(prod) || displayCurrency !== 'USD';
    const fxDeltaPlUsd = isFxTrade ? Math.round(t0OpeningNpvUsd * (shiftFxPct / 100)) : 0;
    const fxVegaPlUsd = prod === 'FX_OPTION' ? Math.round(notionalBaseUsd * 0.0015 * 2.0) : 0;
    const fxSegaPlUsd = prod === 'FX_OPTION' ? Math.round(fxVegaPlUsd * 0.1) : 0;

    // 7. FX Residuals & Time Decay
    const revalFXSpotResidualPlUsd = isFxTrade ? Math.round(fxDeltaPlUsd * 0.02) : 0;
    const revalFXVolResidualPlUsd = prod === 'FX_OPTION' ? Math.round(fxVegaPlUsd * 0.03) : 0;
    const revalFXCrossResidualPlUsd = (isFxTrade && isIrOption) ? Math.round(fxDeltaPlUsd * 0.05) : 0;

    const thetaPlUsd = -Math.round((Math.abs(t0ClosingNpvUsd) * 0.0004) + Math.abs(dv01PerBpUsd) * 0.2 + 80);
    const revalVolResidualPlUsd = isIrOption ? Math.round(irAtmBpVegaPlUsd * 0.02) : 0;

    // Sum of Explained PnL
    const explainedPlUsd = newTradesPlUsd + amendTradesPlUsd + irDeltaPlUsd +
      irBasisDeltaNormalConstraintPlUsd + irDiscountBasisDeltaNormalConstraintPlUsd +
      irAtmBpVegaPlUsd + irVolBetaNormalConstraintPlUsd + irVolNuNormalConstraintPlUsd + irVolRhoNormalConstraintPlUsd +
      irResetPlUsd + revalIRCrossResidualPlUsd + revalCurveResidualPlUsd +
      fxDeltaPlUsd + fxVegaPlUsd + fxSegaPlUsd +
      revalFXSpotResidualPlUsd + revalFXVolResidualPlUsd + revalFXCrossResidualPlUsd +
      thetaPlUsd + revalVolResidualPlUsd;

    const unexplainedPlUsd = actualPlUsd - explainedPlUsd;

    return {
      tMinus1NpvNoCash: convertToDisplayCcy(tMinus1NpvNoCashUsd),
      t0OpeningNpv: convertToDisplayCcy(t0OpeningNpvUsd),
      t0ClosingNpv: convertToDisplayCcy(t0ClosingNpvUsd),
      cashPl: convertToDisplayCcy(cashPlUsd),
      actualPl: convertToDisplayCcy(actualPlUsd),

      newTradesPl: convertToDisplayCcy(newTradesPlUsd),
      amendTradesPl: convertToDisplayCcy(amendTradesPlUsd),

      irDeltaPl: convertToDisplayCcy(irDeltaPlUsd),
      irBasisDeltaNormalConstraintPl: convertToDisplayCcy(irBasisDeltaNormalConstraintPlUsd),
      irDiscountBasisDeltaNormalConstraintPl: convertToDisplayCcy(irDiscountBasisDeltaNormalConstraintPlUsd),

      irAtmBpVegaPl: convertToDisplayCcy(irAtmBpVegaPlUsd),
      irVolBetaNormalConstraintPl: convertToDisplayCcy(irVolBetaNormalConstraintPlUsd),
      irVolNuNormalConstraintPl: convertToDisplayCcy(irVolNuNormalConstraintPlUsd),
      irVolRhoNormalConstraintPl: convertToDisplayCcy(irVolRhoNormalConstraintPlUsd),

      irResetPl: convertToDisplayCcy(irResetPlUsd),
      revalIRCrossResidualPl: convertToDisplayCcy(revalIRCrossResidualPlUsd),
      revalCurveResidualPl: convertToDisplayCcy(revalCurveResidualPlUsd),

      fxDeltaPl: convertToDisplayCcy(fxDeltaPlUsd),
      fxVegaPl: convertToDisplayCcy(fxVegaPlUsd),
      fxSegaPl: convertToDisplayCcy(fxSegaPlUsd),

      revalFXSpotResidualPl: convertToDisplayCcy(revalFXSpotResidualPlUsd),
      revalFXVolResidualPl: convertToDisplayCcy(revalFXVolResidualPlUsd),
      revalFXCrossResidualPl: convertToDisplayCcy(revalFXCrossResidualPlUsd),

      thetaPl: convertToDisplayCcy(thetaPlUsd),
      revalVolResidualPl: convertToDisplayCcy(revalVolResidualPlUsd),

      explainedPl: convertToDisplayCcy(explainedPlUsd),
      unexplainedPl: convertToDisplayCcy(unexplainedPlUsd),
    };
  };

  // Process rows with PDF explain calculations
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
        const pvUsd = t.markToMarket || 0;

        const explain = computeTradePnlExplain(t);

        return {
          trade: t,
          tradeId: t.tradeId,
          productType: prod,
          counterpartyName: t.counterpartyName,
          status: t.status,
          origCcy,
          notionalUsd: notionalBaseUsd,
          notionalConverted: convertToDisplayCcy(notionalBaseUsd),
          pvUsd,
          pvConverted: convertToDisplayCcy(pvUsd),
          explain,
        };
      });
  }, [trades, displayCurrency, selectedProductFilter, selectedStatusFilter, shiftBps, shiftFxPct]);

  // Aggregate Portfolio Totals
  const portfolioSummary = useMemo(() => {
    const totalActualPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.actualPl, 0);
    const totalIrDeltaPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.irDeltaPl, 0);
    const totalFxDeltaPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.fxDeltaPl, 0);
    const totalCurveResidualPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.revalCurveResidualPl, 0);
    const totalExplainedPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.explainedPl, 0);
    const totalUnexplainedPl = pnlTradeRows.reduce((acc, r) => acc + r.explain.unexplainedPl, 0);

    return {
      totalActualPl,
      totalIrDeltaPl,
      totalFxDeltaPl,
      totalCurveResidualPl,
      totalExplainedPl,
      totalUnexplainedPl,
    };
  }, [pnlTradeRows]);

  // Chart Data for PnL Breakdown by Product
  const pnlByProductData = useMemo(() => {
    const map: Record<string, { product: string; actualPl: number; irDeltaPl: number; curveResidualPl: number }> = {};
    pnlTradeRows.forEach((r) => {
      if (!map[r.productType]) {
        map[r.productType] = { product: r.productType, actualPl: 0, irDeltaPl: 0, curveResidualPl: 0 };
      }
      map[r.productType].actualPl += r.explain.actualPl;
      map[r.productType].irDeltaPl += r.explain.irDeltaPl;
      map[r.productType].curveResidualPl += r.explain.revalCurveResidualPl;
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
                  Enterprise Rates & FX PnL Attribution Engine
                  <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-800 font-sans font-bold">
                    25-Bucket PDF Specification
                  </span>
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Full multi-factor PnL explain framework decomposing Actual PnL into Trading, IR, FX, Volatility, and Residual buckets.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 bg-[#141926] border border-gray-700 rounded-xl px-3 py-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-400 text-[11px]">Reporting Ccy:</span>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="USD" className="bg-[#0f172a]">USD ($)</option>
                <option value="EUR" className="bg-[#0f172a]">EUR (€)</option>
                <option value="GBP" className="bg-[#0f172a]">GBP (£)</option>
                <option value="JPY" className="bg-[#0f172a]">JPY (¥)</option>
                <option value="CAD" className="bg-[#0f172a]">CAD (CA$)</option>
                <option value="AUD" className="bg-[#0f172a]">AUD (A$)</option>
                <option value="CHF" className="bg-[#0f172a]">CHF (CHF)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Re-evaluating...' : 'Re-run PnL Explain'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Shock Sliders */}
        <div className="pt-3 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Product Filter */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Product Filter</label>
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
              <label className="text-[10px] text-gray-400 uppercase font-bold">Curve Move (bps)</label>
              <span className="text-emerald-400 font-bold">+{shiftBps} bps</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              value={shiftBps}
              onChange={(e) => setShiftBps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* FX Shift Input (%) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">FX Spot Shift (%)</label>
              <span className="text-indigo-400 font-bold">+{shiftFxPct}%</span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={shiftFxPct}
              onChange={(e) => setShiftFxPct(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Actual PnL */}
        <div className="bg-[#0d111a] border border-emerald-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Actual PnL
            </span>
            <span className="text-[10px] text-emerald-400">T0_Closing - T0_Opening</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalActualPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalActualPl.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Ground Truth Net Market Revaluation
          </div>
        </div>

        {/* IR Delta PnL */}
        <div className="bg-[#0d111a] border border-blue-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" /> IRDeltaPL
            </span>
            <span className="text-[10px] text-blue-400">DV01 × ΔRate</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalIrDeltaPl >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalIrDeltaPl.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Primary Interest Rate Sensitivity PnL
          </div>
        </div>

        {/* Reval Curve Residual PnL */}
        <div className="bg-[#0d111a] border border-amber-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-400" /> RevalCurveResidualPL
            </span>
            <span className="text-[10px] text-amber-400">Convexity / Gamma</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalCurveResidualPl >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {currSymbol}{portfolioSummary.totalCurveResidualPl.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Yield Curve Convexity & Non-Linearity
          </div>
        </div>

        {/* Unexplained PnL */}
        <div className="bg-[#0d111a] border border-purple-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> UnexplainedPL
            </span>
            <span className="text-[10px] text-purple-300">Reconciliation</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioSummary.totalUnexplainedPl === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {currSymbol}{portfolioSummary.totalUnexplainedPl.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-sans flex justify-between">
            <span>Explained: {currSymbol}{portfolioSummary.totalExplainedPl.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PnL BREAKDOWN CHART BY PRODUCT */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" /> Product-wise Actual PnL vs IR Delta vs Curve Residual ({displayCurrency})
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Comparison of ground truth Actual PnL against IR Delta PnL and Curve Convexity across trade classes.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Actual PnL
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span> IR Delta PnL
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 bg-amber-500 rounded-sm"></span> Curve Residual PnL
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
                      <div className="bg-[#0f172a] border border-emerald-500/80 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5">
                        <div className="font-bold text-white border-b border-gray-800 pb-1">{label} PnL Attribution</div>
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
              <Bar dataKey="actualPl" name="Actual PnL" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="irDeltaPl" name="IR Delta PnL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="curveResidualPl" name="Curve Residual PnL" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SUMMARY TRADE TABLE WITH CLICKABLE VIEW ITEM */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-2xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Trade-Wise High-Level PnL Summary ({pnlTradeRows.length} Trades)
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Click on any trade row or the <strong className="text-emerald-400">"View 25 PnL Buckets"</strong> item to inspect full bank attribution parameters.
            </p>
          </div>

          <span className="px-3 py-1 bg-emerald-950 text-emerald-300 rounded-lg border border-emerald-800 text-xs font-bold">
            Total Actual PnL: {currSymbol}{portfolioSummary.totalActualPl.toLocaleString()}
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
                <th className="py-2.5 px-3 text-right text-gray-400">T0 Opening NPV</th>
                <th className="py-2.5 px-3 text-right text-white">T0 Closing NPV</th>
                <th className="py-2.5 px-3 text-right text-emerald-400 font-extrabold bg-emerald-950/30">Actual PnL</th>
                <th className="py-2.5 px-3 text-right text-blue-400">IR Delta PnL</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Curve Residual</th>
                <th className="py-2.5 px-3 text-center">Full 25-Bucket Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {pnlTradeRows.map((r) => (
                <tr
                  key={r.tradeId}
                  onClick={() => setSelectedTradeModal(r.trade)}
                  className="hover:bg-indigo-950/40 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    {r.tradeId}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {r.productType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 truncate max-w-[140px]">{r.counterpartyName}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{currSymbol}{r.notionalConverted.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-400">{currSymbol}{r.explain.t0OpeningNpv.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-white font-bold">{currSymbol}{r.explain.t0ClosingNpv.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right font-extrabold bg-emerald-950/30 ${r.explain.actualPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.explain.actualPl >= 0 ? '+' : ''}{currSymbol}{r.explain.actualPl.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-400">{currSymbol}{r.explain.irDeltaPl.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">{currSymbol}{r.explain.revalCurveResidualPl.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTradeModal(r.trade);
                      }}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer shadow"
                    >
                      <Eye className="w-3 h-3 text-emerald-400" /> View 25 PnL Buckets
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLICKABLE MODAL: FULL 25 BANK PnL EXPLAIN PARAMETERS INSPECTOR */}
      {selectedTradeModal && (() => {
        const explain = computeTradePnlExplain(selectedTradeModal);
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
            <div className="bg-[#0f172a] border border-emerald-800/80 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto font-mono scrollbar-thin">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-950 border border-emerald-700/80 rounded-xl text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                      Full PnL Explain Specification: <span className="text-emerald-400">{selectedTradeModal.tradeId}</span>
                      <span className="px-2 py-0.5 text-[9px] bg-indigo-950 text-indigo-300 rounded border border-indigo-800">
                        {selectedTradeModal.productType}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      Counterparty: <strong>{selectedTradeModal.counterpartyName}</strong> | Reporting Currency: <strong>{displayCurrency} ({currSymbol})</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTradeModal(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 25-BUCKET ATTRIBUTION TABLE SPECIFICATION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 font-sans font-bold text-slate-300">
                  <span className="uppercase tracking-wider flex items-center gap-2">
                    <Layers3 className="w-4 h-4 text-emerald-400" /> Full 25 Bank PnL Attribution Parameter Breakdown
                  </span>
                  <span className="text-emerald-400 font-mono text-xs">
                    Actual PnL: {currSymbol}{explain.actualPl.toLocaleString()}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#141824] text-slate-400 uppercase text-[9px] border-b border-slate-800">
                        <th className="py-2.5 px-3">P&L Attribution Bucket / Field</th>
                        <th className="py-2.5 px-3">Calculation Logic / Scenario</th>
                        <th className="py-2.5 px-3 text-right">P&L Value ({displayCurrency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {/* Section 1: Valuation Numbers */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-emerald-400">1. Valuation Baseline Numbers</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300 font-bold">T-1_NPVNoCash</td>
                        <td className="py-2 px-3 text-slate-400">Previous close NPV excluding cash movements</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-300">{currSymbol}{explain.tMinus1NpvNoCash.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300 font-bold">T0_Opening_NPV</td>
                        <td className="py-2 px-3 text-slate-400">Opening NPV at start of trading day</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-300">{currSymbol}{explain.t0OpeningNpv.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300 font-bold">T0_Closing_NPV</td>
                        <td className="py-2 px-3 text-slate-400">End-of-day revaluation using today's market data</td>
                        <td className="py-2 px-3 text-right font-bold text-white">{currSymbol}{explain.t0ClosingNpv.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-emerald-950/40 font-bold text-emerald-300">
                        <td className="py-2.5 px-3">ActualPL</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-sans">Ground truth PnL explain must reconcile to (Closing - Opening + Cash)</td>
                        <td className="py-2.5 px-3 text-right font-extrabold">{currSymbol}{explain.actualPl.toLocaleString()}</td>
                      </tr>

                      {/* Section 2: Trading Activity */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-indigo-400">2. Trading Activity Buckets</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-indigo-300 font-bold">NewTradesPL</td>
                        <td className="py-2 px-3 text-slate-400">Day-one PnL / execution margin on new trade booking</td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-300">{currSymbol}{explain.newTradesPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-indigo-300 font-bold">AmendTradesPL</td>
                        <td className="py-2 px-3 text-slate-400">NPV change caused solely by modifying trade terms</td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-300">{currSymbol}{explain.amendTradesPl.toLocaleString()}</td>
                      </tr>

                      {/* Section 3: IR Risk Buckets */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-blue-400">3. Interest Rate Risk Buckets</td>
                      </tr>
                      <tr className="bg-blue-950/30">
                        <td className="py-2 px-3 text-blue-300 font-bold">IRDeltaPL</td>
                        <td className="py-2 px-3 text-slate-400">Primary curve sensitivity PnL (DV01 × ΔRate)</td>
                        <td className="py-2 px-3 text-right font-bold text-blue-300">{currSymbol}{explain.irDeltaPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRBasisDeltaNormalConstraintPL</td>
                        <td className="py-2 px-3 text-slate-400">Projection vs reference curve basis sensitivity PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irBasisDeltaNormalConstraintPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRDiscountBasisDeltaNormalConstraintPL</td>
                        <td className="py-2 px-3 text-slate-400">OIS discounting curve basis move sensitivity PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irDiscountBasisDeltaNormalConstraintPl.toLocaleString()}</td>
                      </tr>

                      {/* Section 4: IR Volatility Buckets */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-amber-400">4. Interest Rate Volatility Buckets (Options & Exotics)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-300 font-bold">IRATMBpVegaPL</td>
                        <td className="py-2 px-3 text-slate-400">ATM basis point Vega volatility move PnL</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">{currSymbol}{explain.irAtmBpVegaPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRVolBetaNormalConstraintPL</td>
                        <td className="py-2 px-3 text-slate-400">SABR beta volatility surface parameter move PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irVolBetaNormalConstraintPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRVolNuNormalConstraintPL</td>
                        <td className="py-2 px-3 text-slate-400">SABR vol-of-vol / smile curvature parameter move PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irVolNuNormalConstraintPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRVolRhoNormalConstraintPL</td>
                        <td className="py-2 px-3 text-slate-400">SABR correlation parameter move PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irVolRhoNormalConstraintPl.toLocaleString()}</td>
                      </tr>

                      {/* Section 5: FX Risk Buckets */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-purple-400">5. FX Risk & Volatility Buckets</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-purple-300 font-bold">FXDeltaPL</td>
                        <td className="py-2 px-3 text-slate-400">First-order FX spot rate movement PnL</td>
                        <td className="py-2 px-3 text-right font-bold text-purple-300">{currSymbol}{explain.fxDeltaPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">FXVegaPL</td>
                        <td className="py-2 px-3 text-slate-400">First-order FX volatility movement PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.fxVegaPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">FXSegaPL</td>
                        <td className="py-2 px-3 text-slate-400">FX volatility smile / skew parameter move PnL</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.fxSegaPl.toLocaleString()}</td>
                      </tr>

                      {/* Section 6: Revaluation Residuals & Time */}
                      <tr className="bg-slate-900/60 font-bold text-slate-300">
                        <td colSpan={3} className="py-2 px-3 text-[10px] uppercase tracking-wider text-emerald-400">6. Revaluation Residuals & Reconciliation</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">IRResetPL</td>
                        <td className="py-2 px-3 text-slate-400">Floating rate fixing publication cashflow impact</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.irResetPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">ThetaPL</td>
                        <td className="py-2 px-3 text-slate-400">Time decay PnL from one calendar day passage</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.thetaPl.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-amber-950/20">
                        <td className="py-2 px-3 text-amber-300 font-bold">RevalCurveResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">Convexity / Gamma non-linear curve revaluation residual</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">{currSymbol}{explain.revalCurveResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">RevalIRCrossResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">Multi-curve / cross-tenor rate interaction residual</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.revalIRCrossResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">RevalFXSpotResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">Non-linear FX spot revaluation residual</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.revalFXSpotResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">RevalFXVolResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">Remaining FX volatility revaluation residual</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.revalFXVolResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">RevalFXCrossResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">FX × Interest Rate cross-gamma effect</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.revalFXCrossResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-300">RevalVolResidualPL</td>
                        <td className="py-2 px-3 text-slate-400">Remaining IR volatility surface revaluation residual</td>
                        <td className="py-2 px-3 text-right text-slate-300">{currSymbol}{explain.revalVolResidualPl.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-emerald-950/60 font-bold text-emerald-300 border-t-2 border-slate-700">
                        <td className="py-2.5 px-3">UnexplainedPL</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-sans">Final reconciliation error (ActualPL - ∑ ExplainedPL)</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">{currSymbol}{explain.unexplainedPl.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-400 font-sans">
                <span>Calculated per PDF Bank PnL Explain Specification</span>
                <button
                  onClick={() => setSelectedTradeModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
