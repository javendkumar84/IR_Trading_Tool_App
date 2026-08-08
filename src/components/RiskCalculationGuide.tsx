import React, { useState } from 'react';
import { BookOpen, Calculator, TrendingUp, Activity, ShieldCheck, DollarSign, Cpu, ArrowRight, Layers, HelpCircle, CheckCircle2, Clock } from 'lucide-react';
import { Currency, ProductType } from '../types';

export const RiskCalculationGuide: React.FC = () => {
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<'VALUATION' | 'FIRST_ORDER' | 'SECOND_ORDER' | 'PNL_METHODOLOGY' | 'VAR_METHODOLOGY' | 'PRODUCT_SPECIFIC'>('VALUATION');

  return (
    <div id="risk-calculation-guide" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0e121c] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-950/80 border border-indigo-700/60 rounded-2xl text-indigo-400 shadow-inner">
            <BookOpen className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-white tracking-wide font-sans">
                Quantitative Risk Calculation Engine & Formulas Guide
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/60 uppercase">
                FINANCIAL MATH SPECIFICATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Complete mathematical definitions, 1st & 2nd order sensitivities, PnL attribution, VaR & CVaR models, and payoff mechanics.
            </p>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setSelectedRiskCategory('VALUATION')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'VALUATION'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            Valuation (PV)
          </button>
          <button
            onClick={() => setSelectedRiskCategory('FIRST_ORDER')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'FIRST_ORDER'
                ? 'bg-blue-600 text-white border-blue-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            1st Order Risk
          </button>
          <button
            onClick={() => setSelectedRiskCategory('SECOND_ORDER')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'SECOND_ORDER'
                ? 'bg-amber-600 text-white border-amber-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            2nd Order Convexity
          </button>
          <button
            onClick={() => setSelectedRiskCategory('PNL_METHODOLOGY')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'PNL_METHODOLOGY'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            PnL Attribution Model
          </button>
          <button
            onClick={() => setSelectedRiskCategory('VAR_METHODOLOGY')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'VAR_METHODOLOGY'
                ? 'bg-rose-600 text-white border-rose-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            VaR & Stress Model
          </button>
          <button
            onClick={() => setSelectedRiskCategory('PRODUCT_SPECIFIC')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedRiskCategory === 'PRODUCT_SPECIFIC'
                ? 'bg-purple-600 text-white border-purple-400 shadow'
                : 'bg-[#141722] text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            Payoffs
          </button>
        </div>
      </div>

      {/* CATEGORY 1: VALUATION & PRESENT VALUE (PV) */}
      {selectedRiskCategory === 'VALUATION' && (
        <div className="space-y-6">
          {/* Executive Overview Card */}
          <div className="bg-[#0d0f12] border border-indigo-900/60 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  1. Present Value (PV) & Net Discounting Mathematics
                </h3>
                <p className="text-xs text-slate-400">
                  Discounted Cash Flow (DCF) Dual-Curve OIS Valuation framework used across all fixed income and interest rate derivative trades.
                </p>
              </div>
            </div>

            {/* Formula Block */}
            <div className="bg-[#121624] border border-indigo-700/60 rounded-xl p-4 font-mono space-y-2">
              <span className="text-xs font-bold text-indigo-300 uppercase block">General Continuous / Discrete Discounting Formula:</span>
              <div className="text-sm font-bold text-emerald-400 bg-[#08090d] p-3 rounded-lg border border-slate-800 leading-relaxed">
                PV = ∑_{'{k=1}'}^{'{N}'} CF_k × P(0, T_k) = ∑_{'{k=1}'}^{'{N}'} CF_k × exp(- r(T_k) × T_k)
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Where <strong>CF_k</strong> is the net cashflow at period k, <strong>P(0, T_k)</strong> is the zero-coupon OIS discount factor for maturity T_k, and <strong>r(T_k)</strong> is the zero rate.
              </p>
            </div>

            {/* Numerical Step-by-Step Example */}
            <div className="bg-[#141722] border border-slate-800 rounded-xl p-5 space-y-3 font-sans">
              <h4 className="text-xs font-bold text-amber-300 uppercase font-mono flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" /> Step-by-Step Numerical Example: 5-Year IRS Valuation
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 bg-[#0d0f12] p-3 rounded-lg border border-slate-800">
                  <span className="font-bold text-white block uppercase text-[11px]">Trade Input Details:</span>
                  <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                    <li>• Notional (N): <strong>$50,000,000 USD</strong></li>
                    <li>• Fixed Rate (K): <strong>3.82%</strong> (Pay Fixed)</li>
                    <li>• Current Market Par Rate (S_0): <strong>3.85%</strong> (Receive Floating SOFR)</li>
                    <li>• Frequency: Semi-Annual (6M, DayCount = 30/360)</li>
                    <li>• 5Y Swap Annuity Factor A_0 = ∑ P(0, T_k) × α_k = <strong>4.4300</strong></li>
                  </ul>
                </div>

                <div className="space-y-2 bg-[#0d0f12] p-3 rounded-lg border border-slate-800">
                  <span className="font-bold text-emerald-400 block uppercase text-[11px]">Calculated PV Result:</span>
                  <div className="font-mono text-[11px] text-slate-300 leading-relaxed">
                    Rate Differential = (Market Rate - Fixed Rate) = 3.85% - 3.82% = <strong>+0.03% (+3 bps)</strong><br/>
                    PV = N × (S_0 - K) × Annuity<br/>
                    PV = $50,000,000 × 0.0003 × 4.4300<br/>
                    <strong className="text-emerald-400 text-sm block mt-1">PV = +$66,450 USD (Positive Mark-to-Market Gain)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 2: 1ST ORDER RISK SENSITIVITIES (DELTA, VEGA, THETA) */}
      {selectedRiskCategory === 'FIRST_ORDER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* DELTA / DV01 CARD */}
            <div className="bg-[#0d0f12] border border-blue-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">1. IR Delta / DV01</h3>
                  <span className="text-[10px] text-blue-300 font-mono">1st Order Rate Sensitivity</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-blue-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-blue-300 uppercase block">Formula:</span>
                <div className="text-blue-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  DV01 = ∂PV / ∂r × 0.0001<br/>
                  DV01 ≈ Notional × Annuity × 0.0001
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Dollar change in Present Value (PV) resulting from a 1 basis point (0.01%) parallel shift in the yield curve.</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example:</span>
                  <div>Notional = $50M, Annuity = 4.43</div>
                  <div>DV01 = $50,000,000 × 4.43 × 0.0001</div>
                  <div className="text-blue-300 font-bold mt-1">DV01 = $22,150 / 1 bps shift</div>
                </div>
              </div>
            </div>

            {/* VEGA CARD */}
            <div className="bg-[#0d0f12] border border-purple-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Activity className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">2. Volatility Vega</h3>
                  <span className="text-[10px] text-purple-300 font-mono">1st Order Vol Sensitivity</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-purple-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-purple-300 uppercase block">Formula:</span>
                <div className="text-purple-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  Vega = ∂PV / ∂σ<br/>
                  Vega ≈ N × Annuity × S_0 × N'(d_1) × √T
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Dollar change in option present value resulting from a 1% absolute shift in implied volatility (Black/SABR vol).</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example (Swaption):</span>
                  <div>Notional = $20M, Vol σ = 25% → 26%</div>
                  <div>Vega = $20M × 0.0012 × 5Y</div>
                  <div className="text-purple-300 font-bold mt-1">Vega = $120,000 / 1% Vol shift</div>
                </div>
              </div>
            </div>

            {/* THETA CARD */}
            <div className="bg-[#0d0f12] border border-rose-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">3. Time Decay (Theta)</h3>
                  <span className="text-[10px] text-rose-300 font-mono">1st Order Time Decay</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-rose-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-rose-300 uppercase block">Formula:</span>
                <div className="text-rose-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  Theta = ∂PV / ∂t<br/>
                  Theta ≈ - (PV × r + N × S_0 × σ × N'(d_1) / (2√T)) / 365
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Daily dollar loss in trade present value as time elapses towards expiry with all market variables held constant.</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example:</span>
                  <div>Cap Premium = $185,000, Expiry = 3Y</div>
                  <div>Theta = - ($185k × 0.0005 + $22.1k × 0.4 + $150)</div>
                  <div className="text-rose-400 font-bold mt-1">Theta = -$8,990 / calendar day</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CATEGORY 3: 2ND ORDER CONVEXITY RISKS (GAMMA, VANNA, VOLGA) */}
      {selectedRiskCategory === 'SECOND_ORDER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* GAMMA CARD */}
            <div className="bg-[#0d0f12] border border-amber-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Cpu className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">1. Rate Gamma (Convexity)</h3>
                  <span className="text-[10px] text-amber-300 font-mono">2nd Order Rate Convexity</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-amber-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-amber-300 uppercase block">Formula:</span>
                <div className="text-amber-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  Gamma = ∂²PV / ∂r² = ∂(DV01) / ∂r<br/>
                  Gamma ≈ N × N'(d_1) / (S_0 × σ × √T)
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Rate of change of Delta (DV01) per 1 basis point shift in underlying interest rate curve. Measures non-linear rate risk.</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example:</span>
                  <div>DV01 = $22,150 / bp</div>
                  <div>Gamma = (DV01 × 0.015) / 10</div>
                  <div className="text-amber-300 font-bold mt-1">Gamma = +33.22 (DV01 increases by $33 per 1bp rate shift)</div>
                </div>
              </div>
            </div>

            {/* VANNA CARD */}
            <div className="bg-[#0d0f12] border border-amber-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Cpu className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">2. Vanna (Cross-Sensitivity)</h3>
                  <span className="text-[10px] text-amber-300 font-mono">2nd Order Cross Risk</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-amber-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-amber-300 uppercase block">Formula:</span>
                <div className="text-amber-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  Vanna = ∂²PV / (∂r ∂σ) = ∂(Vega) / ∂r<br/>
                  Vanna ≈ - Vega × d_2 / σ
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Sensitivity of Delta (DV01) to changes in implied volatility, or sensitivity of Vega to changes in underlying rates.</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example:</span>
                  <div>Vega = $120,000</div>
                  <div>Vanna = Vega × 0.025</div>
                  <div className="text-amber-300 font-bold mt-1">Vanna = +3,000.00 (Delta shifts by $3,000 per 1% Vol shift)</div>
                </div>
              </div>
            </div>

            {/* VOLGA CARD */}
            <div className="bg-[#0d0f12] border border-amber-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Cpu className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">3. Volga / Vomma</h3>
                  <span className="text-[10px] text-amber-300 font-mono">2nd Order Vol Convexity</span>
                </div>
              </div>

              <div className="bg-[#121624] p-3 rounded-xl border border-amber-700/60 font-mono text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-amber-300 uppercase block">Formula:</span>
                <div className="text-amber-300 bg-[#08090d] p-2 rounded border border-slate-800 font-bold">
                  Volga = ∂²PV / ∂σ² = ∂(Vega) / ∂σ<br/>
                  Volga ≈ Vega × (d_1 × d_2) / σ
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 font-sans">
                <p><strong>Definition:</strong> Sensitivity of Vega to changes in implied volatility. Measures volatility smile convexities and tail risk exposure.</p>
                <div className="bg-[#141722] p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-amber-300 font-bold block uppercase text-[10px]">Numerical Example:</span>
                  <div>Vega = $120,000</div>
                  <div>Volga = Vega × 0.045</div>
                  <div className="text-amber-300 font-bold mt-1">Volga = +5,400.00 (Vega increases by $5.4k per 1% Vol expansion)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CATEGORY 4: PnL ATTRIBUTION MODEL METHODOLOGY */}
      {selectedRiskCategory === 'PNL_METHODOLOGY' && (
        <div className="space-y-6">
          <div className="bg-[#0d0f12] border border-emerald-900/60 rounded-2xl p-6 shadow-xl space-y-4 font-sans">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  PnL Attribution Engine & Taylor Expansion Methodology
                </h3>
                <p className="text-xs text-slate-400">
                  Decomposing total trade MTM movement into 1st-order linear sensitivities, 2nd-order convexities, and residual market noise.
                </p>
              </div>
            </div>

            {/* Formula Specification */}
            <div className="bg-[#121624] border border-emerald-700/60 rounded-xl p-4 font-mono space-y-2">
              <span className="text-xs font-bold text-emerald-300 uppercase block">Market Standard PnL Taylor Series Expansion:</span>
              <div className="text-xs font-bold text-emerald-400 bg-[#08090d] p-3 rounded-lg border border-slate-800 leading-relaxed overflow-x-auto">
                Total PnL = ΔPV = [ DV01 × Δr_bps + Vega × Δσ_% + Theta × Δt ] + [ ½ Gamma × (Δr_bps)² + Vanna × Δr_bps × Δσ_% + ½ Volga × (Δσ_%)² ] + Unexplained Residual
              </div>
            </div>

            {/* Component Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[#141722] p-4 rounded-xl border border-blue-900/60 space-y-2">
                <span className="font-bold text-blue-400 uppercase text-xs block">1st Order PnL Components</span>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong>Delta PnL:</strong> Sensitivity to yield curve movements (DV01 × Δr).</li>
                  <li>• <strong>Vega PnL:</strong> Sensitivity to implied volatility changes (Vega × Δσ).</li>
                  <li>• <strong>Theta PnL:</strong> Time decay PnL from one day passage (Theta × Δt).</li>
                </ul>
              </div>

              <div className="bg-[#141722] p-4 rounded-xl border border-amber-900/60 space-y-2">
                <span className="font-bold text-amber-400 uppercase text-xs block">2nd Order PnL Components</span>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong>Gamma PnL:</strong> Yield curve curvature & rate non-linearity (½ Gamma × (Δr)²).</li>
                  <li>• <strong>Vanna PnL:</strong> Cross sensitivity between rate shifts and volatility shifts (Vanna × Δr × Δσ).</li>
                  <li>• <strong>Volga PnL:</strong> Volatility convexity (½ Volga × (Δσ)²).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 5: VALUE AT RISK (VaR) & STRESS TESTING METHODOLOGY */}
      {selectedRiskCategory === 'VAR_METHODOLOGY' && (
        <div className="space-y-6">
          <div className="bg-[#0d0f12] border border-rose-900/60 rounded-2xl p-6 shadow-xl space-y-4 font-sans">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
              <div>
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Value at Risk (VaR), Expected Shortfall (CVaR) & Stress Testing Methodology
                </h3>
                <p className="text-xs text-slate-400">
                  Basel III & FRTB compliant parametric variance-covariance, correlation diversification, and macro scenario stress testing.
                </p>
              </div>
            </div>

            {/* Formula Block */}
            <div className="bg-[#121624] border border-rose-700/60 rounded-xl p-4 font-mono space-y-3">
              <span className="text-xs font-bold text-rose-300 uppercase block">1. Parametric VaR Formula:</span>
              <div className="text-xs font-bold text-rose-400 bg-[#08090d] p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                VaR(α, T) = |DV01_portfolio| × σ_daily × Z_α × √(T)
              </div>

              <span className="text-xs font-bold text-purple-300 uppercase block pt-2">2. Expected Shortfall (CVaR / Conditional VaR):</span>
              <div className="text-xs font-bold text-purple-300 bg-[#08090d] p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                ES_α = E[L | L ≥ VaR_α] = VaR_α × ( φ(Z_α) / (1 - α) )
              </div>
            </div>

            {/* Diversification & Stress Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[#141722] p-4 rounded-xl border border-emerald-900/60 space-y-2">
                <span className="font-bold text-emerald-400 uppercase text-xs block">Portfolio Diversification Benefit</span>
                <div className="bg-[#08090d] p-2.5 rounded border border-slate-800 text-[11px] text-emerald-300">
                  VaR_diversified = √( wᵀ Σ w ) = VaR_undiversified × √( ρ_avg )
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Account for correlation offsets across different interest rate tenors (ρ ≈ 0.75).
                </p>
              </div>

              <div className="bg-[#141722] p-4 rounded-xl border border-rose-900/60 space-y-2">
                <span className="font-bold text-rose-400 uppercase text-xs block">Macro Stress Testing Engine</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  <li>• <strong>Parallel Curve Shift (+200bps):</strong> Loss = |Net DV01| × 200</li>
                  <li>• <strong>Curve Steepening (+120bps):</strong> Loss = |Net DV01| × 120</li>
                  <li>• <strong>Black Swan Liquidity Crunch:</strong> Loss = 3.5 × VaR_99%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 6: PRODUCT PAYOFF MECHANICS & FORMULAS */}
      {selectedRiskCategory === 'PRODUCT_SPECIFIC' && (
        <div className="space-y-6">
          <div className="bg-[#0d0f12] border border-emerald-900/60 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono uppercase border-b border-slate-800 pb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" /> Payoff Calculation Formulas by Product Type
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              
              {/* IRS */}
              <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-blue-400 font-bold">
                  <span>INTEREST RATE SWAP (IRS)</span>
                  <span className="text-[10px] bg-blue-950 px-2 py-0.5 rounded border border-blue-800">Linear Fixed Income</span>
                </div>
                <div className="bg-[#08090d] p-2.5 rounded border border-slate-800 text-[11px] text-emerald-300">
                  Payoff_k = N × (FixedRate - FloatIndex_k) × α_k
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Settle periodic net cashflow differences between fixed coupon rate and floating benchmark fixing rate (SOFR / EURIBOR).
                </p>
              </div>

              {/* CAP / FLOOR */}
              <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>INTEREST RATE CAP / FLOOR</span>
                  <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Option Analytics</span>
                </div>
                <div className="bg-[#08090d] p-2.5 rounded border border-slate-800 text-[11px] text-emerald-300">
                  Caplet_k = N × max(SOFR_k - Strike, 0) × α_k<br/>
                  Floorlet_k = N × max(Strike - SOFR_k, 0) × α_k
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Options on benchmark rates. Cap pays when floating index fixing exceeds strike K; Floor pays when index drops below K.
                </p>
              </div>

              {/* SWAPTION */}
              <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>SWAPTION</span>
                  <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded border border-amber-800">Option on Swap</span>
                </div>
                <div className="bg-[#08090d] p-2.5 rounded border border-slate-800 text-[11px] text-emerald-300">
                  Payer Swaption = N × Annuity(T) × max(ForwardSwapRate - Strike, 0)
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Option granting right to enter an interest rate swap at future expiry T with agreed strike rate K.
                </p>
              </div>

              {/* RANGE ACCRUAL */}
              <div className="bg-[#121624] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-teal-400 font-bold">
                  <span>RANGE ACCRUAL SWAP</span>
                  <span className="text-[10px] bg-teal-950 px-2 py-0.5 rounded border border-teal-800">Exotic Structured</span>
                </div>
                <div className="bg-[#08090d] p-2.5 rounded border border-slate-800 text-[11px] text-emerald-300">
                  Coupon_k = AccrualRate × (N_in / N_total) × α_k
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Accrues interest for each calendar day reference index stays within specified lower and upper barrier bounds [L, U].
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
