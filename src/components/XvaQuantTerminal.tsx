import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, Activity, DollarSign, TrendingDown, Layers, Sliders, RefreshCw,
  Building2, Lock, ArrowUpRight, ArrowDownRight, Info, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Currency } from '../types';

interface NettingSet {
  id: string;
  counterparty: string;
  rating: string;
  csaType: 'ISDA_CSA_ONE_WAY' | 'ISDA_CSA_TWO_WAY' | 'UNCOLLATERALIZED';
  currency: Currency;
  threshold: number; // in Millions
  mta: number; // Minimum Transfer Amount in Thousands
  collateralType: string;
  tradeCount: number;
  grossNotional: number; // in Millions
  baseCva: number;
  baseDva: number;
  baseFva: number;
  baseKva: number;
  cdsSpreadBps: number;
}

const INITIAL_NETTING_SETS: NettingSet[] = [
  {
    id: 'NS-GS-01',
    counterparty: 'Goldman Sachs International',
    rating: 'A1 / A+',
    csaType: 'ISDA_CSA_TWO_WAY',
    currency: 'USD',
    threshold: 0,
    mta: 50,
    collateralType: 'Cash (USD SOFR + 5bps)',
    tradeCount: 14,
    grossNotional: 450,
    baseCva: 342500,
    baseDva: 185000,
    baseFva: 124000,
    baseKva: 88000,
    cdsSpreadBps: 45,
  },
  {
    id: 'NS-JPM-02',
    counterparty: 'JPMorgan Chase Bank N.A.',
    rating: 'Aa2 / AA-',
    csaType: 'ISDA_CSA_TWO_WAY',
    currency: 'USD',
    threshold: 0,
    mta: 50,
    collateralType: 'Cash (USD SOFR)',
    tradeCount: 22,
    grossNotional: 780,
    baseCva: 512000,
    baseDva: 310000,
    baseFva: 195000,
    baseKva: 142000,
    cdsSpreadBps: 38,
  },
  {
    id: 'NS-BARC-03',
    counterparty: 'Barclays Bank PLC',
    rating: 'A2 / A',
    csaType: 'ISDA_CSA_TWO_WAY',
    currency: 'GBP',
    threshold: 1.0,
    mta: 100,
    collateralType: 'GBP Cash / UK Gilts',
    tradeCount: 9,
    grossNotional: 320,
    baseCva: 289000,
    baseDva: 165000,
    baseFva: 110000,
    baseKva: 76000,
    cdsSpreadBps: 58,
  },
  {
    id: 'NS-BNP-04',
    counterparty: 'BNP Paribas S.A.',
    rating: 'Aa3 / A+',
    csaType: 'ISDA_CSA_TWO_WAY',
    currency: 'EUR',
    threshold: 0,
    mta: 50,
    collateralType: 'EUR Cash (€STR)',
    tradeCount: 18,
    grossNotional: 620,
    baseCva: 418000,
    baseDva: 245000,
    baseFva: 162000,
    baseKva: 115000,
    cdsSpreadBps: 42,
  },
  {
    id: 'NS-CITI-05',
    counterparty: 'Citigroup Global Markets',
    rating: 'A3 / A-',
    csaType: 'UNCOLLATERALIZED',
    currency: 'USD',
    threshold: 10.0,
    mta: 250,
    collateralType: 'None (Uncollateralized)',
    tradeCount: 5,
    grossNotional: 150,
    baseCva: 890000,
    baseDva: 140000,
    baseFva: 310000,
    baseKva: 220000,
    cdsSpreadBps: 85,
  },
];

