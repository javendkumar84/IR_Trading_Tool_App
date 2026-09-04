import React, { useState, useMemo } from 'react';
import {
  BarChart3, ShieldCheck, DollarSign, Sliders, AlertTriangle, Layers, RefreshCw,
  TrendingDown, FileText, CheckCircle2, ChevronRight, Activity, Percent
} from 'lucide-react';
import { Currency } from '../types';

interface RiskClassCharge {
  riskClass: string;
  code: string;
  deltaCharge: number;
  vegaCharge: number;
  curvatureCharge: number;
  totalSbm: number;
  liquidityHorizon: string;
}

export const FrtbRiskTerminal: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [stressFactor, setStressFactor] = useState<number>(1.0); // 1.0x to 2.5x
  const [correlationScenario, setCorrelationScenario] = useState<'MEDIUM' | 'HIGH' | 'LOW'>('MEDIUM');
  const [includeRrao, setIncludeRrao] = useState<boolean>(true);

  const currencySymbol = useMemo(() => {
    switch (selectedCurrency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      case 'CHF': return 'CHF ';
      default: return '$';
    }
  }, [selectedCurrency]);

  const currencyMultiplier = useMemo(() => {
    switch (selectedCurrency) {
      case 'EUR': return 0.92;
      case 'GBP': return 0.78;
      case 'JPY': return 145.5;
      case 'CAD': return 1.35;
      case 'AUD': return 1.52;
      case 'CHF': return 0.88;
      default: return 1.0;
    }
  }, [selectedCurrency]);

  // SBM Risk Class Base Charges
  const baseRiskClasses: RiskClassCharge[] = useMemo(() => {
    return [
      {
        riskClass: 'Global Interest Rate Risk (GIRR)',
        code: 'GIRR',
        deltaCharge: Math.round(1850000 * currencyMultiplier),
        vegaCharge: Math.round(620000 * currencyMultiplier),
        curvatureCharge: Math.round(240000 * currencyMultiplier),
        totalSbm: 0,
        liquidityHorizon: '10 - 40 Days',
      },
      {
        riskClass: 'Foreign Exchange Risk (FX)',
        code: 'FX',
        deltaCharge: Math.round(940000 * currencyMultiplier),
        vegaCharge: Math.round(380000 * currencyMultiplier),
        curvatureCharge: Math.round(110000 * currencyMultiplier),
        totalSbm: 0,
        liquidityHorizon: '10 - 20 Days',
      },
      {
        riskClass: 'Inflation Risk',
        code: 'INF',
        deltaCharge: Math.round(410000 * currencyMultiplier),
        vegaCharge: Math.round(150000 * currencyMultiplier),
        curvatureCharge: Math.round(45000 * currencyMultiplier),
        totalSbm: 0,
        liquidityHorizon: '40 - 60 Days',
      },
      {
        riskClass: 'Credit Spread Risk - Non-Securitisation (CSR)',
        code: 'CSR',
        deltaCharge: Math.round(780000 * currencyMultiplier),
        vegaCharge: Math.round(290000 * currencyMultiplier),
        curvatureCharge: Math.round(95000 * currencyMultiplier),
        totalSbm: 0,
        liquidityHorizon: '60 - 120 Days',
      },
    ];
  }, [currencyMultiplier]);

  // Calculated Capital Charges under Stress & Aggregation Scenarios
  const calculatedFrtb = useMemo(() => {
    const corrMultiplier = correlationScenario === 'HIGH' ? 1.25 : correlationScenario === 'LOW' ? 0.85 : 1.0;

    const riskClassesWithTotals = baseRiskClasses.map((rc) => {
      const delta = Math.round(rc.deltaCharge * stressFactor * corrMultiplier);
      const vega = Math.round(rc.vegaCharge * stressFactor * corrMultiplier);
      const curvature = Math.round(rc.curvatureCharge * stressFactor * corrMultiplier);
      const totalSbm = delta + vega + curvature;

      return {
        ...rc,
        deltaCharge: delta,
        vegaCharge: vega,
        curvatureCharge: curvature,
        totalSbm,
      };
    });

    const totalSbmCharge = riskClassesWithTotals.reduce((sum, rc) => sum + rc.totalSbm, 0);
    const drcCharge = Math.round(totalSbmCharge * 0.18 * stressFactor);
    const rraoCharge = includeRrao ? Math.round(totalSbmCharge * 0.08 * stressFactor) : 0;
    const totalFrtbCapital = totalSbmCharge + drcCharge + rraoCharge;

    // Expected Shortfall (ES 97.5%) Stressed vs 99% VaR Comparison
    const var99 = Math.round(totalFrtbCapital * 0.68);
    const expectedShortfall975 = Math.round(totalFrtbCapital * 0.84);

    return {
      riskClasses: riskClassesWithTotals,
      totalSbmCharge,
      drcCharge,
      rraoCharge,
      totalFrtbCapital,
      var99,
      expectedShortfall975,
    };
  }, [baseRiskClasses, stressFactor, correlationScenario, includeRrao]);

  return (
    <div id="frtb-risk-terminal-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0284c7]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#0284c7]/20 text-[#0284c7] rounded-lg border border-[#0284c7]/30">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                FRTB Market Risk & Capital Requirements Terminal
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0284c7]/10 border border-[#0284c7]/30 text-[#0284c7]">
                BASEL III / IV MAR20 - MAR22
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Fundamental Review of the Trading Book Standardized Approach (SBM, DRC, RRAO) & Stressed Expected Shortfall (ES 97.5%).
            </p>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Reporting Currency:</span>
            <select
              id="frtb-currency-selector"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
              className="bg-[#0f172a] text-white border border-[#334155] rounded-lg px-3 py-2 text-xs font-semibold focus:border-[#0284c7] focus:outline-none cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CHF">CHF (CHF)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Capital Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total FRTB Capital Requirement */}
        <div className="bg-[#1e293b] border border-[#0284c7]/40 rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold text-white">Total FRTB Capital Requirement</span>
            <ShieldCheck className="w-5 h-5 text-[#0284c7]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-white">
              {currencySymbol}{calculatedFrtb.totalFrtbCapital.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Basel IV SA Total Capital Charge
            </div>
          </div>
        </div>

        {/* SBM Capital Charge */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Sensitivities-Based Method (SBM)</span>
            <Layers className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#0284c7]">
              {currencySymbol}{calculatedFrtb.totalSbmCharge.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Delta + Vega + Curvature Across Risk Classes
            </div>
          </div>
        </div>

        {/* DRC (Default Risk Charge) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Default Risk Charge (DRC)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-amber-400">
              {currencySymbol}{calculatedFrtb.drcCharge.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Jump-to-Default Capital Add-On
            </div>
          </div>
        </div>

        {/* Expected Shortfall (ES 97.5%) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Expected Shortfall (ES 97.5%)</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-purple-400">
              {currencySymbol}{calculatedFrtb.expectedShortfall975.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Stressed Calibration (vs {currencySymbol}{calculatedFrtb.var99.toLocaleString()} 99% VaR)
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: SBM Risk Class Heatmap & Stress Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: SBM Risk Class Breakdown Table */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0284c7]" />
              <h3 className="text-sm font-bold text-white">SBM Risk Class Capital Charges</h3>
            </div>
            <span className="text-xs text-slate-400">Delta / Vega / Curvature Decomposition</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#334155] text-slate-400 font-semibold bg-[#0f172a]/60">
                  <th className="py-3 px-3">Risk Class</th>
                  <th className="py-3 px-3 text-right">Delta Charge</th>
                  <th className="py-3 px-3 text-right">Vega Charge</th>
                  <th className="py-3 px-3 text-right">Curvature Charge</th>
                  <th className="py-3 px-3 text-right">Total SBM</th>
                  <th className="py-3 px-3 text-center">Liquidity Horizon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {calculatedFrtb.riskClasses.map((rc) => (
                  <tr key={rc.code} className="hover:bg-[#1f293d]/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{rc.riskClass}</div>
                      <div className="text-[10px] font-mono text-slate-400">{rc.code}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">{currencySymbol}{rc.deltaCharge.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{currencySymbol}{rc.vegaCharge.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{currencySymbol}{rc.curvatureCharge.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#0284c7]">{currencySymbol}{rc.totalSbm.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0f172a] border border-[#334155] text-slate-300">
                        {rc.liquidityHorizon}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#334155] bg-[#0f172a] font-bold text-xs text-white">
                  <td className="py-3 px-3">Aggregated SBM Total</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {currencySymbol}{calculatedFrtb.riskClasses.reduce((a, b) => a + b.deltaCharge, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {currencySymbol}{calculatedFrtb.riskClasses.reduce((a, b) => a + b.vegaCharge, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {currencySymbol}{calculatedFrtb.riskClasses.reduce((a, b) => a + b.curvatureCharge, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#0284c7] text-sm">
                    {currencySymbol}{calculatedFrtb.totalSbmCharge.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center text-[10px] text-slate-400 font-normal">SBM Sum</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Col: Stress Controls & Aggregation Scenario Panel */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#334155] pb-3">
              <Sliders className="w-4 h-4 text-[#0284c7]" />
              <h3 className="text-sm font-bold text-white">FRTB Stress & Aggregation Controls</h3>
            </div>

            {/* Slider 1: Volatility & Sensitivity Stress Factor */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Market Volatility Stress Factor:</span>
                <span className="font-mono text-[#0284c7] font-bold">{stressFactor.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={stressFactor}
                onChange={(e) => setStressFactor(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#0284c7]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.8x (Calm)</span>
                <span>1.0x (Base)</span>
                <span>2.5x (Crisis)</span>
              </div>
            </div>

            {/* Selector 2: Correlation Scenario */}
            <div className="mt-5 space-y-2">
              <label className="text-xs text-slate-300 font-medium block">
                Inter-Bucket Correlation Scenario:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((scen) => (
                  <button
                    key={scen}
                    onClick={() => setCorrelationScenario(scen)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      correlationScenario === scen
                        ? 'bg-[#0284c7] text-white border-[#0284c7]'
                        : 'bg-[#0f172a] text-slate-400 border-[#334155] hover:text-white'
                    }`}
                  >
                    {scen}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox: Residual Risk Add-On (RRAO) */}
            <div className="mt-5 flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
              <div>
                <span className="text-xs font-semibold text-white block">Residual Risk Add-On (RRAO)</span>
                <span className="text-[10px] text-slate-400">Exotic payoffs & path-dependent risks</span>
              </div>
              <input
                type="checkbox"
                checked={includeRrao}
                onChange={(e) => setIncludeRrao(e.target.checked)}
                className="w-4 h-4 accent-[#0284c7] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Reset Controls Button */}
          <button
            onClick={() => {
              setStressFactor(1.0);
              setCorrelationScenario('MEDIUM');
              setIncludeRrao(true);
            }}
            className="w-full py-2 bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] text-xs font-semibold text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset FRTB Parameters
          </button>
        </div>
      </div>
    </div>
  );
};
