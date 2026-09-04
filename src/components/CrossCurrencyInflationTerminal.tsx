import React, { useState, useMemo } from 'react';
import {
  TrendingUp, RefreshCw, DollarSign, Activity, Layers, Calendar, ArrowRightLeft,
  CheckCircle2, Percent, Globe2, Sparkles, Sliders
} from 'lucide-react';
import { Currency, FloatingIndex } from '../types';

export const CrossCurrencyInflationTerminal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'XCCY' | 'INFLATION'>('XCCY');

  // XCCY State
  const [domesticCcy, setDomesticCcy] = useState<Currency>('USD');
  const [foreignCcy, setForeignCcy] = useState<Currency>('EUR');
  const [xccyNotionalMillions, setXccyNotionalMillions] = useState<number>(100);
  const [tenorYears, setTenorYears] = useState<number>(5);
  const [basisSpreadBps, setBasisSpreadBps] = useState<number>(-12.5); // e.g. -12.5 bps EUR/USD basis
  const [domesticOisRate, setDomesticOisRate] = useState<number>(4.85); // %
  const [foreignOisRate, setForeignOisRate] = useState<number>(3.25); // %

  // Inflation State
  const [inflationIndex, setInflationIndex] = useState<'US_CPI' | 'EUR_HICP' | 'UK_RPI'>('US_CPI');
  const [inflationType, setInflationType] = useState<'ZERO_COUPON' | 'YEAR_ON_YEAR'>('ZERO_COUPON');
  const [inflationNotionalMillions, setInflationNotionalMillions] = useState<number>(50);
  const [inflationTenorYears, setInflationTenorYears] = useState<number>(10);
  const [breakevenInflationRate, setBreakevenInflationRate] = useState<number>(2.35); // %
  const [seasonalityShiftBps, setSeasonalityShiftBps] = useState<number>(15);

  // FX Spot reference
  const fxSpot = useMemo(() => {
    if (domesticCcy === 'USD' && foreignCcy === 'EUR') return 1.0850;
    if (domesticCcy === 'USD' && foreignCcy === 'GBP') return 1.2820;
    if (domesticCcy === 'USD' && foreignCcy === 'JPY') return 145.50;
    if (domesticCcy === 'USD' && foreignCcy === 'CAD') return 1.3550;
    return 1.0;
  }, [domesticCcy, foreignCcy]);

  // XCCY Calculations
  const calculatedXccy = useMemo(() => {
    const domesticNotional = xccyNotionalMillions * 1000000;
    const foreignNotional = (xccyNotionalMillions * 1000000) / (foreignCcy === 'JPY' ? (1 / fxSpot) : fxSpot);
    
    const domesticLegPayment = domesticNotional * (domesticOisRate / 100) * tenorYears;
    const foreignLegPayment = foreignNotional * ((foreignOisRate + basisSpreadBps / 100) / 100) * tenorYears;
    const netNpvAdjustment = (basisSpreadBps * tenorYears * domesticNotional * 0.000095);

    return {
      domesticNotional,
      foreignNotional,
      domesticLegPayment,
      foreignLegPayment,
      netNpvAdjustment,
    };
  }, [xccyNotionalMillions, tenorYears, basisSpreadBps, domesticOisRate, foreignOisRate, foreignCcy, fxSpot]);

  // Inflation Calculations
  const calculatedInflation = useMemo(() => {
    const baseNotional = inflationNotionalMillions * 1000000;
    const indexLagMonths = 3;
    const baseCpi = inflationIndex === 'US_CPI' ? 314.5 : inflationIndex === 'EUR_HICP' ? 124.8 : 378.2;
    
    const compoundedRate = Math.pow(1 + (breakevenInflationRate + seasonalityShiftBps / 100) / 100, inflationTenorYears) - 1;
    const projectedFinalCpi = baseCpi * (1 + compoundedRate);
    const inflationPayoffAmount = baseNotional * compoundedRate;

    return {
      baseCpi,
      projectedFinalCpi,
      compoundedRate: (compoundedRate * 100).toFixed(3),
      inflationPayoffAmount,
      indexLagMonths,
    };
  }, [inflationNotionalMillions, inflationTenorYears, breakevenInflationRate, seasonalityShiftBps, inflationIndex]);

  return (
    <div id="xccy-inflation-terminal-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Top Banner & Sub-tab Mode Switch */}
      <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#2563eb]/20 text-[#2563eb] rounded-lg border border-[#2563eb]/30">
                <TrendingUp className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Cross-Currency Basis & Inflation Swaps Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]">
                MULTI-CURRENCY DUAL BOOTSTRAPPING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pricing, FX Basis Curve Bootstrapping, and Zero-Coupon / YoY Inflation Swap Cashflows (CPI / HICP / RPI).
            </p>
          </div>

          {/* Sub-tab Toggle */}
          <div className="flex items-center gap-2 bg-[#0b0f19] border border-[#232d42] p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('XCCY')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'XCCY'
                  ? 'bg-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cross-Currency Basis Swap
            </button>
            <button
              onClick={() => setActiveSubTab('INFLATION')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'INFLATION'
                  ? 'bg-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inflation Swap (CPI / HICP)
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab 1: Cross-Currency Basis Swap Terminal */}
      {activeSubTab === 'XCCY' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* XCCY Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Domestic Notional ({domesticCcy})</span>
              <div className="mt-2 text-xl font-bold font-mono text-white">
                ${calculatedXccy.domesticNotional.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Foreign Notional ({foreignCcy})</span>
              <div className="mt-2 text-xl font-bold font-mono text-white">
                {foreignCcy === 'EUR' ? '€' : foreignCcy === 'GBP' ? '£' : '¥'}
                {calculatedXccy.foreignNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">XCCY Basis Spread</span>
              <div className="mt-2 text-xl font-bold font-mono text-amber-400">
                {basisSpreadBps >= 0 ? `+${basisSpreadBps}` : basisSpreadBps} bps
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Estimated Net NPV Impact</span>
              <div className="mt-2 text-xl font-bold font-mono text-[#2563eb]">
                ${calculatedXccy.netNpvAdjustment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Interactive Input Panel & Leg Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: XCCY Parameter Controls */}
            <div className="lg:col-span-2 bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-[#232d42] pb-3">
                <Globe2 className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-bold text-white">Cross-Currency Swap Parameters</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domestic Currency */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Domestic Currency (Leg 1):</label>
                  <select
                    value={domesticCcy}
                    onChange={(e) => setDomesticCcy(e.target.value as Currency)}
                    className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value="USD">USD - SOFR OIS</option>
                  </select>
                </div>

                {/* Foreign Currency */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Foreign Currency (Leg 2):</label>
                  <select
                    value={foreignCcy}
                    onChange={(e) => setForeignCcy(e.target.value as Currency)}
                    className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value="EUR">EUR - €STR / EURIBOR</option>
                    <option value="GBP">GBP - SONIA</option>
                    <option value="JPY">JPY - TONA</option>
                    <option value="CAD">CAD - CORRA</option>
                  </select>
                </div>

                {/* Notional */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Base Notional ($ Millions):</label>
                  <input
                    type="number"
                    value={xccyNotionalMillions}
                    onChange={(e) => setXccyNotionalMillions(Number(e.target.value))}
                    className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>

                {/* Tenor */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Swap Maturity Tenor (Years):</label>
                  <select
                    value={tenorYears}
                    onChange={(e) => setTenorYears(Number(e.target.value))}
                    className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years</option>
                    <option value={3}>3 Years</option>
                    <option value={5}>5 Years</option>
                    <option value={7}>7 Years</option>
                    <option value={10}>10 Years</option>
                    <option value={30}>30 Years</option>
                  </select>
                </div>
              </div>

              {/* Slider for XCCY Basis Spread */}
              <div className="space-y-2 pt-2 border-t border-[#232d42]">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">FX Basis Spread (bps):</span>
                  <span className="font-mono text-amber-400 font-bold">{basisSpreadBps} bps</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="40"
                  step="0.5"
                  value={basisSpreadBps}
                  onChange={(e) => setBasisSpreadBps(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>

            {/* Right Col: Leg Structure Comparison */}
            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-[#232d42] pb-3">
                Leg Cashflow Breakdown
              </h3>

              {/* Leg 1 */}
              <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#232d42] space-y-1">
                <span className="text-[11px] font-bold text-[#2563eb]">LEG 1 (USD SOFR Float)</span>
                <div className="text-xs text-slate-300 font-mono">Notional: ${calculatedXccy.domesticNotional.toLocaleString()}</div>
                <div className="text-xs text-slate-300 font-mono">Benchmark: SOFR + 0 bps</div>
              </div>

              {/* Leg 2 */}
              <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#232d42] space-y-1">
                <span className="text-[11px] font-bold text-amber-400">LEG 2 ({foreignCcy} Float + Basis)</span>
                <div className="text-xs text-slate-300 font-mono">
                  Notional: {foreignCcy === 'EUR' ? '€' : '£'}{calculatedXccy.foreignNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  Benchmark: {foreignCcy} Benchmark {basisSpreadBps >= 0 ? `+ ${basisSpreadBps}` : basisSpreadBps} bps
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Inflation Swap Terminal */}
      {activeSubTab === 'INFLATION' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Inflation Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Inflation Index & Lag</span>
              <div className="mt-2 text-xl font-bold font-mono text-white">
                {inflationIndex} (3M Lag)
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Base Index Level</span>
              <div className="mt-2 text-xl font-bold font-mono text-slate-300">
                {calculatedInflation.baseCpi}
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Projected Final Index Level</span>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
                {calculatedInflation.projectedFinalCpi.toFixed(2)}
              </div>
            </div>

            <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className="text-xs text-slate-400 font-semibold">Compounded Inflation Payoff</span>
              <div className="mt-2 text-xl font-bold font-mono text-[#2563eb]">
                ${calculatedInflation.inflationPayoffAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Controls & Breakdown */}
          <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-white border-b border-[#232d42] pb-3">
              Inflation Swap Calibration & Seasonality Adjustments
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Inflation Index:</label>
                <select
                  value={inflationIndex}
                  onChange={(e) => setInflationIndex(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-semibold"
                >
                  <option value="US_CPI">US CPI-U (Urban Consumers)</option>
                  <option value="EUR_HICP">EUR HICP (Ex-Tobacco)</option>
                  <option value="UK_RPI">UK RPI (Retail Price Index)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Swap Type:</label>
                <select
                  value={inflationType}
                  onChange={(e) => setInflationType(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-semibold"
                >
                  <option value="ZERO_COUPON">Zero-Coupon Inflation Swap (ZCIS)</option>
                  <option value="YEAR_ON_YEAR">Year-on-Year Inflation Swap (YoYIS)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Breakeven Inflation Rate (%):</label>
                <input
                  type="number"
                  step="0.05"
                  value={breakevenInflationRate}
                  onChange={(e) => setBreakevenInflationRate(Number(e.target.value))}
                  className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