export const XvaQuantTerminal: React.FC = () => {
  const [selectedNsId, setSelectedNsId] = useState<string>('NS-GS-01');
  const [cdsShiftBps, setCdsShiftBps] = useState<number>(0);
  const [fundingSpreadShiftBps, setFundingSpreadShiftBps] = useState<number>(0);
  const [recoveryRate, setRecoveryRate] = useState<number>(40); // 40%
  const [csaThresholdOverride, setCsaThresholdOverride] = useState<number>(0);

  const activeNs = useMemo(() => {
    return INITIAL_NETTING_SETS.find((ns) => ns.id === selectedNsId) || INITIAL_NETTING_SETS[0];
  }, [selectedNsId]);

  const currencySymbol = useMemo(() => {
    switch (activeNs.currency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      case 'CHF': return 'CHF ';
      default: return '$';
    }
  }, [activeNs.currency]);

  // Dynamic XVA recalculations under stress parameters
  const calculatedXva = useMemo(() => {
    const totalCds = Math.max(5, activeNs.cdsSpreadBps + cdsShiftBps);
    const cdsMultiplier = totalCds / activeNs.cdsSpreadBps;
    const lossGivenDefault = (100 - recoveryRate) / 60; // relative to 40% recovery standard

    // Uncollateralized multiplier
    const uncollatFactor = activeNs.csaType === 'UNCOLLATERALIZED' ? 1.8 : (1 + csaThresholdOverride * 0.15);

    const adjustedCva = Math.round(activeNs.baseCva * cdsMultiplier * lossGivenDefault * uncollatFactor);
    const adjustedDva = Math.round(activeNs.baseDva * (1 + fundingSpreadShiftBps / 100));
    const adjustedFva = Math.round(activeNs.baseFva * (1 + fundingSpreadShiftBps / 100) * uncollatFactor);
    const adjustedKva = Math.round(activeNs.baseKva * (1 + cdsShiftBps / 200));

    const totalXva = adjustedCva - adjustedDva + adjustedFva + adjustedKva;

    return {
      cva: adjustedCva,
      dva: adjustedDva,
      fva: adjustedFva,
      kva: adjustedKva,
      totalXva,
      cdsMultiplier,
      effectiveCds: totalCds,
    };
  }, [activeNs, cdsShiftBps, fundingSpreadShiftBps, recoveryRate, csaThresholdOverride]);

  // Generate 30Y Simulated Exposure Profile Data (EE, EPE, PFE 95%)
  const exposurePoints = useMemo(() => {
    const years = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
    const peakNotional = activeNs.grossNotional * 0.12; // Exposure peak ~12% of gross

    return years.map((y) => {
      // Brownian bridge diffusion profile + amortization decay
      const diffusion = Math.sqrt(y) * Math.exp(-y / 12);
      const isUncollat = activeNs.csaType === 'UNCOLLATERALIZED';
      const collatFactor = isUncollat ? 1.0 : 0.22; // 78% exposure reduction under CSA

      const ee = Math.round(peakNotional * diffusion * collatFactor * 100) / 100;
      const pfe95 = Math.round(ee * 2.45 * 100) / 100;
      const epe = Math.round(ee * 0.72 * 100) / 100;

      return { year: y, ee, pfe95, epe };
    });
  }, [activeNs]);

  const maxExposure = Math.max(...exposurePoints.map((p) => p.pfe95)) * 1.15;

  return (
    <div id="xva-quant-terminal-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Top Banner & Header */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0284c7]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#0284c7]/20 text-[#0284c7] rounded-lg border border-[#0284c7]/30">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                XVA Quantitative Analytics Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0284c7]/10 border border-[#0284c7]/30 text-[#0284c7]">
                ISDA SIMM & CVA DESK v4.2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Counterparty Credit Valuation Adjustment (CVA), Debit (DVA), Funding (FVA), and Capital (KVA) with 30Y PFE & EE Profile Modeling.
            </p>
          </div>

          {/* Quick Counterparty Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Netting Set:</span>
            <select
              id="netting-set-selector"
              value={selectedNsId}
              onChange={(e) => setSelectedNsId(e.target.value)}
              className="bg-[#0f172a] text-white border border-[#334155] rounded-lg px-3 py-2 text-xs font-semibold focus:border-[#0284c7] focus:outline-none cursor-pointer"
            >
              {INITIAL_NETTING_SETS.map((ns) => (
                <option key={ns.id} value={ns.id}>
                  {ns.counterparty} ({ns.id} - {ns.currency})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Net XVA Adjustment */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Net XVA Adjustment</span>
            <Layers className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-white">
              {currencySymbol}{calculatedXva.totalXva.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Gross Notional:</span>
              <strong className="text-slate-200 font-mono">{currencySymbol}{activeNs.grossNotional}M</strong>
            </div>
          </div>
        </div>

        {/* CVA (Credit Valuation Adjustment) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">CVA (Counterparty Credit)</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-red-400">
              {currencySymbol}{calculatedXva.cva.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Effective CDS:</span>
              <strong className="text-slate-200 font-mono">{calculatedXva.effectiveCds} bps</strong>
            </div>
          </div>
        </div>

        {/* DVA (Debit Valuation Adjustment) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">DVA (Own Credit Benefit)</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-emerald-400">
              -{currencySymbol}{calculatedXva.dva.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Own Credit Spread:</span>
              <strong className="text-slate-200 font-mono">35 bps</strong>
            </div>
          </div>
        </div>

        {/* FVA (Funding Valuation Adjustment) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">FVA (Funding Cost)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-amber-400">
              {currencySymbol}{calculatedXva.fva.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Funding Spread:</span>
              <strong className="text-slate-200 font-mono">{(25 + fundingSpreadShiftBps)} bps</strong>
            </div>
          </div>
        </div>

        {/* KVA (Capital Valuation Adjustment) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">KVA (Regulatory Capital)</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-purple-400">
              {currencySymbol}{calculatedXva.kva.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Hurdle Rate:</span>
              <strong className="text-slate-200 font-mono">10.5% p.a.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Exposure Profile Graph & Stress Scenario Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: 30Y Simulated Exposure Profile Graph (EE / PFE 95%) */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0284c7]" />
              <h3 className="text-sm font-bold text-white">
                30Y Counterparty Exposure Profile (PFE 95% & EE)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 rounded" />
                <span className="text-slate-300">PFE 95% ({currencySymbol}M)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#0284c7] rounded" />
                <span className="text-slate-300">EE ({currencySymbol}M)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 rounded" />
                <span className="text-slate-300">EPE ({currencySymbol}M)</span>
              </div>
            </div>
          </div>

          {/* SVG Canvas Graph */}
          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 h-64 relative flex flex-col justify-between">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
              
              {/* Grid Lines */}
              {[0, 45, 90, 135, 180].map((yVal, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={yVal}
                  x2="500"
                  y2={yVal}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              ))}

              {/* Area under PFE 95% */}
              <polygon
                points={`0,180 ${exposurePoints.map((p, idx) => `${(idx / (exposurePoints.length - 1)) * 500},${180 - (p.pfe95 / maxExposure) * 160}`).join(' ')} 500,180`}
                fill="url(#pfeGradient)"
                opacity="0.15"
              />

              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="pfeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Line: PFE 95% */}
              <polyline
                fill="none"
                stroke="#f87171"
                strokeWidth="2.5"
                points={exposurePoints.map((p, idx) => `${(idx / (exposurePoints.length - 1)) * 500},${180 - (p.pfe95 / maxExposure) * 160}`).join(' ')}
              />

              {/* Line: Expected Exposure (EE) */}
              <polyline
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                points={exposurePoints.map((p, idx) => `${(idx / (exposurePoints.length - 1)) * 500},${180 - (p.ee / maxExposure) * 160}`).join(' ')}
              />

              {/* Line: Expected Positive Exposure (EPE) */}
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                points={exposurePoints.map((p, idx) => `${(idx / (exposurePoints.length - 1)) * 500},${180 - (p.epe / maxExposure) * 160}`).join(' ')}
              />

              {/* Data Points */}
              {exposurePoints.map((p, idx) => {
                const cx = (idx / (exposurePoints.length - 1)) * 500;
                const cyPfe = 180 - (p.pfe95 / maxExposure) * 160;
                const cyEe = 180 - (p.ee / maxExposure) * 160;
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cyPfe} r="3" fill="#f87171" />
                    <circle cx={cx} cy={cyEe} r="3" fill="#0284c7" />
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels (Tenors) */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 border-t border-[#334155] pt-1">
              {exposurePoints.map((p) => (
                <span key={p.year}>{p.year}Y</span>
              ))}
            </div>
          </div>

          {/* Exposure Summary Footer */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
              <span className="text-slate-400 block text-[11px]">Peak 95% PFE Exposure</span>
              <strong className="text-red-400 font-mono text-sm mt-0.5 block">
                {currencySymbol}{Math.max(...exposurePoints.map((p) => p.pfe95)).toFixed(2)}M
              </strong>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
              <span className="text-slate-400 block text-[11px]">Average Expected Exposure (EE)</span>
              <strong className="text-[#0284c7] font-mono text-sm mt-0.5 block">
                {currencySymbol}{(exposurePoints.reduce((acc, p) => acc + p.ee, 0) / exposurePoints.length).toFixed(2)}M
              </strong>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
              <span className="text-slate-400 block text-[11px]">Collateral Mitigation Impact</span>
              <strong className="text-emerald-400 font-mono text-sm mt-0.5 block">
                {activeNs.csaType === 'UNCOLLATERALIZED' ? '0% (Uncollateralized)' : '-78.4% Exposure Reduction'}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Col: Stress Testing & CSA Parameter Controls */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#334155] pb-3">
              <Sliders className="w-4 h-4 text-[#0284c7]" />
              <h3 className="text-sm font-bold text-white">Credit & Funding Stress Sliders</h3>
            </div>

            {/* Slider 1: Counterparty CDS Spread Shift */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">CDS Spread Shock:</span>
                <span className="font-mono text-[#0284c7] font-bold">
                  {cdsShiftBps >= 0 ? `+${cdsShiftBps}` : cdsShiftBps} bps
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="250"
                step="5"
                value={cdsShiftBps}
                onChange={(e) => setCdsShiftBps(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#0284c7]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-20 bps</span>
                <span>+100 bps</span>
                <span>+250 bps</span>
              </div>
            </div>

            {/* Slider 2: Bank Funding Spread Shift */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Bank Funding Spread Shift:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {fundingSpreadShiftBps >= 0 ? `+${fundingSpreadShiftBps}` : fundingSpreadShiftBps} bps
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="100"
                step="5"
                value={fundingSpreadShiftBps}
                onChange={(e) => setFundingSpreadShiftBps(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-10 bps</span>
                <span>+45 bps</span>
                <span>+100 bps</span>
              </div>
            </div>

            {/* Slider 3: Recovery Rate Assumption */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Recovery Rate (R):</span>
                <span className="font-mono text-emerald-400 font-bold">{recoveryRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                step="5"
                value={recoveryRate}
                onChange={(e) => setRecoveryRate(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>10% (Distressed)</span>
                <span>40% (Standard)</span>
                <span>70% (Senior)</span>
              </div>
            </div>

            {/* CSA Threshold Slider */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Uncollateralized Threshold:</span>
                <span className="font-mono text-purple-400 font-bold">{currencySymbol}{csaThresholdOverride}M</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={csaThresholdOverride}
                onChange={(e) => setCsaThresholdOverride(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>

          {/* Reset Controls Button */}
          <button
            onClick={() => {
              setCdsShiftBps(0);
              setFundingSpreadShiftBps(0);
              setRecoveryRate(40);
              setCsaThresholdOverride(0);
            }}
            className="w-full py-2 bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] text-xs font-semibold text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Stress Shocks
          </button>
        </div>
      </div>

      {/* Netting Sets Breakdown Table */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0284c7]" />
            <h3 className="text-sm font-bold text-white">Active Counterparty Netting Sets</h3>
          </div>
          <span className="text-xs text-slate-400">Showing {INITIAL_NETTING_SETS.length} onboarded netting sets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#334155] text-slate-400 font-semibold bg-[#0f172a]/60">
                <th className="py-3 px-3">Netting Set ID</th>
                <th className="py-3 px-3">Counterparty Name</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">CSA Type</th>
                <th className="py-3 px-3 text-right">Gross Notional</th>
                <th className="py-3 px-3 text-right">CVA</th>
                <th className="py-3 px-3 text-right">DVA</th>
                <th className="py-3 px-3 text-right">FVA</th>
                <th className="py-3 px-3 text-right">KVA</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {INITIAL_NETTING_SETS.map((ns) => {
                const isSelected = ns.id === selectedNsId;
                const sym = ns.currency === 'EUR' ? '€' : ns.currency === 'GBP' ? '£' : '$';
                return (
                  <tr
                    key={ns.id}
                    className={`hover:bg-[#1f293d]/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#0284c7]/10 border-l-2 border-l-[#0284c7]' : ''
                    }`}
                    onClick={() => setSelectedNsId(ns.id)}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">{ns.id}</td>
                    <td className="py-3 px-3 font-medium text-white">{ns.counterparty}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0f172a] border border-[#334155] text-slate-300">
                        {ns.rating}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{ns.csaType.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">{sym}{ns.grossNotional}M</td>
                    <td className="py-3 px-3 text-right font-mono text-red-400">{sym}{ns.baseCva.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">-{sym}{ns.baseDva.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">{sym}{ns.baseFva.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-400">{sym}{ns.baseKva.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNsId(ns.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#0284c7] text-white hover:bg-[#0369a1] transition-colors"
                      >
                        Inspect
                      </button>
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
