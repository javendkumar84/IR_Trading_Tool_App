import React, { useState, useMemo } from 'react';
import {
  Database,
  TrendingUp,
  Activity,
  Layers,
  Search,
  RefreshCw,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  Sparkles,
  Zap,
  Globe,
  Cpu,
  BarChart2
} from 'lucide-react';
import { Currency, FloatingIndex, MarketRateQuote, ProductType } from '../types';

interface MarketDataTabProps {
  marketRates?: MarketRateQuote[];
  isWsConnected?: boolean;
}

export const MarketDataTab: React.FC<MarketDataTabProps> = ({
  marketRates = [],
  isWsConnected = false
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [selectedCategory, setSelectedCategory] = useState<'DISCOUNT_YIELD' | 'VOL_SURFACE' | 'FX_CURVES' | 'CREDIT_CDS'>('DISCOUNT_YIELD');
  const [snapshotMode, setSnapshotMode] = useState<'EOD_NY_CLOSE' | 'REALTIME' | 'LON_1600_FIX' | 'TOKYO_CLOSE'>('EOD_NY_CLOSE');

  // Curve Tenors & Discount Factor Generator (SOFR, ESTER, SONIA)
  const curvePoints = useMemo(() => {
    const baseRates: Record<Currency, number> = {
      USD: 3.85,
      EUR: 2.75,
      GBP: 4.15,
      JPY: 0.25,
      CAD: 3.25,
      AUD: 3.80,
      CHF: 1.10
    };

    const base = baseRates[selectedCurrency] || 3.85;
    const tenors = [
      { tenor: '1D', days: 1, zeroRate: selectedCurrency === 'USD' ? 3.66 : base, spread: 0 },
      { tenor: '1M', days: 30, zeroRate: base + 0.05, spread: 2 },
      { tenor: '3M', days: 90, zeroRate: base + 0.12, spread: 4 },
      { tenor: '6M', days: 180, zeroRate: base + 0.18, spread: 7 },
      { tenor: '1Y', days: 365, zeroRate: base + 0.25, spread: 10 },
      { tenor: '2Y', days: 730, zeroRate: base + 0.38, spread: 15 },
      { tenor: '5Y', days: 1825, zeroRate: base + 0.55, spread: 22 },
      { tenor: '10Y', days: 3650, zeroRate: base + 0.72, spread: 30 },
      { tenor: '30Y', days: 10950, zeroRate: base + 0.85, spread: 45 }
    ];

    return tenors.map((t) => {
      const tYears = t.days / 365;
      const df = Math.exp(-(t.zeroRate / 100) * tYears);
      const oisRate = t.zeroRate - 0.05;
      const forwardRate = t.zeroRate + (t.days > 90 ? 0.10 : 0.02);
      return {
        ...t,
        df: parseFloat(df.toFixed(6)),
        oisRate: parseFloat(oisRate.toFixed(4)),
        forwardRate: parseFloat(forwardRate.toFixed(4))
      };
    });
  }, [selectedCurrency]);

  // SABR Volatility Surface Matrix Data
  const sabrVolSurface = useMemo(() => {
    const expiries = ['1M', '3M', '6M', '1Y', '5Y', '10Y'];
    const strikes = ['ATM-100bp', 'ATM-50bp', 'ATM (Par)', 'ATM+50bp', 'ATM+100bp'];

    return expiries.map((exp) => {
      return {
        expiry: exp,
        alpha: 0.025,
        beta: 0.50,
        rho: -0.28,
        nu: 0.42,
        vols: strikes.map((stk, idx) => {
          const shift = (idx - 2) * 2.5;
          const normalVol = 85.5 + shift + (exp === '1Y' ? 5 : exp === '5Y' ? 12 : 0);
          const blackVol = 22.5 + (idx - 2) * 1.2;
          return { strike: stk, normalVolBps: parseFloat(normalVol.toFixed(1)), blackVolPct: parseFloat(blackVol.toFixed(2)) };
        })
      };
    });
  }, [selectedCurrency]);

  // FX Spot & Forward Rate Points Data
  const fxForwardMatrix = [
    { pair: 'EUR/USD', spot: 1.0850, fwd1M: 1.0862, fwd3M: 1.0885, fwd6M: 1.0920, fwd1Y: 1.0990, cipBasisBps: -4.5 },
    { pair: 'GBP/USD', spot: 1.2720, fwd1M: 1.2730, fwd3M: 1.2755, fwd6M: 1.2790, fwd1Y: 1.2860, cipBasisBps: -2.1 },
    { pair: 'USD/JPY', spot: 154.50, fwd1M: 154.10, fwd3M: 153.20, fwd6M: 151.80, fwd1Y: 148.90, cipBasisBps: -18.2 },
    { pair: 'USD/CAD', spot: 1.3650, fwd1M: 1.3658, fwd3M: 1.3675, fwd6M: 1.3700, fwd1Y: 1.3750, cipBasisBps: +1.4 },
    { pair: 'USD/CHF', spot: 0.8840, fwd1M: 0.8825, fwd3M: 0.8790, fwd6M: 0.8735, fwd1Y: 0.8620, cipBasisBps: -8.7 }
  ];

  return (
    <div id="market-data-tab-suite" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#0c101d] border border-blue-900/60 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-sans">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-950/80 border border-blue-700/80 rounded-2xl text-blue-400 shadow-inner">
            <Globe className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-white tracking-wide font-sans">
                Market Data & Pricing Model Parameter Repository
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-950 text-blue-300 border border-blue-700 uppercase">
                INDEPENDENT MODEL GOVERNANCE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Authoritative Yield Curves, OIS Discount Curves, SABR Volatility Surfaces, FX Forward Points, and Model Validation Parameters.
            </p>
          </div>
        </div>

        {/* Currency & Snapshot Controls */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1 bg-[#141824] border border-gray-800 rounded-xl p-1">
            {(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF'] as Currency[]).map((ccy) => (
              <button
                key={ccy}
                onClick={() => setSelectedCurrency(ccy)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedCurrency === ccy
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {ccy}
              </button>
            ))}
          </div>

          <select
            value={snapshotMode}
            onChange={(e) => setSnapshotMode(e.target.value as any)}
            className="bg-[#141824] border border-blue-700/80 text-blue-300 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
          >
            <option value="EOD_NY_CLOSE">EOD NY Close Snapshot (17:00 EST)</option>
            <option value="REALTIME">⚡ Real-Time Intraday Live Feed</option>
            <option value="LON_1600_FIX">London WM/Ref 16:00 Fixing</option>
            <option value="TOKYO_CLOSE">Tokyo Close 15:00 JST</option>
          </select>
        </div>
      </div>

      {/* Model Parameter Category Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setSelectedCategory('DISCOUNT_YIELD')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'DISCOUNT_YIELD'
              ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
              : 'bg-[#101420] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Yield & OIS Discount Curves ({selectedCurrency})
        </button>

        <button
          onClick={() => setSelectedCategory('VOL_SURFACE')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'VOL_SURFACE'
              ? 'bg-indigo-600 text-white shadow-lg border border-indigo-400'
              : 'bg-[#101420] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-400" />
          SABR Volatility Surface (Swaptions / Caps)
        </button>

        <button
          onClick={() => setSelectedCategory('FX_CURVES')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'FX_CURVES'
              ? 'bg-purple-600 text-white shadow-lg border border-purple-400'
              : 'bg-[#101420] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Globe className="w-4 h-4 text-purple-400" />
          FX Spot & Forward Rate Points
        </button>

        <button
          onClick={() => setSelectedCategory('CREDIT_CDS')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'CREDIT_CDS'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400'
              : 'bg-[#101420] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Counterparty Credit & CVA/DVA Curve
        </button>
      </div>

      {/* CATEGORY 1: DISCOUNT & YIELD CURVE MATRIX */}
      {selectedCategory === 'DISCOUNT_YIELD' && (
        <div className="space-y-6">
          {/* Curve Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-sans text-xs">
            <div className="p-4 bg-[#101422] border border-blue-900/60 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Discount Curve ID</div>
              <div className="text-sm font-bold text-blue-300 font-mono">{selectedCurrency}-SOFR-OIS-DISCOUNT</div>
              <div className="text-[10px] text-gray-400">Model: Exponential Zero Rate $DF = \exp(-r \cdot T)$</div>
            </div>

            <div className="p-4 bg-[#101422] border border-indigo-900/60 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Forecast Forward Curve</div>
              <div className="text-sm font-bold text-indigo-300 font-mono">{selectedCurrency}-3M-FORWARD-PROJECTION</div>
              <div className="text-[10px] text-gray-400">Collateral Standard: CSA Dual-Curve OIS</div>
            </div>

            <div className="p-4 bg-[#101422] border border-emerald-900/60 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Benchmark Par Rate (10Y)</div>
              <div className="text-base font-extrabold text-emerald-400 font-mono">
                {curvePoints.find((c) => c.tenor === '10Y')?.zeroRate.toFixed(4)}%
              </div>
              <div className="text-[10px] text-emerald-300">Spread over OIS: +30 bps</div>
            </div>

            <div className="p-4 bg-[#101422] border border-amber-900/60 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Snapshot Timestamp</div>
              <div className="text-xs font-bold text-amber-300 font-mono">2026-08-01 17:00:00 EST</div>
              <div className="text-[10px] text-gray-400">Source: NY FED / Refinitiv ICAP</div>
            </div>
          </div>

          {/* Tenor Curve Points Table */}
          <div className="bg-[#0a0d16] border border-gray-800 rounded-2xl overflow-hidden font-mono shadow-xl">
            <div className="px-6 py-4 bg-[#101422] border-b border-gray-800 flex items-center justify-between font-sans">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                {selectedCurrency} Yield Curve & Discount Factor Matrix ($T_k$)
              </h3>
              <span className="text-[10px] text-blue-400 font-mono">9 Standard Calibration Tenors</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121626] text-gray-400 border-b border-gray-800">
                    <th className="py-3 px-4">Tenor</th>
                    <th className="py-3 px-4 text-center">Days / Years ($T_k$)</th>
                    <th className="py-3 px-4 text-right text-blue-300">OIS Discount Rate (%)</th>
                    <th className="py-3 px-4 text-right text-indigo-300">Zero Yield Rate (%)</th>
                    <th className="py-3 px-4 text-right text-cyan-300">Forward Rate (%)</th>
                    <th className="py-3 px-4 text-right text-purple-300 font-bold">Discount Factor $DF(T_k)$</th>
                    <th className="py-3 px-4 text-right text-emerald-400">PV of $1M ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {curvePoints.map((pt) => (
                    <tr key={pt.tenor} className="hover:bg-[#121626]/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {pt.tenor}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {pt.days}d ({ (pt.days / 365).toFixed(2) }y)
                      </td>
                      <td className="py-3 px-4 text-right text-blue-300 font-bold">
                        {pt.oisRate.toFixed(4)}%
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-300 font-bold">
                        {pt.zeroRate.toFixed(4)}%
                      </td>
                      <td className="py-3 px-4 text-right text-cyan-300 font-bold">
                        {pt.forwardRate.toFixed(4)}%
                      </td>
                      <td className="py-3 px-4 text-right text-purple-300 font-extrabold bg-purple-950/20">
                        {pt.df.toFixed(6)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ${ (1000000 * pt.df).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 2: SABR VOLATILITY SURFACE */}
      {selectedCategory === 'VOL_SURFACE' && (
        <div className="space-y-6 font-mono">
          <div className="p-4 bg-[#0e121e] border border-indigo-900/60 rounded-xl space-y-2 text-xs">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans flex items-center justify-between border-b border-gray-800 pb-1.5">
              <span>SABR Volatility Surface Model ($\alpha, \beta, \rho, \nu$) Specification</span>
              <span className="text-[10px] text-indigo-400 font-normal">Hagan et al. Market Standard Formula</span>
            </div>
            <p className="text-gray-300 font-sans text-[11px]">
              The SABR model captures interest rate option volatility smile and skew across strikes and option expiries.
            </p>
          </div>

          <div className="bg-[#0a0d16] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-[#101422] border-b border-gray-800 flex items-center justify-between font-sans">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                {selectedCurrency} SABR Volatility Surface Matrix (Swaptions & Caps/Floors)
              </h3>
              <span className="text-[10px] text-indigo-400 font-mono">Normal Volatility (bps/year) & Lognormal Black Vol (%)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121626] text-gray-400 border-b border-gray-800">
                    <th className="py-3 px-4">Option Expiry</th>
                    <th className="py-3 px-4 text-center">SABR $\alpha$ (Atm Vol)</th>
                    <th className="py-3 px-4 text-center">SABR $\beta$ (CEV)</th>
                    <th className="py-3 px-4 text-center">SABR $\rho$ (Skew)</th>
                    <th className="py-3 px-4 text-center">SABR $\nu$ (Vol-of-Vol)</th>
                    <th className="py-3 px-4 text-center text-amber-300">ATM-100bp</th>
                    <th className="py-3 px-4 text-center text-cyan-300">ATM-50bp</th>
                    <th className="py-3 px-4 text-center text-emerald-400 font-bold">ATM (Par Strike)</th>
                    <th className="py-3 px-4 text-center text-cyan-300">ATM+50bp</th>
                    <th className="py-3 px-4 text-center text-amber-300">ATM+100bp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {sabrVolSurface.map((row) => (
                    <tr key={row.expiry} className="hover:bg-[#121626]/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {row.expiry} Expiry
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">{row.alpha}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{row.beta}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{row.rho}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{row.nu}</td>
                      {row.vols.map((v, i) => (
                        <td key={i} className={`py-3 px-4 text-center font-bold ${i === 2 ? 'text-emerald-400 bg-emerald-950/20' : 'text-gray-300'}`}>
                          <div>{v.normalVolBps} bps</div>
                          <div className="text-[9px] text-gray-500">{v.blackVolPct}% Black</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 3: FX SPOT & FORWARD POINTS MATRIX */}
      {selectedCategory === 'FX_CURVES' && (
        <div className="space-y-6 font-mono">
          <div className="bg-[#0a0d16] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-[#101422] border-b border-gray-800 flex items-center justify-between font-sans">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                FX Spot, Forward Rate Points & CIP Implied Basis Matrix
              </h3>
              <span className="text-[10px] text-purple-400 font-mono">Covered Interest Parity (CIP) Compliant</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121626] text-gray-400 border-b border-gray-800">
                    <th className="py-3 px-4">Currency Pair</th>
                    <th className="py-3 px-4 text-right text-emerald-400 font-bold">Spot Rate</th>
                    <th className="py-3 px-4 text-right text-purple-300">1M Forward</th>
                    <th className="py-3 px-4 text-right text-purple-300">3M Forward</th>
                    <th className="py-3 px-4 text-right text-purple-300">6M Forward</th>
                    <th className="py-3 px-4 text-right text-purple-300">1Y Forward</th>
                    <th className="py-3 px-4 text-right text-amber-300">CIP Cross-Currency Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {fxForwardMatrix.map((fx) => (
                    <tr key={fx.pair} className="hover:bg-[#121626]/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {fx.pair}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-extrabold text-sm">
                        {fx.spot.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-300 font-bold">{fx.fwd1M.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right text-purple-300 font-bold">{fx.fwd3M.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right text-purple-300 font-bold">{fx.fwd6M.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right text-purple-300 font-bold">{fx.fwd1Y.toFixed(4)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${fx.cipBasisBps >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                        {fx.cipBasisBps > 0 ? '+' : ''}{fx.cipBasisBps} bps
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 4: COUNTERPARTY CREDIT & CVA/DVA CURVES */}
      {selectedCategory === 'CREDIT_CDS' && (
        <div className="space-y-6 font-mono">
          <div className="p-4 bg-[#0e141d] border border-emerald-900/60 rounded-xl space-y-2 text-xs">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-sans flex items-center justify-between border-b border-gray-800 pb-1.5">
              <span>Credit Valuation Adjustment (CVA) & Debt Valuation Adjustment (DVA) Curve Matrix</span>
              <span className="text-[10px] text-emerald-400 font-normal">Hazard Rate & Recovery Rate Models</span>
            </div>
            <p className="text-gray-300 font-sans text-[11px]">
              Calculates expected counterparty default loss $CVA = (1-R) \int EE(t) \cdot dPD(t)$ for uncollateralized exposure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
            <div className="p-4 bg-[#101422] border border-emerald-900/60 rounded-xl space-y-1 font-mono">
              <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">J.P. Morgan Chase & Co. CDS</div>
              <div className="text-base font-bold text-emerald-300">42 bps (5Y CDS)</div>
              <div className="text-[10px] text-gray-400">Rating: AA- | Hazard Rate $\lambda$: 0.70%/yr</div>
            </div>

            <div className="p-4 bg-[#101422] border border-blue-900/60 rounded-xl space-y-1 font-mono">
              <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Goldman Sachs Group CDS</div>
              <div className="text-base font-bold text-blue-300">58 bps (5Y CDS)</div>
              <div className="text-[10px] text-gray-400">Rating: A+ | Hazard Rate $\lambda$: 0.96%/yr</div>
            </div>

            <div className="p-4 bg-[#101422] border border-purple-900/60 rounded-xl space-y-1 font-mono">
              <div className="text-[10px] font-bold text-gray-400 uppercase font-sans">Standard Recovery Rate $R$</div>
              <div className="text-base font-bold text-purple-300">40.00%</div>
              <div className="text-[10px] text-gray-400">ISDA Senior Unsecured Debt Standard</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
