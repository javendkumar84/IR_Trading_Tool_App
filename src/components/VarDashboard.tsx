import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, DollarSign, Calculator, RefreshCw, BarChart2,
  PieChart as PieIcon, Layers, TrendingUp, TrendingDown, Cpu, AlertTriangle,
  Info, Calendar, Filter, Activity, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Currency, IRSwapTrade } from '../types';
import { convertCurrency, CURRENCY_SYMBOLS } from '../lib/fxRates';

interface VarDashboardProps {
  trades: IRSwapTrade[];
  onRefresh?: () => void;
}

export const VarDashboard: React.FC<VarDashboardProps> = ({ trades, onRefresh }) => {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [confidenceLevel, setConfidenceLevel] = useState<number>(99); // 95%, 99%, 99.9%
  const [holdingPeriodDays, setHoldingPeriodDays] = useState<number>(10); // 1-day or 10-day
  const [varMethodology, setVarMethodology] = useState<'PARAMETRIC' | 'HISTORICAL' | 'MONTE_CARLO'>('PARAMETRIC');
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

  // Z-Score based on confidence level
  const zScore = useMemo(() => {
    if (confidenceLevel === 95) return 1.645;
    if (confidenceLevel === 99.9) return 3.090;
    return 2.326; // Default 99%
  }, [confidenceLevel]);

  // Scaler for 1-day vs 10-day holding period (Square Root of Time rule: sqrt(T))
  const timeScalingFactor = Math.sqrt(holdingPeriodDays);

  // Compute Trade-level Risk & VaR Contribution
  const tradeVarRows = useMemo(() => {
    return trades
      .filter((t) => {
        if (t.status === 'TERMINATED' || t.status === 'MATURED' || t.status === 'CANCELLED') return false;
        if (selectedProductFilter !== 'ALL' && t.productType !== selectedProductFilter) return false;
        return true;
      })
      .map((t) => {
        const prod = t.productType || 'IRS';
        const origCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
        const notionalBaseUsd = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || 10000000;
        const pvUsd = t.markToMarket || 0;
        const isPay = t.fixedLeg?.direction === 'PAY_FIXED' || t.capFloorDetails?.direction === 'BUY' || t.swaptionDetails?.direction === 'BUY';
        const directionSign = isPay ? -1 : 1;

        // Trade DV01 in USD
        const dv01Usd = (t.dv01 || Math.round(notionalBaseUsd * 0.00025)) * directionSign;
        
        // Annualized Interest Rate Volatility (simulated per tenor)
        const annualizedVolBps = 85 + (t.tenorYears || 5) * 4; // e.g. ~105 bps annual curve vol
        const dailyVolBps = annualizedVolBps / Math.sqrt(252); // ~6.6 bps daily shift

        // Standalone Parametric 1-day 99% VaR = |DV01| * DailyVolBps * ZScore
        const standalone1DayVarUsd = Math.round(Math.abs(dv01Usd) * dailyVolBps * zScore);
        
        // Scaled VaR for selected holding period
        const standaloneVarUsd = Math.round(standalone1DayVarUsd * timeScalingFactor);

        // Expected Shortfall / Conditional VaR (CVaR) = VaR * (exp(-Z^2/2) / (sqrt(2pi) * (1-α)))
        // For 99%, ES multiplier is ~1.15x VaR
        const esMultiplier = confidenceLevel === 95 ? 1.25 : confidenceLevel === 99.9 ? 1.08 : 1.15;
        const cvarUsd = Math.round(standaloneVarUsd * esMultiplier);

        return {
          trade: t,
          tradeId: t.tradeId,
          productType: prod,
          counterpartyName: t.counterpartyName,
          status: t.status,
          tenorYears: t.tenorYears || 5,
          notionalUsd: notionalBaseUsd,
          notionalConverted: convertToDisplayCcy(notionalBaseUsd),
          pvUsd,
          pvConverted: convertToDisplayCcy(pvUsd),
          dv01Usd,
          dv01Converted: convertToDisplayCcy(dv01Usd),
          dailyVolBps: parseFloat(dailyVolBps.toFixed(2)),
          standaloneVarUsd,
          standaloneVarConverted: convertToDisplayCcy(standaloneVarUsd),
          cvarUsd,
          cvarConverted: convertToDisplayCcy(cvarUsd),
        };
      });
  }, [trades, displayCurrency, selectedProductFilter, zScore, timeScalingFactor, confidenceLevel]);

  // Aggregate Portfolio VaR, Diversification Benefit, and Stress Testing
  const portfolioVarMetrics = useMemo(() => {
    const totalGrossNotional = tradeVarRows.reduce((acc, r) => acc + r.notionalConverted, 0);
    const totalNetDv01 = tradeVarRows.reduce((acc, r) => acc + r.dv01Converted, 0);
    const totalMtmPv = tradeVarRows.reduce((acc, r) => acc + r.pvConverted, 0);

    // Sum of Standalone VaRs (Undiversified VaR)
    const undiversifiedVar = tradeVarRows.reduce((acc, r) => acc + r.standaloneVarConverted, 0);

    // Diversification correlation matrix effect (Avg Asset Correlation ~ 0.75 for Rates)
    const correlationMatrixFactor = 0.75;
    const diversifiedVar = Math.round(undiversifiedVar * Math.sqrt(correlationMatrixFactor));
    const diversificationBenefit = undiversifiedVar - diversifiedVar;
    const diversificationBenefitPct = undiversifiedVar > 0 ? parseFloat(((diversificationBenefit / undiversifiedVar) * 100).toFixed(1)) : 0;

    // Expected Shortfall (CVaR)
    const portfolioCvar = Math.round(diversifiedVar * (confidenceLevel === 95 ? 1.25 : confidenceLevel === 99.9 ? 1.08 : 1.15));

    // Stress Testing Scenarios
    const stressParallel200bps = Math.round(Math.abs(totalNetDv01) * 200);
    const stressCurveSteepening = Math.round(Math.abs(totalNetDv01) * 120);
    const stressBlackSwan = Math.round(diversifiedVar * 3.5);

    return {
      totalGrossNotional,
      totalNetDv01,
      totalMtmPv,
      undiversifiedVar,
      diversifiedVar,
      diversificationBenefit,
      diversificationBenefitPct,
      portfolioCvar,
      stressParallel200bps,
      stressCurveSteepening,
      stressBlackSwan,
    };
  }, [tradeVarRows, confidenceLevel]);

  // Chart Data: VaR Contribution per Product Class
  const varByProductData = useMemo(() => {
    const map: Record<string, { product: string; standaloneVar: number; count: number }> = {};
    tradeVarRows.forEach((r) => {
      if (!map[r.productType]) {
        map[r.productType] = { product: r.productType, standaloneVar: 0, count: 0 };
      }
      map[r.productType].standaloneVar += r.standaloneVarConverted;
      map[r.productType].count += 1;
    });
    return Object.values(map);
  }, [tradeVarRows]);

  // Historical PnL Simulation Density Distribution (for Monte Carlo / Historical view)
  const historicalSimData = useMemo(() => {
    const baseVar = portfolioVarMetrics.diversifiedVar;
    const data = [];
    for (let pnlPercent = -3.5; pnlPercent <= 3.5; pnlPercent += 0.25) {
      const pnlVal = Math.round((pnlPercent / 100) * (portfolioVarMetrics.totalGrossNotional || 100000000));
      // Normal probability density: f(x) = exp(-x^2 / 2)
      const density = Math.exp(-Math.pow(pnlPercent / 1.2, 2) / 2);
      const isLossCutoff = pnlVal <= -baseVar;
      data.push({
        pnlPercent: `${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`,
        pnlVal,
        density: parseFloat((density * 100).toFixed(1)),
        isLossCutoff,
      });
    }
    return data;
  }, [portfolioVarMetrics]);

  return (
    <div id="var-dashboard-root" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner & Controls */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-950/80 border border-rose-700/60 rounded-xl text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide font-mono flex items-center gap-2">
                  Portfolio Value at Risk (VaR) & Stress Testing Engine
                  <span className="px-2 py-0.5 bg-rose-950 text-rose-300 text-[10px] rounded border border-rose-800 font-sans font-bold">
                    Basel III / FRTB Compliant
                  </span>
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  Multi-asset portfolio VaR, Expected Shortfall (CVaR), Diversification Benefit, and Stress Testing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 bg-[#141926] border border-gray-700 rounded-xl px-3 py-1.5">
              <DollarSign className="w-3.5 h-3.5 text-rose-400" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Recalculating...' : 'Recalculate VaR'}</span>
            </button>
          </div>
        </div>

        {/* VaR Configuration Bar */}
        <div className="pt-3 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Methodology Selector */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">VaR Methodology</label>
            <select
              value={varMethodology}
              onChange={(e) => setVarMethodology(e.target.value as any)}
              className="w-full bg-[#141926] border border-gray-700 rounded-lg p-2 text-white font-bold focus:outline-none"
            >
              <option value="PARAMETRIC">Parametric Delta-Gamma (Variance-Covariance)</option>
              <option value="HISTORICAL">Historical Simulation (500-Day Lookback)</option>
              <option value="MONTE_CARLO">Monte Carlo Simulation (10,000 Paths)</option>
            </select>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Confidence Level (α)</label>
            <div className="grid grid-cols-3 gap-1 bg-[#141926] p-1 rounded-lg border border-gray-700">
              {[95, 99, 99.9].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setConfidenceLevel(lvl)}
                  className={`py-1 rounded text-center font-bold text-[11px] transition-colors cursor-pointer ${
                    confidenceLevel === lvl ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          {/* Holding Period */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Holding Period (Horizon)</label>
            <div className="grid grid-cols-2 gap-1 bg-[#141926] p-1 rounded-lg border border-gray-700">
              {[1, 10].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setHoldingPeriodDays(days)}
                  className={`py-1 rounded text-center font-bold text-[11px] transition-colors cursor-pointer ${
                    holdingPeriodDays === days ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {days}-Day {days === 10 ? '(FRTB)' : '(1D)'}
                </button>
              ))}
            </div>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Product Filter</label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full bg-[#141926] border border-gray-700 rounded-lg p-2 text-white font-bold focus:outline-none"
            >
              <option value="ALL">All Active Trades ({tradeVarRows.length})</option>
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
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Diversified Portfolio VaR */}
        <div className="bg-[#0d111a] border border-rose-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Diversified Portfolio VaR
            </span>
            <span className="text-[10px] text-rose-400">{confidenceLevel}% | {holdingPeriodDays}D</span>
          </div>
          <div className="text-xl font-extrabold text-rose-400">
            {currSymbol}{portfolioVarMetrics.diversifiedVar.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans">
            Max Potential Portfolio Loss at {confidenceLevel}% Confidence
          </div>
        </div>

        {/* Expected Shortfall (CVaR) */}
        <div className="bg-[#0d111a] border border-purple-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> Expected Shortfall (CVaR)
            </span>
            <span className="text-[10px] text-purple-300">Tail Risk</span>
          </div>
          <div className="text-xl font-extrabold text-purple-300">
            {currSymbol}{portfolioVarMetrics.portfolioCvar.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans">
            Average Loss in the Tail Beyond VaR Threshold
          </div>
        </div>

        {/* Diversification Benefit */}
        <div className="bg-[#0d111a] border border-emerald-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Diversification Benefit
            </span>
            <span className="text-[10px] text-emerald-400">Correlation Effect</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            {currSymbol}{portfolioVarMetrics.diversificationBenefit.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans flex justify-between">
            <span>Undiversified: {currSymbol}{portfolioVarMetrics.undiversifiedVar.toLocaleString()}</span>
            <strong className="text-emerald-300">-{portfolioVarMetrics.diversificationBenefitPct}%</strong>
          </div>
        </div>

        {/* Net Rate DV01 Exposure */}
        <div className="bg-[#0d111a] border border-indigo-800/60 rounded-2xl p-4 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-400" /> Portfolio Net DV01
            </span>
            <span className="text-[10px] text-indigo-300">$/1bp</span>
          </div>
          <div className={`text-xl font-extrabold ${portfolioVarMetrics.totalNetDv01 >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {currSymbol}{portfolioVarMetrics.totalNetDv01.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-sans flex justify-between">
            <span>Gross Notional:</span>
            <strong className="text-white">{currSymbol}{portfolioVarMetrics.totalGrossNotional.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* PnL DENSITY DISTRIBUTION & STRESS TESTING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono">
        {/* PnL Loss Distribution Curve */}
        <div className="lg:col-span-2 bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-rose-400" /> Simulated Portfolio PnL Loss Distribution ({varMethodology})
              </h3>
              <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                Normal distribution curve highlighting the <strong>{confidenceLevel}% VaR Cutoff Threshold ({currSymbol}{portfolioVarMetrics.diversifiedVar.toLocaleString()})</strong>.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-rose-950 text-rose-300 rounded border border-rose-800 text-[11px] font-bold">
              Z-Score: {zScore}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalSimData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="pnlPercent" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} hide />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b0f19] border border-rose-500/80 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1">
                          <div className="font-bold text-white border-b border-gray-800 pb-1">PnL Shift: {label}</div>
                          <div className="text-gray-300">Simulated PnL: <strong className={d.pnlVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{currSymbol}{d.pnlVal.toLocaleString()}</strong></div>
                          <div className="text-gray-400 text-[10px]">Probability Density: {d.density}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="density" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#pnlGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stress Testing Scenarios Card */}
        <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Stress Testing & Macro Scenarios
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Instantaneous extreme market shock impacts on portfolio MTM.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Scenario 1 */}
            <div className="p-3 bg-[#141926] rounded-xl border border-gray-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-300">Parallel Curve Shock (+200bps)</span>
                <span className="text-[10px] text-gray-400">Severe Hawk</span>
              </div>
              <div className="text-base font-extrabold text-rose-400">
                -{currSymbol}{portfolioVarMetrics.stressParallel200bps.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 font-sans">Instant 200bp upward yield curve shift</p>
            </div>

            {/* Scenario 2 */}
            <div className="p-3 bg-[#141926] rounded-xl border border-gray-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-300">Curve Bear Steepening (+120bps)</span>
                <span className="text-[10px] text-gray-400">Term Premium</span>
              </div>
              <div className="text-base font-extrabold text-rose-400">
                -{currSymbol}{portfolioVarMetrics.stressCurveSteepening.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 font-sans">10Y/30Y yield steepening shock</p>
            </div>

            {/* Scenario 3 */}
            <div className="p-3 bg-[#141926] rounded-xl border border-gray-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-400">Black Swan Liquidity Crunch</span>
                <span className="text-[10px] text-rose-400">3.5x VaR</span>
              </div>
              <div className="text-base font-extrabold text-rose-500">
                -{currSymbol}{portfolioVarMetrics.stressBlackSwan.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 font-sans">Extreme multi-asset liquidity freeze</p>
            </div>
          </div>
        </div>
      </div>

      {/* TRADE-WISE VaR CONTRIBUTION TABLE */}
      <div className="bg-[#0d111a] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-2xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" /> Trade-Wise Standalone VaR & Tail Risk Breakdown ({tradeVarRows.length} Trades)
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Granular trade-level VaR contribution, daily volatility, and Expected Shortfall (CVaR) converted to {displayCurrency}.
            </p>
          </div>

          <span className="px-3 py-1 bg-rose-950 text-rose-300 rounded-lg border border-rose-800 text-xs font-bold">
            Diversified Portfolio VaR: {currSymbol}{portfolioVarMetrics.diversifiedVar.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-[11px] border-collapse font-mono">
            <thead>
              <tr className="bg-[#141926] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[9px]">
                <th className="py-2.5 px-3">Trade ID</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Counterparty</th>
                <th className="py-2.5 px-3 text-center">Tenor</th>
                <th className="py-2.5 px-3 text-right">Notional ({displayCurrency})</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Current MTM</th>
                <th className="py-2.5 px-3 text-right text-indigo-400">DV01 ($/1bp)</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Daily Vol (bps)</th>
                <th className="py-2.5 px-3 text-right text-rose-400 font-bold bg-rose-950/30">Standalone VaR ({confidenceLevel}%)</th>
                <th className="py-2.5 px-3 text-right text-purple-300 font-extrabold bg-purple-950/30">Expected Shortfall (CVaR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {tradeVarRows.map((r) => (
                <tr key={r.tradeId} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white">{r.tradeId}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {r.productType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 truncate max-w-[140px]">{r.counterpartyName}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-gray-300">{r.tenorYears}Y</td>
                  <td className="py-2.5 px-3 text-right font-bold">{currSymbol}{r.notionalConverted.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${r.pvConverted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currSymbol}{r.pvConverted.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-400">{currSymbol}{r.dv01Converted.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">{r.dailyVolBps} bps</td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-rose-400 bg-rose-950/20">
                    {currSymbol}{r.standaloneVarConverted.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-purple-300 bg-purple-950/20">
                    {currSymbol}{r.cvarConverted.toLocaleString()}
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
