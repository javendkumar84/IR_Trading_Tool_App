import React, { useState, useEffect } from 'react';
import { FileCode, Download, Copy, CheckCircle2, AlertCircle, Layers, Calendar, DollarSign, Building, Plus, Info, X, Calculator, Activity, RefreshCw, Cpu } from 'lucide-react';
import {
  CapFloorDetails,
  Currency,
  DayCountConvention,
  FixedLeg,
  FloatingIndex,
  FloatingLeg,
  FxForwardDetails,
  FxOptionDetails,
  GenericSwapLeg,
  IndexTenor,
  IRSwapTrade,
  PaymentFrequency,
  ProductType,
  RangeAccrualDetails,
  SnowRangeDetails,
  TarnDetails,
  SnowballDetails,
  ResetType,
  SwaptionDetails,
  LegType,
  BusinessCalendar,
  BusinessDayRollConvention,
} from '../types';
import { generateIRSwapXml } from '../lib/xmlParser';
import { generateCashflowSchedule, CashflowScheduleSummary, generateIndependentLeg1Schedule, generateIndependentLeg2Schedule, IndependentLegSchedule } from '../lib/cashflowGenerator';
import { getCounterparties, subscribeCounterparties } from '../lib/counterpartyStore';
import { AddCounterpartyModal } from './AddCounterpartyModal';

export interface ValuationModelOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const PRODUCT_VALUATION_MODELS: Record<ProductType, ValuationModelOption[]> = {
  IRS: [
    {
      id: 'DCF_DUAL_CURVE',
      name: 'Discounted Cash Flow (DCF) Dual-Curve OIS Model',
      category: 'Fixed Income Linear Analytics',
      description: 'Projects floating leg fixings via SOFR/EURIBOR forward curve and discounts net cashflows using OIS collateral discount curve.',
    },
    {
      id: 'SINGLE_CURVE_PAR',
      name: 'Single-Curve Par Rate Discounting Model',
      category: 'Legacy Fixed Income Pricing',
      description: 'Discounts all cashflows using a single par yield curve without OIS collateral adjustments.',
    },
    {
      id: 'MULTI_CURVE_TERM',
      name: 'Multi-Curve SOFR/Term Structure Curve Model',
      category: 'Advanced Yield Curve Analytics',
      description: 'Employs separate forward forecasting curves for each tenor (1M, 3M, 6M) and OIS discounting.',
    },
  ],
  CAP_FLOOR: [
    {
      id: 'BLACK_76_SABR',
      name: 'Black-76 / SABR Volatility Surface Model',
      category: 'Interest Rate Option Analytics',
      description: 'Prices caplets/floorlets using Black-76 lognormal formula with SABR volatility surface interpolation across strike and expiry.',
    },
    {
      id: 'BACHELIER_NORMAL',
      name: 'Bachelier Normal Volatility Model',
      category: 'Normal Volatility Analytics',
      description: 'Prices options assuming normal distribution of rate movements, supporting negative strike environments.',
    },
    {
      id: 'HULL_WHITE_1F',
      name: 'Hull-White 1-Factor Short Rate Tree Model',
      category: 'Short-Rate Lattice Engine',
      description: 'Calibrates a 1-factor Hull-White short rate process to price caplets and floorlets via trinomial lattice tree.',
    },
  ],
  SWAPTION: [
    {
      id: 'BACHELIER_BLACK76',
      name: 'Bachelier / Black-76 Normal Volatility Model',
      category: 'Swaption Volatility Analytics',
      description: 'Prices European swaptions via normal/shifted lognormal Black-76 model integrated over swap rate yield curve distribution.',
    },
    {
      id: 'SABR_LOGNORMAL',
      name: 'SABR Lognormal Volatility Smile Model',
      category: 'Swaption Volatility Smile Engine',
      description: 'Captures volatility smile across strikes and underlying swap tenors via SABR alpha-beta-rho-nu parameters.',
    },
    {
      id: 'SLV_SWAPTION',
      name: 'Stochastic Local Volatility (SLV) Swaption Engine',
      category: 'Exotic Swaption Analytics',
      description: 'Combines local volatility surface with stochastic volatility jump-diffusion for complex Bermudan/European swaption pricing.',
    },
  ],
  RANGE_ACCRUAL: [
    {
      id: 'MC_HULL_WHITE_2F',
      name: 'Monte Carlo / Bivariate Hull-White 2F Model',
      category: 'Structured Rates Exotic Analytics',
      description: 'Simulates daily reference rate paths under a 2-factor Hull-White short-rate model to calculate range accrual fraction and NPV.',
    },
    {
      id: 'MARKOV_FUNCTIONAL',
      name: 'Local Volatility Markov Functional Model',
      category: 'Functional Short-Rate Analytics',
      description: 'Maps short-rate state variables to market yield distributions to price range accrual notes efficiently.',
    },
    {
      id: 'CHEYETTE_2F_LMM',
      name: 'Cheyette 2-Factor Libor Market Model (LMM)',
      category: 'Term-Structure Market Model',
      description: 'Simulates forward rate curve dynamics under a 2-factor Cheyette LMM process with daily range barrier observations.',
    },
  ],
  SNOW_RANGE: [
    {
      id: 'MC_LOCAL_VOL_RATCHET',
      name: 'Monte Carlo Path-Dependent Local Volatility Model (Memory Ratchet)',
      category: 'Exotic Path-Dependent Rates Analytics',
      description: 'Simulates daily index paths under local volatility to model memory accrual retention, ratchet bounds, and path-dependent NPV.',
    },
    {
      id: 'HW_2F_MEMORY_TREE',
      name: '2-Factor Hull-White Tree Engine with Memory Accrual',
      category: 'Lattice Exotic Rates Engine',
      description: 'Builds a bivariate short-rate lattice with state variable retention for memory ratchet range accrual coupons.',
    },
    {
      id: 'SLV_MC_SNOW_RANGE',
      name: 'SLV Stochastic Volatility Monte Carlo Engine',
      category: 'Stochastic Volatility Exotic Engine',
      description: 'Combines stochastic volatility with local volatility surface for high-precision memory ratchet pricing under volatile markets.',
    },
  ],
  TARN: [
    {
      id: 'HW_2F_KNOCKOUT_TREE',
      name: 'Hull-White 2-Factor Short-Rate Knock-Out Tree Engine',
      category: 'Target Redemption Exotic Analytics',
      description: 'Models early target redemption knock-out triggers and cumulative coupon caps using a 2-Factor Hull-White lattice tree.',
    },
    {
      id: 'MC_MULTICURVE_KNOCKOUT',
      name: 'Monte Carlo Multi-Curve Path Simulator with Knock-Out',
      category: 'Path-Dependent Simulation Engine',
      description: 'Simulates thousands of forward index paths to evaluate cumulative coupon target cap breach timing and early termination NPV.',
    },
    {
      id: 'BACHELIER_GRID_TARN',
      name: 'Bachelier Shifted-Lognormal Grid Engine',
      category: 'Numerical Grid Solver',
      description: 'Solves partial differential equations on a discrete grid for early target redemption note knock-out surfaces.',
    },
  ],
  SNOWBALL: [
    {
      id: 'BERMUDAN_RATCHET_VOL',
      name: 'Bermudan / Path-Dependent Ratchet Volatility Model',
      category: 'Snowball Structured Swap Analytics',
      description: 'Evaluates path-dependent step-up ratchet coupons and memory floor bounds under lognormal-forward rate volatility.',
    },
    {
      id: 'CHEYETTE_RATCHET_GRID',
      name: 'Cheyette 2-Factor Ratchet Grid Engine',
      category: 'PDE Grid Ratchet Engine',
      description: 'Uses Cheyette dimension reduction to price path-dependent snowball ratchet floaters on a finite difference grid.',
    },
    {
      id: 'MC_RATCHET_VOL',
      name: 'Monte Carlo Ratchet Volatility Model',
      category: 'Path-Dependent Simulation Engine',
      description: 'Simulates forward index paths to calculate expected ratcheted step-up coupons bounded by cap and floor rates.',
    },
  ],
  BOND: [
    {
      id: 'BOND_YTM_DISCOUNT',
      name: 'Yield-To-Maturity (YTM) Cashflow Discount Model',
      category: 'Fixed Income Bond Analytics',
      description: 'Discounts periodic bond coupon and principal cashflows using yield-to-maturity (YTM) and clean/dirty price adjustments.',
    },
    {
      id: 'BOND_OIS_ZERO_CURVE',
      name: 'OIS Zero-Coupon Yield Curve Discount Engine',
      category: 'Sovereign & Corporate Bond Engine',
      description: 'Prices fixed rate bonds using zero-coupon benchmark yield curve discounting and accrued interest formulas.',
    },
    {
      id: 'BOND_CREDIT_SPREAD_MODEL',
      name: 'Z-Spread / Credit Default Spread Pricing Engine',
      category: 'Credit & Spread Fixed Income',
      description: 'Applies zero-volatility credit spread (Z-spread) over benchmark curve to evaluate corporate bond risk premium.',
    },
  ],
  FRA: [
    {
      id: 'FRA_FORWARD_DISCOUNT',
      name: 'Forward Rate Agreement (FRA) Fixing Model',
      category: 'Money Market Analytics',
      description: 'Calculates FRA net settlement cashflow by comparing agreed FRA rate against forward benchmark fixing rate at start of period.',
    },
    {
      id: 'FRA_CONVEXITY_ADJUSTED',
      name: 'Convexity-Adjusted Forward Index Model',
      category: 'Advanced Money Market Engine',
      description: 'Applies convexity adjustment to forward rate fixings for long-dated FRAs and futures implied curves.',
    },
  ],
  DEPOSIT: [
    {
      id: 'TERM_DEPOSIT_MONEY_MARKET',
      name: 'Simple / Compounded Money Market Deposit Model',
      category: 'Cash & Liquidity Analytics',
      description: 'Calculates accrued interest, total maturity cashflows, and net present value for short-term cash term deposits.',
    },
    {
      id: 'DEPOSIT_OIS_CURVE_VALUATION',
      name: 'OIS Curve Cash Liquidity Discount Model',
      category: 'Treasury & Liquidity Management',
      description: 'Evaluates deposit present value using OIS money market curve discounting and term liquidity premiums.',
    },
  ],
  REPO: [
    {
      id: 'REPO_COLLATERAL_HAIRCUT',
      name: 'Repo Collateral Haircut & Cash Leg Discount Model',
      category: 'Secured Financing Analytics',
      description: 'Models initial purchase price cash outflow, collateral haircut evaluation, and final repurchase price interest settlement.',
    },
    {
      id: 'REPO_TRIPLE_PARTY_MARGIN',
      name: 'Tri-Party Collateral Mark-To-Market & Margin Engine',
      category: 'Collateral & Secured Funding',
      description: 'Tracks daily collateral mark-to-market valuations and dynamic margin call thresholds across repo term.',
    },
  ],
  DUAL_DIGITAL: [
    {
      id: 'BIVARIATE_N2_CORRELATION',
      name: 'Bivariate Normal (N2) Implied Correlation Model',
      category: 'Exotic Rates Bivariate Analytics',
      description: 'Evaluates joint binary payoff probability via two-dimensional Gaussian cumulative distribution function N2(d1, d2, rho) incorporating implied correlation between reference rates.',
    },
    {
      id: 'HULL_WHITE_2F_DUAL_DIGITAL',
      name: 'Hull-White 2-Factor Bivariate Short-Rate Engine',
      category: 'Structured Rates Exotic Engine',
      description: 'Simulates correlated short-rate paths under 2-Factor Hull-White model to price joint trigger digital payouts and correlation sensitivity (Copula/Correlation Vega).',
    },
    {
      id: 'SLV_COPULA_DUAL_DIGITAL',
      name: 'Stochastic Local Volatility (SLV) Copula Engine',
      category: 'Advanced Volatility Copula Analytics',
      description: 'Employs Student-t or Gaussian Copula paired with local volatility surfaces to accurately model joint tail dependencies for dual digital payoffs.',
    },
  ],
  FX_FORWARD: [
    {
      id: 'GARMAN_KOHLHAGEN_CIP',
      name: 'Garman-Kohlhagen / Covered Interest Parity (CIP) Model',
      category: 'Foreign Exchange Linear Analytics',
      description: 'Calculates forward exchange rate NPV via spot rate and cross-currency OIS interest rate differential discounting.',
    },
    {
      id: 'XCCY_BASIS_DISCOUNT',
      name: 'Cross-Currency Basis Discounting Model',
      category: 'Multi-Currency Curve Engine',
      description: 'Incorporates cross-currency basis swaps (XCCY bps) into domestic and foreign discounting curves.',
    },
    {
      id: 'OIS_DUAL_CURVE_FX',
      name: 'OIS Dual-Curve Foreign Exchange Forward Engine',
      category: 'OIS Collateral FX Analytics',
      description: 'Prices FX forwards with collateralized OIS curves and cross-currency CSA adjustments.',
    },
  ],
  FX_OPTION: [
    {
      id: 'GARMAN_KOHLHAGEN_SMILE',
      name: 'Garman-Kohlhagen FX Volatility Smile Model',
      category: 'FX Options Volatility Analytics',
      description: 'Prices currency call/put options using Garman-Kohlhagen model with delta-neutral volatility smile surface.',
    },
    {
      id: 'VANNA_VOLGA_PRICING',
      name: 'Vanna-Volga Pricing Engine',
      category: 'FX Smile Interpolation Engine',
      description: 'Rebalances option pricing using Vanna and Volga risk metrics to adjust for ATM vol, Risk Reversal, and Butterfly quotes.',
    },
    {
      id: 'HESTON_STOCHASTIC_VOL',
      name: 'Heston Stochastic Volatility Model',
      category: 'Stochastic FX Volatility Analytics',
      description: 'Models spot FX and volatility dynamics under Heston stochastic process with mean-reverting variance.',
    },
  ],
};

export function getValuationModelForProduct(productType: ProductType, modelId?: string): { name: string; category: string; description: string } {
  const models = PRODUCT_VALUATION_MODELS[productType] || [];
  if (modelId) {
    const matched = models.find((m) => m.id === modelId);
    if (matched) return matched;
  }
  return models[0] || {
    name: 'Discounted Cash Flow (DCF) Dual-Curve Model',
    category: 'Derivatives Pricing',
    description: 'Standard OIS discounted cashflow valuation model.',
  };
}

export function renderPayoffDetails(productType: ProductType) {
  switch (productType) {
    case 'IRS':
      return (
        <div className="bg-[#0b0d10] border border-blue-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Vanilla Interest Rate Swap (IRS)
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Leg1 - Leg2 Net Cashflow
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-blue-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                CF_Fixed = N × R_fixed × α_fixed<br/>
                CF_Float = N × (Index_i + Spread) × α_float<br/>
                Net CF = CF_Receive - CF_Pay
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Fixed leg pays fixed coupon rate annually/semi-annually (30/360). Floating leg resets at period start (or in arrears) using SOFR/EURIBOR and pays quarterly/monthly (ACT/360). Net cashflows settle at payment dates.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Linear yield curve exposure (DV01 / IR Delta). Receiver swap gains NPV when rates decline; Payer swap gains NPV when rates rise. Minimal gamma/vega.
              </p>
            </div>
          </div>
        </div>
      );

    case 'CAP_FLOOR':
      return (
        <div className="bg-[#0b0d10] border border-emerald-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Interest Rate Cap / Floor Option
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: N × max(±(Index - Strike), 0) × α
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-emerald-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Caplet = N × max(SOFR_i - Strike, 0) × α_i<br/>
                Floorlet = N × max(Strike - SOFR_i, 0) × α_i<br/>
                Total Option Value = Σ PV(Caplet_i)
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Buyer pays upfront premium amount. At each fixing reset date i, if index SOFR_i exceeds cap strike K (or drops below floor K), seller pays the rate difference scaled by notional and day count fraction.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Positive Gamma and Vega exposure. Cap value increases with rising forward curves and higher implied volatility surface skew/smile.
              </p>
            </div>
          </div>
        </div>
      );

    case 'SWAPTION':
      return (
        <div className="bg-[#0b0d10] border border-amber-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Swaption (Option on Interest Rate Swap)
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: N × Annuity(T) × max(±(S_T - Strike), 0)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-amber-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Payer Swaption = N × Annuity(T) × max(S_T - K, 0)<br/>
                Receiver Swaption = N × Annuity(T) × max(K - S_T, 0)<br/>
                Annuity(T) = Σ DF(t_i) × α_i
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                At expiry date T, option holder evaluates forward swap rate S_T versus strike K. If in-the-money, cash settlement pays the present value of the underlying swap annuity or physical settlement enters the swap.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Swaption Volatility Vega and Delta. Highly sensitive to swaption normal volatility matrix (Expiry x Tenor) and SABR smile parameters.
              </p>
            </div>
          </div>
        </div>
      );

    case 'RANGE_ACCRUAL':
      return (
        <div className="bg-[#0b0d10] border border-teal-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Range Accrual Swap
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Coupon × (N_in / N_total)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-teal-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Accrual Fraction = N_in / N_total<br/>
                Leg 1 CF_i = N × AccrualRate × (N_in / N_total) × α_i<br/>
                Leg 2 CF_i = N × (SOFR_i + Spread) × α_i
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Daily reference index (e.g. SOFR) is observed every calendar/business day. Every day SOFR remains between lower barrier L and upper barrier U, N_in increments by 1. Leg 1 pays accrued rate. Leg 2 pays funding floating SOFR.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Digital barrier gamma risk at lower/upper barrier edges. Investor receives maximum yield enhancement when index stays within tight range.
              </p>
            </div>
          </div>
        </div>
      );

    case 'SNOW_RANGE':
      return (
        <div className="bg-[#0b0d10] border border-cyan-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: SnowRange Memory Ratchet Swap
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Base + λ × PreviousCoupon × (N_in / N_total)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-cyan-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Coupon_i = BaseCoupon + λ × Coupon_&#123;i-1&#125; × (N_in / N_total)<br/>
                Leg 1 CF_i = N × Coupon_i × α_i<br/>
                Leg 2 Funding = N × (SOFR_i + Spread) × α_i
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Combines range accrual counting with path-dependent memory ratchet. Accrued fraction scales previous period's coupon Coupon_&#123;i-1&#125; with memory factor λ, locking in historical coupon earnings for future compounding.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Path-dependent ratchet volatility and memory retention state. Higher memory factor λ exponentially increases coupon growth during sustained range periods.
              </p>
            </div>
          </div>
        </div>
      );

    case 'TARN':
      return (
        <div className="bg-[#0b0d10] border border-orange-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Target Redemption Note (TARN)
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Early Knock-Out when Cumulative Coupon ≥ Target Cap %
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-orange-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                RawCoupon_i = max(Strike - Lev × SOFR_i, Floor)<br/>
                Coupon_i = min(RawCoupon_i, TargetCap - CumCoupon_&#123;i-1&#125;)<br/>
                If CumCoupon_i ≥ TargetCap → Early Knock-Out!
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Inverse floater structured coupon stream. At each payment period, coupon is added to cumulative total. Once cumulative coupons reach Target Cap % (e.g. 10%), trade pays final capped coupon and terminates early.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Target cap knock-out digital risk & stochastic maturity profile. Effective trade duration shrinks rapidly in favorable low-rate environments.
              </p>
            </div>
          </div>
        </div>
      );

    case 'SNOWBALL':
      return (
        <div className="bg-[#0b0d10] border border-indigo-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Snowball Step-Up Ratchet Swap
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Coupon_i = max(Floor, min(Cap, Coupon_&#123;i-1&#125; + Bonus - Lev × Index))
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-indigo-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Period 1: Coupon_1 = InitialCoupon<br/>
                Period i ≥ 2: Coupon_i = max(Floor, min(Cap, Coupon_&#123;i-1&#125; + BonusStep - Lev × SOFR_i))<br/>
                Leg 1 CF_i = N × Coupon_i × α_i
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Path-dependent ratchet floater. Each period's coupon adds a fixed Bonus Step (e.g. +1.50%) to previous period's coupon Coupon_&#123;i-1&#125; minus leverage-scaled SOFR_i, bounded between global Floor and Cap rates.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Ratchet ratchet floor lock-in effect and short cap volatility. Once coupon steps up, higher floor level is locked for subsequent periods.
              </p>
            </div>
          </div>
        </div>
      );

    case 'FX_FORWARD':
      return (
        <div className="bg-[#0b0d10] border border-purple-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Cross-Currency FX Forward
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Pay N_base | Receive N_base × ForwardRate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-purple-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Pay Amount = N_base (e.g. EUR 15,000,000)<br/>
                Receive Amount = N_base × ForwardRate (e.g. USD 16,275,000)<br/>
                NPV = N_base × [Spot × (DF_foreign / DF_domestic) - ForwardRate]
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Contractual agreement to exchange base currency amount N_base for counter currency amount at agreed forward rate F_fwd on value date T. Forward rate incorporates interest rate parity differential (r_counter - r_base).
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                FX Spot Delta, FX Gamma, Vega (implied volatility smile sensitivity), Rho (interest rate sensitivity), and Theta time decay.
              </p>
            </div>
          </div>
        </div>
      );

    case 'BOND':
      return (
        <div className="bg-[#0b0d10] border border-red-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Fixed Income Bond
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Price = Σ [C_t / (1+y)^t] + [N / (1+y)^T]
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-red-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Coupon CF_t = Principal × (CouponRate / Freq) × α_t<br/>
                Maturity CF_T = Principal + Coupon CF_T<br/>
                Dirty Price = Clean Price + Accrued Interest
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Fixed income coupon stream. Bond issuer pays semi-annual or annual fixed coupons. Full principal face value (100% of par) is returned at maturity date T.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Yield to Maturity (YTM) sensitivity, Macaulay/Modified duration, DV01 ($ per 1bp yield shift), and Z-spread over benchmark yield curve.
              </p>
            </div>
          </div>
        </div>
      );

    case 'FRA':
      return (
        <div className="bg-[#0b0d10] border border-lime-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-lime-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Forward Rate Agreement (FRA)
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Settlement = N × (FixingRate - FraRate) × α / (1 + FixingRate × α)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-lime-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Fixing Rate = Forward Index Rate (e.g. SOFR 3M)<br/>
                Gross Flow = N × (FixingRate - FraRate) × α<br/>
                Discounted Settlement = Gross Flow / (1 + FixingRate × α)
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Over-the-counter contract setting forward interest rate for future period. Settles upfront on fixing date by discounting net rate differential back to settlement date.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Forward index curve DV01 sensitivity, forward curve slope, and convexity adjustment for exchange-traded futures implied rates.
              </p>
            </div>
          </div>
        </div>
      );

    case 'DEPOSIT':
      return (
        <div className="bg-[#0b0d10] border border-yellow-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Cash Term Deposit / Loan
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: Interest = Principal × DepositRate × (TermDays / 360)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-yellow-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Initial Outflow = -Principal (Lend) or +Principal (Borrow)<br/>
                Accrued Interest = Principal × DepositRate × (TermDays / 360)<br/>
                Maturity Cashflow = Principal + Accrued Interest
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Fixed-term cash deposit or loan placement. Initial principal is placed at start date. At maturity, principal plus accrued money market interest is returned.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Money market yield curve DV01 sensitivity, term liquidity premium, and counterparty credit risk.
              </p>
            </div>
          </div>
        </div>
      );

    case 'REPO':
      return (
        <div className="bg-[#0b0d10] border border-violet-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Repurchase Agreement (Repo)
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: RepurchasePrice = PurchasePrice × (1 + RepoRate × α)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-violet-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Purchase Price = Initial Cash Outflow<br/>
                Haircut Collateral = MarketValue × (1 - Haircut%)<br/>
                Repurchase Price = PurchasePrice × (1 + RepoRate × α)
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Secured financing agreement. Cash seller buys bond collateral at start date for purchase price. At end date, cash buyer repurchases collateral for purchase price plus repo rate interest.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Repo rate sensitivity, collateral bond mark-to-market margin calls, and haircut risk buffer.
              </p>
            </div>
          </div>
        </div>
      );

    case 'FX_OPTION':
      return (
        <div className="bg-[#0b0d10] border border-pink-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: European FX Option
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Formula: N_base × max(±(Spot_T - Strike), 0)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Cashflow Payoff Formula</span>
              <div className="font-mono text-pink-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                Call Payoff = N_base × max(Spot_T - Strike, 0)<br/>
                Put Payoff = N_base × max(Strike - Spot_T, 0)<br/>
                Garman-Kohlhagen Premium = e^(-r_f T) N [S N(d1) - K e^(-Δr T) N(d2)]
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Option buyer pays upfront premium amount. On expiry date T (e.g. 15:00 NY Cut), if spot FX is in-the-money relative to strike K, buyer exercises call to buy base currency or put to sell base currency.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                FX Spot Delta, Gamma, FX Implied Volatility Vega, Vanna (skew sensitivity), and Volga (smile curvature sensitivity).
              </p>
            </div>
          </div>
        </div>
      );

    case 'DUAL_DIGITAL':
      return (
        <div className="bg-[#0b0d10] border border-amber-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4" /> Payoff Calculation Mechanics: Dual Digital Interest Rate Swap / Option
            </span>
            <span className="text-[11px] font-mono text-gray-400 bg-[#14171f] px-2 py-0.5 rounded border border-gray-700">
              Payoff: Fixed Binary Payout IF (Index1 ⚡ Trigger1) AND (Index2 ⚡ Trigger2)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">1. Bivariate Binary Payoff Formula</span>
              <div className="font-mono text-amber-300 text-[11px] bg-[#090a0d] p-2 rounded border border-gray-800">
                P(A ∩ B) = N2(d1, d2, ρ)<br/>
                Expected Payoff = FixedPayout × N2(d1, d2, ρ)<br/>
                If Cond1 AND Cond2 satisfied: Pay binary amount else $0
              </div>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">2. Step-by-Step Cashflow Mechanics</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                At fixing/observation date T, both reference rate indices (e.g. SOFR-3M & EURIBOR-3M) are observed simultaneously against their respective trigger rates. The fixed binary payout is triggered if and only if both conditions evaluate to true.
              </p>
            </div>

            <div className="bg-[#12151c] p-3 rounded-lg border border-gray-800/80 space-y-1">
              <span className="font-bold text-gray-300 block text-[11px]">3. Financial Risk & Correlation Sensitivity</span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Highly sensitive to implied bivariate correlation (Correlation Vega ρ). Digital gamma risk near barrier triggers allows significant premium discount relative to two standalone digital options.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

interface XmlBookingProps {
  traderUser: string;
  onTradeBooked: (trade: IRSwapTrade) => void;
}

export const XmlBooking: React.FC<XmlBookingProps> = ({ traderUser, onTradeBooked }) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('IRS');
  const [showXmlModal, setShowXmlModal] = useState<boolean>(false);

  // Valuation Model Selection per product
  const [selectedValuationModelMap, setSelectedValuationModelMap] = useState<Record<ProductType, string>>({
    IRS: 'DCF_DUAL_CURVE',
    CAP_FLOOR: 'BLACK_76_SABR',
    SWAPTION: 'BACHELIER_BLACK76',
    RANGE_ACCRUAL: 'MC_HULL_WHITE_2F',
    SNOW_RANGE: 'MC_LOCAL_VOL_RATCHET',
    TARN: 'HW_2F_KNOCKOUT_TREE',
    SNOWBALL: 'BERMUDAN_RATCHET_VOL',
    FX_FORWARD: 'GARMAN_KOHLHAGEN_CIP',
    FX_OPTION: 'GARMAN_KOHLHAGEN_SMILE',
  });

  // Counterparty Store State
  const [counterparties, setCounterparties] = useState(getCounterparties());
  const [showAddCpModal, setShowAddCpModal] = useState(false);

  useEffect(() => {
    return subscribeCounterparties(() => {
      setCounterparties(getCounterparties());
    });
  }, []);

  // Schedule Date Overrides State
  const [scheduleDateOverrides, setScheduleDateOverrides] = useState<Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>>({});

  const handleBookingDateChange = (periodKey: string, field: 'startDate' | 'endDate' | 'resetStartDate' | 'resetEndDate' | 'payResetDate', value: string) => {
    setScheduleDateOverrides(prev => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        [field]: value
      }
    }));
    setHasPendingChanges(true);
  };

  const handleResetBookingDates = () => {
    setScheduleDateOverrides({});
    setHasPendingChanges(true);
  };

  // Common Header Form State
  const [tradeDate, setTradeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [counterpartyName, setCounterpartyName] = useState('Goldman Sachs International');
  const [counterpartyLei, setCounterpartyLei] = useState('W22LROWP2IHZNBB6K528');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [effectiveDate, setEffectiveDate] = useState('2026-08-01');
  const [maturityDate, setMaturityDate] = useState('2031-08-01');

  // 1. IRS Product State (Leg 1 & Leg 2 Flexible Configuration - Fixed/Float/Basis Swap)
  const [leg1Type, setLeg1Type] = useState<LegType>('FIXED');
  const [leg1Direction, setLeg1Direction] = useState<'PAY' | 'RECEIVE'>('PAY');
  const [leg1Currency, setLeg1Currency] = useState<Currency>('USD');
  const [notional, setNotional] = useState<number>(25000000);
  const [fixedRate, setFixedRate] = useState<number>(3.85);
  const [leg1Index, setLeg1Index] = useState<FloatingIndex>('SOFR');
  const [leg1Tenor, setLeg1Tenor] = useState<IndexTenor>('3M');
  const [leg1ResetType, setLeg1ResetType] = useState<ResetType>('ADVANCE');
  const [leg1SpreadBps, setLeg1SpreadBps] = useState<number>(0);
  const [fixedDayCount, setFixedDayCount] = useState<DayCountConvention>('30/360');
  const [fixedFreq, setFixedFreq] = useState<PaymentFrequency>('6M');
  const [leg1AccrualCalendar, setLeg1AccrualCalendar] = useState<BusinessCalendar>('USNY');
  const [leg1PaymentCalendar, setLeg1PaymentCalendar] = useState<BusinessCalendar>('USNY');
  const [leg1AccrualRoll, setLeg1AccrualRoll] = useState<BusinessDayRollConvention>('MODFOLLOWING');
  const [leg1PaymentRoll, setLeg1PaymentRoll] = useState<BusinessDayRollConvention>('MODFOLLOWING');

  const [leg2Type, setLeg2Type] = useState<LegType>('FLOATING');
  const [leg2Direction, setLeg2Direction] = useState<'PAY' | 'RECEIVE'>('RECEIVE');
  const [leg2Currency, setLeg2Currency] = useState<Currency>('USD');
  const [floatingNotional, setFloatingNotional] = useState<number>(25000000);
  const [leg2FixedRate, setLeg2FixedRate] = useState<number>(3.85);
  const [floatingIndex, setFloatingIndex] = useState<FloatingIndex>('SOFR');
  const [floatingTenor, setFloatingTenor] = useState<IndexTenor>('1M');
  const [leg2ResetType, setLeg2ResetType] = useState<ResetType>('ADVANCE');
  const [spreadBps, setSpreadBps] = useState<number>(0);
  const [floatingDayCount, setFloatingDayCount] = useState<DayCountConvention>('ACT/360');
  const [floatingFreq, setFloatingFreq] = useState<PaymentFrequency>('3M');
  const [leg2AccrualCalendar, setLeg2AccrualCalendar] = useState<BusinessCalendar>('USNY');
  const [leg2PaymentCalendar, setLeg2PaymentCalendar] = useState<BusinessCalendar>('USNY');
  const [leg2AccrualRoll, setLeg2AccrualRoll] = useState<BusinessDayRollConvention>('MODFOLLOWING');
  const [leg2PaymentRoll, setLeg2PaymentRoll] = useState<BusinessDayRollConvention>('MODFOLLOWING');

  // 2. Cap/Floor State
  const [capFloorType, setCapFloorType] = useState<'CAP' | 'FLOOR'>('CAP');
  const [capFloorDirection, setCapFloorDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [capFloorStrike, setCapFloorStrike] = useState<number>(4.0);
  const [capFloorNotional, setCapFloorNotional] = useState<number>(30000000);
  const [capFloorPremium, setCapFloorPremium] = useState<number>(185000);
  const [capFloorIndex, setCapFloorIndex] = useState<FloatingIndex>('SOFR');
  const [capFloorDayCount, setCapFloorDayCount] = useState<DayCountConvention>('ACT/360');
  const [capFloorFreq, setCapFloorFreq] = useState<PaymentFrequency>('3M');

  // 3. Swaption State
  const [swaptionType, setSwaptionType] = useState<'PAYER' | 'RECEIVER'>('PAYER');
  const [swaptionDirection, setSwaptionDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [swaptionStrike, setSwaptionStrike] = useState<number>(3.75);
  const [swaptionOptionExpiry, setSwaptionOptionExpiry] = useState('2027-08-01');
  const [swaptionUnderlyingMaturity, setSwaptionUnderlyingMaturity] = useState('2032-08-01');
  const [swaptionSettlement, setSwaptionSettlement] = useState<'CASH' | 'PHYSICAL'>('CASH');
  const [swaptionNotional, setSwaptionNotional] = useState<number>(20000000);
  const [swaptionPremium, setSwaptionPremium] = useState<number>(310000);
  const [swaptionFixedDayCount, setSwaptionFixedDayCount] = useState<DayCountConvention>('30/360');
  const [swaptionFloatDayCount, setSwaptionFloatDayCount] = useState<DayCountConvention>('ACT/360');
  const [swaptionFixedFreq, setSwaptionFixedFreq] = useState<PaymentFrequency>('6M');
  const [swaptionFloatFreq, setSwaptionFloatFreq] = useState<PaymentFrequency>('3M');

  // 4. FX Forward State
  const [fxBaseCurrency, setFxBaseCurrency] = useState<Currency>('EUR');
  const [fxCounterCurrency, setFxCounterCurrency] = useState<Currency>('USD');
  const [fxDirection, setFxDirection] = useState<'BUY_BASE' | 'SELL_BASE'>('BUY_BASE');
  const [fxBaseAmount, setFxBaseAmount] = useState<number>(15000000);
  const [fxCounterAmount, setFxCounterAmount] = useState<number>(16275000);
  const [fxForwardRate, setFxForwardRate] = useState<number>(1.085);
  const [fxSpotRate, setFxSpotRate] = useState<number>(1.082);
  const [fxSettlementDate, setFxSettlementDate] = useState('2026-12-01');

  // 5. FX Option State
  const [fxOptType, setFxOptType] = useState<'CALL' | 'PUT'>('CALL');
  const [fxOptDirection, setFxOptDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [fxOptStyle, setFxOptStyle] = useState<'EUROPEAN' | 'AMERICAN'>('EUROPEAN');
  const [fxOptCallCurrency, setFxOptCallCurrency] = useState<Currency>('EUR');
  const [fxOptPutCurrency, setFxOptPutCurrency] = useState<Currency>('USD');
  const [fxOptCallAmount, setFxOptCallAmount] = useState<number>(10000000);
  const [fxOptPutAmount, setFxOptPutAmount] = useState<number>(10900000);
  const [fxOptStrikePrice, setFxOptStrikePrice] = useState<number>(1.09);
  const [fxOptExpiryDate, setFxOptExpiryDate] = useState('2026-11-01');
  const [fxOptSettlementDate, setFxOptSettlementDate] = useState('2026-11-03');
  const [fxOptPremium, setFxOptPremium] = useState<number>(180000);

  // 6. Range Accrual State (Leg 1 Structured Range Accrual + Leg 2 Funding Leg)
  const [rangeType, setRangeType] = useState<'DUAL_BARRIER' | 'SINGLE_BARRIER'>('DUAL_BARRIER');
  const [rangeDirection, setRangeDirection] = useState<'PAY' | 'RECEIVE'>('RECEIVE');
  const [lowerBarrier, setLowerBarrier] = useState<number>(2.50);
  const [upperBarrier, setUpperBarrier] = useState<number>(4.50);
  const [accrualCouponRate, setAccrualCouponRate] = useState<number>(5.25);
  const [rangeReferenceIndex, setRangeReferenceIndex] = useState<FloatingIndex>('SOFR');
  const [rangeObservationFreq, setRangeObservationFreq] = useState<'DAILY_BUSINESS' | 'DAILY_CALENDAR'>('DAILY_BUSINESS');
  const [rangeDayCount, setRangeDayCount] = useState<DayCountConvention>('30/360');
  const [rangeFreq, setRangeFreq] = useState<PaymentFrequency>('3M');
  const [rangeNotional, setRangeNotional] = useState<number>(20000000);

  // Range Accrual Leg 2 (Funding Leg) State
  const [rangeFundingLegType, setRangeFundingLegType] = useState<LegType>('FLOATING');
  const [rangeFundingIndex, setRangeFundingIndex] = useState<FloatingIndex>('SOFR');
  const [rangeFundingTenor, setRangeFundingTenor] = useState<IndexTenor>('3M');
  const [rangeFundingSpreadBps, setRangeFundingSpreadBps] = useState<number>(0);
  const [rangeFundingFixedRate, setRangeFundingFixedRate] = useState<number>(3.85);
  const [rangeFundingResetType, setRangeFundingResetType] = useState<ResetType>('ADVANCE');
  const [rangeFundingDayCount, setRangeFundingDayCount] = useState<DayCountConvention>('ACT/360');
  const [rangeFundingFreq, setRangeFundingFreq] = useState<PaymentFrequency>('3M');

  // 7. SnowRange State (Snow Range Accrual with Memory Ratchet)
  const [snowLowerBarrier, setSnowLowerBarrier] = useState<number>(2.00);
  const [snowUpperBarrier, setSnowUpperBarrier] = useState<number>(4.75);
  const [snowBaseCoupon, setSnowBaseCoupon] = useState<number>(5.50);
  const [snowMemoryMult, setSnowMemoryMult] = useState<number>(1.0);
  const [snowMemoryEnabled, setSnowMemoryEnabled] = useState<boolean>(true);
  const [snowRefIndex, setSnowRefIndex] = useState<FloatingIndex>('SOFR');
  const [snowObsFreq, setSnowObsFreq] = useState<'DAILY_CALENDAR' | 'DAILY_BUSINESS'>('DAILY_CALENDAR');
  const [snowPayFreq, setSnowPayFreq] = useState<PaymentFrequency>('3M');
  const [snowDayCount, setSnowDayCount] = useState<DayCountConvention>('30/360');
  const [snowFundingLegType, setSnowFundingLegType] = useState<LegType>('FLOATING');
  const [snowFundingIndex, setSnowFundingIndex] = useState<FloatingIndex>('SOFR');
  const [snowFundingTenor, setSnowFundingTenor] = useState<IndexTenor>('3M');
  const [snowFundingSpreadBps, setSnowFundingSpreadBps] = useState<number>(0);
  const [snowFundingFixedRate, setSnowFundingFixedRate] = useState<number>(3.85);
  const [snowFundingDayCount, setSnowFundingDayCount] = useState<DayCountConvention>('ACT/360');
  const [snowFundingFreq, setSnowFundingFreq] = useState<PaymentFrequency>('3M');
  const [snowNotional, setSnowNotional] = useState<number>(25000000);

  // 8. TARN State (Target Redemption Note / Swap)
  const [tarnDirection, setTarnDirection] = useState<'PAY' | 'RECEIVE'>('RECEIVE');
  const [tarnTargetCapPct, setTarnTargetCapPct] = useState<number>(10.00);
  const [tarnFormulaType, setTarnFormulaType] = useState<'INVERSE_FLOATER' | 'RANGE_ACCRUAL' | 'FIXED_STEP'>('INVERSE_FLOATER');
  const [tarnStrikeRate, setTarnStrikeRate] = useState<number>(6.50);
  const [tarnLeverage, setTarnLeverage] = useState<number>(1.5);
  const [tarnFloorRate, setTarnFloorRate] = useState<number>(0.00);
  const [tarnCapRate, setTarnCapRate] = useState<number>(10.00);
  const [tarnRefIndex, setTarnRefIndex] = useState<FloatingIndex>('SOFR');
  const [tarnPayFreq, setTarnPayFreq] = useState<PaymentFrequency>('3M');
  const [tarnDayCount, setTarnDayCount] = useState<DayCountConvention>('30/360');
  const [tarnFundingLegType, setTarnFundingLegType] = useState<LegType>('FLOATING');
  const [tarnFundingIndex, setTarnFundingIndex] = useState<FloatingIndex>('SOFR');
  const [tarnFundingTenor, setTarnFundingTenor] = useState<IndexTenor>('3M');
  const [tarnFundingSpreadBps, setTarnFundingSpreadBps] = useState<number>(0);
  const [tarnFundingFixedRate, setTarnFundingFixedRate] = useState<number>(3.85);
  const [tarnFundingDayCount, setTarnFundingDayCount] = useState<DayCountConvention>('ACT/360');
  const [tarnFundingFreq, setTarnFundingFreq] = useState<PaymentFrequency>('3M');
  const [tarnNotional, setTarnNotional] = useState<number>(25000000);

  // 9. Snowball State (Snowball Ratchet Structured Swap)
  const [sbDirection, setSbDirection] = useState<'PAY' | 'RECEIVE'>('RECEIVE');
  const [sbInitialCoupon, setSbInitialCoupon] = useState<number>(6.00);
  const [sbBonusStep, setSbBonusStep] = useState<number>(1.50);
  const [sbLeverage, setSbLeverage] = useState<number>(1.0);
  const [sbFloorRate, setSbFloorRate] = useState<number>(0.00);
  const [sbCapRate, setSbCapRate] = useState<number>(12.00);
  const [sbRefIndex, setSbRefIndex] = useState<FloatingIndex>('SOFR');
  const [sbPayFreq, setSbPayFreq] = useState<PaymentFrequency>('3M');
  const [sbDayCount, setSbDayCount] = useState<DayCountConvention>('30/360');
  const [sbFundingLegType, setSbFundingLegType] = useState<LegType>('FLOATING');
  const [sbFundingIndex, setSbFundingIndex] = useState<FloatingIndex>('SOFR');
  const [sbFundingTenor, setSbFundingTenor] = useState<IndexTenor>('3M');
  const [sbFundingSpreadBps, setSbFundingSpreadBps] = useState<number>(0);
  const [sbFundingFixedRate, setSbFundingFixedRate] = useState<number>(3.85);
  const [sbFundingDayCount, setSbFundingDayCount] = useState<DayCountConvention>('ACT/360');
  const [sbFundingFreq, setSbFundingFreq] = useState<PaymentFrequency>('3M');
  const [sbNotional, setSbNotional] = useState<number>(25000000);

  // 14. Dual Digital State
  const [ddDirection, setDdDirection] = useState<'PAY_DIGITAL' | 'RECEIVE_DIGITAL'>('RECEIVE_DIGITAL');
  const [ddPayoutAmount, setDdPayoutAmount] = useState<number>(500000);
  const [ddPayoutType, setDdPayoutType] = useState<'FIXED_AMOUNT' | 'COUPON_PERCENT'>('FIXED_AMOUNT');
  const [ddIndex1, setDdIndex1] = useState<FloatingIndex>('SOFR');
  const [ddIndex1Tenor, setDdIndex1Tenor] = useState<IndexTenor>('3M');
  const [ddCondition1Op, setDdCondition1Op] = useState<'GREATER_THAN' | 'LESS_THAN'>('GREATER_THAN');
  const [ddTrigger1Rate, setDdTrigger1Rate] = useState<number>(4.00);
  const [ddIndex2, setDdIndex2] = useState<FloatingIndex>('EURIBOR');
  const [ddIndex2Tenor, setDdIndex2Tenor] = useState<IndexTenor>('3M');
  const [ddCondition2Op, setDdCondition2Op] = useState<'GREATER_THAN' | 'LESS_THAN'>('LESS_THAN');
  const [ddTrigger2Rate, setDdTrigger2Rate] = useState<number>(3.50);
  const [ddCorrelation, setDdCorrelation] = useState<number>(0.75);
  const [ddObservationType, setDdObservationType] = useState<'AT_MATURITY' | 'DAILY_OBSERVATION'>('AT_MATURITY');
  const [ddNotional, setDdNotional] = useState<number>(10000000);
  const [ddDayCount, setDdDayCount] = useState<DayCountConvention>('30/360');

  // 7. Market Data Environment Used For Trade Pricing & Valuation State
  const [marketEnv, setMarketEnv] = useState<'REALTIME' | 'EOD_NY_CLOSE' | 'LON_1600_FIX' | 'TOKYO_CLOSE'>('EOD_NY_CLOSE');
  const [yieldCurveName, setYieldCurveName] = useState<string>('USD-SOFR-OIS-CURVE');
  const [discountCurveName, setDiscountCurveName] = useState<string>('USD-SOFR-DISCOUNT-OIS');
  const [volSurfaceName, setVolSurfaceName] = useState<string>('SOFR-SABR-VOL-20260801');
  const [fxCurveName, setFxCurveName] = useState<string>('EURUSD-WMREF-FIX-1600');
  const [marketSnapshotTimestamp, setMarketSnapshotTimestamp] = useState<string>('2026-08-01 17:00:00 EST');
  const [benchmarkRatePct, setBenchmarkRatePct] = useState<number>(3.85);
  const [impliedVolPct, setImpliedVolPct] = useState<number>(22.5);

  // Live XML State & Preview Trade
  const [generatedXml, setGeneratedXml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);

  // Current Live Template Trade Object for Cashflow Schedule
  const [previewTrade, setPreviewTrade] = useState<IRSwapTrade | null>(null);

  // Auto calculate counter amount for FX Forward when base amount or rate changes
  useEffect(() => {
    if (selectedProduct === 'FX_FORWARD') {
      setFxCounterAmount(Math.round(fxBaseAmount * fxForwardRate));
    }
  }, [fxBaseAmount, fxForwardRate, selectedProduct]);

  // Pending form changes state tracker
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);

  // Recalculate Live XML & Preview Trade on explicit Apply or Product switch
  const recalculatePreviewTrade = () => {
    let tempTrade: Partial<IRSwapTrade> = {
      id: 'preview-id',
      productType: selectedProduct,
      tradeId: `${selectedProduct}-PREVIEW-001`,
      tradeDate: tradeDate || new Date().toISOString().split('T')[0],
      effectiveDate,
      maturityDate,
      counterpartyName,
      counterpartyLei,
      traderId: traderUser,
      calculationAgent: 'CALC_AGENT_SELF',
      status: 'BOOKED',
      tenorYears: 5,
      parRate: fixedRate,
      dv01: 5000,
      marketData: {
        environment: marketEnv,
        yieldCurveName,
        discountCurveName,
        volSurfaceName,
        fxCurveName,
        marketSnapshotTimestamp,
        benchmarkRatePct,
        impliedVolPct,
      },
      notionalUsd: notional,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (selectedProduct === 'IRS') {
      const leg1Obj: GenericSwapLeg = {
        legType: leg1Type,
        direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional,
        currency: leg1Currency,
        fixedRate: leg1Type === 'FIXED' ? fixedRate : undefined,
        index: leg1Type === 'FLOATING' ? leg1Index : undefined,
        indexTenor: leg1Type === 'FLOATING' ? leg1Tenor : undefined,
        resetType: leg1Type === 'FLOATING' ? leg1ResetType : undefined,
        spreadBps: leg1Type === 'FLOATING' ? leg1SpreadBps : undefined,
        dayCount: fixedDayCount,
        frequency: fixedFreq,
        businessDayConvention: 'MODFOLLOWING',
      };

      const leg2Obj: GenericSwapLeg = {
        legType: leg2Type,
        direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: floatingNotional,
        currency: leg2Currency,
        fixedRate: leg2Type === 'FIXED' ? leg2FixedRate : undefined,
        index: leg2Type === 'FLOATING' ? floatingIndex : undefined,
        indexTenor: leg2Type === 'FLOATING' ? floatingTenor : undefined,
        resetType: leg2Type === 'FLOATING' ? leg2ResetType : undefined,
        spreadBps: leg2Type === 'FLOATING' ? spreadBps : undefined,
        dayCount: floatingDayCount,
        frequency: floatingFreq,
        businessDayConvention: 'MODFOLLOWING',
      };

      tempTrade.leg1 = leg1Obj;
      tempTrade.leg2 = leg2Obj;

      tempTrade.fixedLeg = {
        direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional,
        currency: leg1Currency,
        fixedRate,
        dayCount: fixedDayCount,
        frequency: fixedFreq,
        businessDayConvention: 'MODFOLLOWING',
      };
      tempTrade.floatingLeg = {
        direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: floatingNotional,
        currency: leg2Currency,
        index: floatingIndex,
        indexTenor: floatingTenor,
        resetType: leg2ResetType,
        spreadBps,
        dayCount: floatingDayCount,
        frequency: floatingFreq,
        businessDayConvention: 'MODFOLLOWING',
      };
      tempTrade.notionalUsd = notional;
    } else if (selectedProduct === 'CAP_FLOOR') {
      const details: CapFloorDetails = {
        capFloorType,
        direction: capFloorDirection,
        strikeRate: capFloorStrike,
        underlyingIndex: capFloorIndex,
        indexTenor: '3M',
        currency,
        notional: capFloorNotional,
        premiumAmount: capFloorPremium,
        paymentFrequency: capFloorFreq,
        dayCount: capFloorDayCount,
      };
      tempTrade.capFloorDetails = details;
      tempTrade.notionalUsd = capFloorNotional;
      tempTrade.fixedLeg = {
        direction: 'PAY_FIXED',
        notional: capFloorNotional,
        currency,
        fixedRate: capFloorStrike,
        dayCount: capFloorDayCount,
        frequency: capFloorFreq,
        businessDayConvention: 'MODFOLLOWING',
      };
    } else if (selectedProduct === 'SWAPTION') {
      const details: SwaptionDetails = {
        swaptionType,
        direction: swaptionDirection,
        strikeRate: swaptionStrike,
        optionExpiryDate: swaptionOptionExpiry,
        underlyingMaturityDate: swaptionUnderlyingMaturity,
        underlyingTenorYears: 5,
        settlementType: swaptionSettlement,
        currency,
        notional: swaptionNotional,
        premiumAmount: swaptionPremium,
        underlyingFloatingIndex: 'SOFR',
      };
      tempTrade.swaptionDetails = details;
      tempTrade.notionalUsd = swaptionNotional;
      tempTrade.effectiveDate = swaptionOptionExpiry;
      tempTrade.maturityDate = swaptionUnderlyingMaturity;
      tempTrade.fixedLeg = {
        direction: swaptionType === 'PAYER' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: swaptionNotional,
        currency,
        fixedRate: swaptionStrike,
        dayCount: swaptionFixedDayCount,
        frequency: swaptionFixedFreq,
        businessDayConvention: 'MODFOLLOWING',
      };
      tempTrade.floatingLeg = {
        direction: swaptionType === 'PAYER' ? 'RECEIVE_FIXED' : 'PAY_FIXED',
        notional: swaptionNotional,
        currency,
        index: 'SOFR',
        indexTenor: '3M',
        spreadBps: 0,
        dayCount: swaptionFloatDayCount,
        frequency: swaptionFloatFreq,
        businessDayConvention: 'MODFOLLOWING',
      };
    } else if (selectedProduct === 'FX_FORWARD') {
      const details: FxForwardDetails = {
        currencyPair: `${fxBaseCurrency}/${fxCounterCurrency}`,
        direction: fxDirection,
        baseCurrency: fxBaseCurrency,
        counterCurrency: fxCounterCurrency,
        baseAmount: fxBaseAmount,
        counterAmount: fxCounterAmount,
        forwardRate: fxForwardRate,
        spotRate: fxSpotRate,
        settlementDate: fxSettlementDate,
      };
      tempTrade.fxForwardDetails = details;
      tempTrade.notionalUsd = fxBaseAmount;
      tempTrade.maturityDate = fxSettlementDate;
    } else if (selectedProduct === 'FX_OPTION') {
      const details: FxOptionDetails = {
        optionType: fxOptType,
        direction: fxOptDirection,
        optionStyle: fxOptStyle,
        currencyPair: `${fxOptCallCurrency}/${fxOptPutCurrency}`,
        callCurrency: fxOptCallCurrency,
        callAmount: fxOptCallAmount,
        putCurrency: fxOptPutCurrency,
        putAmount: fxOptPutAmount,
        strikePrice: fxOptStrikePrice,
        expiryDate: fxOptExpiryDate,
        expiryCut: '15:00 NY Cut',
        settlementDate: fxOptSettlementDate,
        premiumAmount: fxOptPremium,
      };
      tempTrade.fxOptionDetails = details;
      tempTrade.notionalUsd = fxOptCallAmount;
      tempTrade.maturityDate = fxOptSettlementDate;
    } else if (selectedProduct === 'RANGE_ACCRUAL') {
      const details: RangeAccrualDetails = {
        rangeType,
        direction: rangeDirection,
        lowerBarrierRate: lowerBarrier,
        upperBarrierRate: upperBarrier,
        referenceIndex: rangeReferenceIndex,
        accrualCouponRate,
        currency,
        notional: rangeNotional,
        observationFrequency: rangeObservationFreq,
        paymentFrequency: rangeFreq,
        dayCount: rangeDayCount,
        fundingLegType: rangeFundingLegType,
        fundingDirection: rangeDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
        fundingIndex: rangeFundingIndex,
        fundingTenor: rangeFundingTenor,
        fundingSpreadBps: rangeFundingSpreadBps,
        fundingFixedRate: rangeFundingFixedRate,
        fundingResetType: rangeFundingResetType,
        fundingNotional: rangeNotional,
        fundingDayCount: rangeFundingDayCount,
        fundingPaymentFrequency: rangeFundingFreq,
      };
      tempTrade.rangeAccrualDetails = details;
      tempTrade.notionalUsd = rangeNotional;
    } else if (selectedProduct === 'SNOW_RANGE') {
      const details: SnowRangeDetails = {
        direction: rangeDirection,
        lowerBarrierRate: snowLowerBarrier,
        upperBarrierRate: snowUpperBarrier,
        baseCouponRate: snowBaseCoupon,
        memoryMultiplier: snowMemoryMult,
        memoryEnabled: snowMemoryEnabled,
        referenceIndex: snowRefIndex,
        currency,
        notional: snowNotional,
        observationFrequency: snowObsFreq,
        paymentFrequency: snowPayFreq,
        dayCount: snowDayCount,
        fundingLegType: snowFundingLegType,
        fundingDirection: rangeDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
        fundingIndex: snowFundingIndex,
        fundingTenor: snowFundingTenor,
        fundingSpreadBps: snowFundingSpreadBps,
        fundingFixedRate: snowFundingFixedRate,
        fundingNotional: snowNotional,
        fundingDayCount: snowFundingDayCount,
        fundingPaymentFrequency: snowFundingFreq,
      };
      tempTrade.snowRangeDetails = details;
      tempTrade.notionalUsd = snowNotional;
    } else if (selectedProduct === 'TARN') {
      const details: TarnDetails = {
        direction: tarnDirection,
        targetCapPct: tarnTargetCapPct,
        couponFormulaType: tarnFormulaType,
        strikeRate: tarnStrikeRate,
        leverageFactor: tarnLeverage,
        floorRate: tarnFloorRate,
        capRate: tarnCapRate,
        referenceIndex: tarnRefIndex,
        currency,
        notional: tarnNotional,
        paymentFrequency: tarnPayFreq,
        dayCount: tarnDayCount,
        fundingLegType: tarnFundingLegType,
        fundingDirection: tarnDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
        fundingIndex: tarnFundingIndex,
        fundingTenor: tarnFundingTenor,
        fundingSpreadBps: tarnFundingSpreadBps,
        fundingFixedRate: tarnFundingFixedRate,
        fundingNotional: tarnNotional,
        fundingDayCount: tarnFundingDayCount,
        fundingPaymentFrequency: tarnFundingFreq,
      };
      tempTrade.tarnDetails = details;
      tempTrade.notionalUsd = tarnNotional;
    } else if (selectedProduct === 'SNOWBALL') {
      const details: SnowballDetails = {
        direction: sbDirection,
        initialCouponRate: sbInitialCoupon,
        bonusStepRate: sbBonusStep,
        leverageFactor: sbLeverage,
        floorRate: sbFloorRate,
        capRate: sbCapRate,
        referenceIndex: sbRefIndex,
        currency,
        notional: sbNotional,
        paymentFrequency: sbPayFreq,
        dayCount: sbDayCount,
        fundingLegType: sbFundingLegType,
        fundingDirection: sbDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
        fundingIndex: sbFundingIndex,
        fundingTenor: sbFundingTenor,
        fundingSpreadBps: sbFundingSpreadBps,
        fundingFixedRate: sbFundingFixedRate,
        fundingNotional: sbNotional,
        fundingDayCount: sbFundingDayCount,
        fundingPaymentFrequency: sbFundingFreq,
      };
      tempTrade.snowballDetails = details;
      tempTrade.notionalUsd = sbNotional;
    } else if (selectedProduct === 'DUAL_DIGITAL') {
      const details: import('../types').DualDigitalDetails = {
        direction: ddDirection,
        digitalPayoutAmount: ddPayoutAmount,
        payoutType: ddPayoutType,
        index1: ddIndex1,
        index1Tenor: ddIndex1Tenor,
        condition1Operator: ddCondition1Op,
        trigger1Rate: ddTrigger1Rate,
        index2: ddIndex2,
        index2Tenor: ddIndex2Tenor,
        condition2Operator: ddCondition2Op,
        trigger2Rate: ddTrigger2Rate,
        impliedCorrelation: ddCorrelation,
        observationType: ddObservationType,
        currency,
        notional: ddNotional,
        dayCount: ddDayCount,
        paymentFrequency: '1Y',
      };
      tempTrade.dualDigitalDetails = details;
      tempTrade.notionalUsd = ddNotional;
    }

    if (Object.keys(scheduleDateOverrides).length > 0) {
      tempTrade.scheduleDateOverrides = scheduleDateOverrides;
    }

    const xmlStr = generateIRSwapXml(tempTrade);
    setGeneratedXml(xmlStr);
    setPreviewTrade(tempTrade as IRSwapTrade);
    setHasPendingChanges(false);
  };

  // Initial calculation on mount or product template switch or valuation date change
  useEffect(() => {
    recalculatePreviewTrade();
  }, [selectedProduct, tradeDate]);

  // Mark pending changes whenever form inputs are modified
  useEffect(() => {
    setHasPendingChanges(true);
  }, [
    tradeDate, counterpartyName, counterpartyLei, currency, effectiveDate, maturityDate,
    leg1Type, leg1Direction, leg1Currency, leg1Index, leg1Tenor, leg1SpreadBps,
    leg2Type, leg2Direction, leg2Currency, leg2FixedRate,
    notional, floatingNotional, fixedRate, fixedDayCount, fixedFreq, floatingIndex, floatingTenor, spreadBps, floatingDayCount, floatingFreq,
    capFloorType, capFloorDirection, capFloorStrike, capFloorNotional, capFloorPremium, capFloorIndex, capFloorDayCount, capFloorFreq,
    swaptionType, swaptionDirection, swaptionStrike, swaptionOptionExpiry, swaptionUnderlyingMaturity, swaptionSettlement, swaptionNotional, swaptionPremium, swaptionFixedDayCount, swaptionFloatDayCount, swaptionFixedFreq, swaptionFloatFreq,
    fxBaseCurrency, fxCounterCurrency, fxDirection, fxBaseAmount, fxCounterAmount, fxForwardRate, fxSpotRate, fxSettlementDate,
    fxOptType, fxOptDirection, fxOptStyle, fxOptCallCurrency, fxOptPutCurrency, fxOptCallAmount, fxOptPutAmount, fxOptStrikePrice, fxOptExpiryDate, fxOptSettlementDate, fxOptPremium,
    rangeType, rangeDirection, lowerBarrier, upperBarrier, accrualCouponRate, rangeReferenceIndex, rangeObservationFreq, rangeDayCount, rangeFreq, rangeNotional,
    rangeFundingLegType, rangeFundingIndex, rangeFundingTenor, rangeFundingSpreadBps, rangeFundingFixedRate, rangeFundingResetType, rangeFundingDayCount, rangeFundingFreq,
    snowLowerBarrier, snowUpperBarrier, snowBaseCoupon, snowMemoryMult, snowMemoryEnabled, snowRefIndex, snowObsFreq, snowPayFreq, snowDayCount, snowFundingLegType, snowFundingIndex, snowFundingTenor, snowFundingSpreadBps, snowFundingFixedRate, snowFundingDayCount, snowFundingFreq, snowNotional,
    tarnDirection, tarnTargetCapPct, tarnFormulaType, tarnStrikeRate, tarnLeverage, tarnFloorRate, tarnCapRate, tarnRefIndex, tarnPayFreq, tarnDayCount, tarnFundingLegType, tarnFundingIndex, tarnFundingTenor, tarnFundingSpreadBps, tarnFundingFixedRate, tarnFundingDayCount, tarnFundingFreq, tarnNotional,
    sbDirection, sbInitialCoupon, sbBonusStep, sbLeverage, sbFloorRate, sbCapRate, sbRefIndex, sbPayFreq, sbDayCount, sbFundingLegType, sbFundingIndex, sbFundingTenor, sbFundingSpreadBps, sbFundingFixedRate, sbFundingDayCount, sbFundingFreq, sbNotional,
    ddDirection, ddPayoutAmount, ddPayoutType, ddIndex1, ddIndex1Tenor, ddCondition1Op, ddTrigger1Rate, ddIndex2, ddIndex2Tenor, ddCondition2Op, ddTrigger2Rate, ddCorrelation, ddObservationType, ddNotional, ddDayCount,
    marketEnv, yieldCurveName, discountCurveName, volSurfaceName, fxCurveName, benchmarkRatePct, impliedVolPct
  ]);

  // Helper to dynamically synchronize market curves, benchmark rates, and vol surfaces based on Currency and Floating Index
  const autoSyncMarketCurves = (ccy: Currency, indexVal?: FloatingIndex, isRealtime?: boolean) => {
    const activeIndex = indexVal || (ccy === 'EUR' ? 'EURIBOR' : ccy === 'GBP' ? 'SONIA' : ccy === 'JPY' ? 'TONA' : 'SOFR');
    
    let yCurve = `${ccy}-${activeIndex}-CURVE`;
    let dCurve = `${ccy}-${activeIndex === 'SOFR' || activeIndex === 'SONIA' || activeIndex === 'TONA' ? 'OIS-DISCOUNT' : 'DISCOUNT-CURVE'}`;
    let volSurf = `${activeIndex}-VOL-SABR-SMILE`;
    let fxCurve = `${ccy}USD-WMREF-FIX-1600`;
    
    let benchRate = 3.85;
    let volPct = 22.5;

    if (ccy === 'EUR') {
      benchRate = 2.75;
      volPct = 18.2;
    } else if (ccy === 'GBP') {
      benchRate = 4.25;
      volPct = 21.0;
    } else if (ccy === 'JPY') {
      benchRate = 0.45;
      volPct = 14.5;
    } else if (ccy === 'CAD') {
      benchRate = 3.25;
      volPct = 19.8;
    } else if (ccy === 'AUD') {
      benchRate = 3.85;
      volPct = 20.5;
    } else if (ccy === 'CHF') {
      benchRate = 1.15;
      volPct = 15.0;
    }

    setYieldCurveName(yCurve);
    setDiscountCurveName(dCurve);
    setVolSurfaceName(volSurf);
    setFxCurveName(fxCurve);
    setBenchmarkRatePct(benchRate);
    setImpliedVolPct(volPct);
    
    if (isRealtime || marketEnv === 'REALTIME') {
      setMarketSnapshotTimestamp(`LIVE REAL-TIME INTRADAY (${new Date().toLocaleTimeString()})`);
    } else {
      setMarketSnapshotTimestamp(`EOD COB ${tradeDate} 17:00:00 EST`);
    }
  };

  // Load Presets per Product
  const handleLoadPreset = (prod: ProductType) => {
    setSelectedProduct(prod);
    if (prod === 'IRS') {
      setCurrency('USD');
      setLeg1Type('FIXED');
      setLeg1Direction('PAY');
      setLeg1Currency('USD');
      setNotional(25000000);
      setFixedRate(3.85);

      setLeg2Type('FLOATING');
      setLeg2Direction('RECEIVE');
      setLeg2Currency('USD');
      setFloatingNotional(25000000);
      setFloatingIndex('SOFR');
      setFloatingTenor('1M');

      setFixedDayCount('30/360');
      setFloatingDayCount('ACT/360');
      setFixedFreq('6M');
      setFloatingFreq('3M');
    } else if (prod === 'CAP_FLOOR') {
      setCurrency('USD');
      setCapFloorType('CAP');
      setCapFloorDirection('BUY');
      setCapFloorStrike(4.00);
      setCapFloorNotional(30000000);
      setCapFloorPremium(185000);
      setCapFloorIndex('SOFR');
      setCapFloorDayCount('ACT/360');
      setCapFloorFreq('3M');
    } else if (prod === 'SWAPTION') {
      setCurrency('EUR');
      setSwaptionType('PAYER');
      setSwaptionDirection('BUY');
      setSwaptionStrike(2.75);
      setSwaptionOptionExpiry('2027-08-01');
      setSwaptionUnderlyingMaturity('2032-08-01');
      setSwaptionSettlement('CASH');
      setSwaptionNotional(20000000);
      setSwaptionPremium(310000);
      setSwaptionFixedDayCount('30/360');
      setSwaptionFloatDayCount('ACT/360');
      setSwaptionFixedFreq('6M');
      setSwaptionFloatFreq('3M');
    } else if (prod === 'RANGE_ACCRUAL') {
      setCurrency('USD');
      setRangeType('DUAL_BARRIER');
      setRangeDirection('RECEIVE');
      setLowerBarrier(2.50);
      setUpperBarrier(4.50);
      setAccrualCouponRate(5.25);
      setRangeReferenceIndex('SOFR');
      setRangeNotional(20000000);
      setRangeFreq('3M');
      setRangeDayCount('30/360');
    } else if (prod === 'FX_FORWARD') {
      setFxBaseCurrency('EUR');
      setFxCounterCurrency('USD');
      setFxDirection('BUY_BASE');
      setFxBaseAmount(15000000);
      setFxCounterAmount(16275000);
      setFxForwardRate(1.085);
      setFxSpotRate(1.082);
      setFxSettlementDate('2026-12-01');
    } else if (prod === 'FX_OPTION') {
      setFxOptType('CALL');
      setFxOptDirection('BUY');
      setFxOptStyle('EUROPEAN');
      setFxOptCallCurrency('EUR');
      setFxOptPutCurrency('USD');
      setFxOptCallAmount(10000000);
      setFxOptPutAmount(10900000);
      setFxOptStrikePrice(1.09);
      setFxOptExpiryDate('2026-11-01');
      setFxOptSettlementDate('2026-11-03');
      setFxOptPremium(180000);
    } else if (prod === 'SNOW_RANGE') {
      setCurrency('USD');
      setSnowLowerBarrier(2.00);
      setSnowUpperBarrier(4.75);
      setSnowBaseCoupon(5.50);
      setSnowMemoryMult(1.0);
      setSnowMemoryEnabled(true);
      setSnowRefIndex('SOFR');
      setSnowObsFreq('DAILY_CALENDAR');
      setSnowPayFreq('3M');
      setSnowDayCount('30/360');
      setSnowNotional(25000000);
    } else if (prod === 'TARN') {
      setCurrency('USD');
      setTarnDirection('RECEIVE');
      setTarnTargetCapPct(10.00);
      setTarnFormulaType('INVERSE_FLOATER');
      setTarnStrikeRate(6.50);
      setTarnLeverage(1.5);
      setTarnFloorRate(0.00);
      setTarnCapRate(10.00);
      setTarnRefIndex('SOFR');
      setTarnPayFreq('3M');
      setTarnDayCount('30/360');
      setTarnNotional(25000000);
    } else if (prod === 'SNOWBALL') {
      setCurrency('USD');
      setSbDirection('RECEIVE');
      setSbInitialCoupon(6.00);
      setSbBonusStep(1.50);
      setSbLeverage(1.0);
      setSbFloorRate(0.00);
      setSbCapRate(12.00);
      setSbRefIndex('SOFR');
      setSbPayFreq('3M');
      setSbDayCount('30/360');
      setSbNotional(25000000);
    }
  };

  // Submit Trade via Form
  const handleBookFromForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);

    try {
      let tradePayload: any = {
        productType: selectedProduct,
        tradeDate: new Date().toISOString().split('T')[0],
        effectiveDate,
        maturityDate,
        counterpartyLei,
        counterpartyName,
        traderId: traderUser,
        calculationAgent: 'CALC_AGENT_SELF',
      };

      if (selectedProduct === 'IRS') {
        tradePayload.leg1 = {
          legType: leg1Type,
          direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional,
          currency: leg1Currency,
          fixedRate: leg1Type === 'FIXED' ? fixedRate : undefined,
          index: leg1Type === 'FLOATING' ? leg1Index : undefined,
          indexTenor: leg1Type === 'FLOATING' ? leg1Tenor : undefined,
          spreadBps: leg1Type === 'FLOATING' ? leg1SpreadBps : undefined,
          dayCount: fixedDayCount,
          frequency: fixedFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
        tradePayload.leg2 = {
          legType: leg2Type,
          direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: floatingNotional,
          currency: leg2Currency,
          fixedRate: leg2Type === 'FIXED' ? leg2FixedRate : undefined,
          index: leg2Type === 'FLOATING' ? floatingIndex : undefined,
          indexTenor: leg2Type === 'FLOATING' ? floatingTenor : undefined,
          spreadBps: leg2Type === 'FLOATING' ? spreadBps : undefined,
          dayCount: floatingDayCount,
          frequency: floatingFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
        tradePayload.fixedLeg = {
          direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional,
          currency: leg1Currency,
          fixedRate,
          dayCount: fixedDayCount,
          frequency: fixedFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
        tradePayload.floatingLeg = {
          direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: floatingNotional,
          currency: leg2Currency,
          index: floatingIndex,
          indexTenor: floatingTenor,
          spreadBps,
          dayCount: floatingDayCount,
          frequency: floatingFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
      } else if (selectedProduct === 'CAP_FLOOR') {
        tradePayload.capFloorDetails = {
          capFloorType,
          direction: capFloorDirection,
          strikeRate: capFloorStrike,
          underlyingIndex: capFloorIndex,
          indexTenor: '3M',
          currency,
          notional: capFloorNotional,
          premiumAmount: capFloorPremium,
          paymentFrequency: capFloorFreq,
          dayCount: capFloorDayCount,
        };
      } else if (selectedProduct === 'SWAPTION') {
        tradePayload.effectiveDate = swaptionOptionExpiry;
        tradePayload.maturityDate = swaptionUnderlyingMaturity;
        tradePayload.swaptionDetails = {
          swaptionType,
          direction: swaptionDirection,
          strikeRate: swaptionStrike,
          optionExpiryDate: swaptionOptionExpiry,
          underlyingMaturityDate: swaptionUnderlyingMaturity,
          underlyingTenorYears: 5,
          settlementType: swaptionSettlement,
          currency,
          notional: swaptionNotional,
          premiumAmount: swaptionPremium,
          underlyingFloatingIndex: 'SOFR',
        };
        tradePayload.fixedLeg = {
          direction: swaptionType === 'PAYER' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: swaptionNotional,
          currency,
          fixedRate: swaptionStrike,
          dayCount: swaptionFixedDayCount,
          frequency: swaptionFixedFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
        tradePayload.floatingLeg = {
          direction: swaptionType === 'PAYER' ? 'RECEIVE_FIXED' : 'PAY_FIXED',
          notional: swaptionNotional,
          currency,
          index: 'SOFR',
          indexTenor: '3M',
          spreadBps: 0,
          dayCount: swaptionFloatDayCount,
          frequency: swaptionFloatFreq,
          businessDayConvention: 'MODFOLLOWING',
        };
      } else if (selectedProduct === 'FX_FORWARD') {
        tradePayload.maturityDate = fxSettlementDate;
        tradePayload.fxForwardDetails = {
          currencyPair: `${fxBaseCurrency}/${fxCounterCurrency}`,
          direction: fxDirection,
          baseCurrency: fxBaseCurrency,
          counterCurrency: fxCounterCurrency,
          baseAmount: fxBaseAmount,
          counterAmount: fxCounterAmount,
          forwardRate: fxForwardRate,
          spotRate: fxSpotRate,
          settlementDate: fxSettlementDate,
        };
      } else if (selectedProduct === 'FX_OPTION') {
        tradePayload.maturityDate = fxOptSettlementDate;
        tradePayload.fxOptionDetails = {
          optionType: fxOptType,
          direction: fxOptDirection,
          optionStyle: fxOptStyle,
          currencyPair: `${fxOptCallCurrency}/${fxOptPutCurrency}`,
          callCurrency: fxOptCallCurrency,
          callAmount: fxOptCallAmount,
          putCurrency: fxOptPutCurrency,
          putAmount: fxOptPutAmount,
          strikePrice: fxOptStrikePrice,
          expiryDate: fxOptExpiryDate,
          expiryCut: '15:00 NY Cut',
          settlementDate: fxOptSettlementDate,
          premiumAmount: fxOptPremium,
        };
      } else if (selectedProduct === 'RANGE_ACCRUAL') {
        tradePayload.rangeAccrualDetails = {
          rangeType,
          direction: rangeDirection,
          lowerBarrierRate: lowerBarrier,
          upperBarrierRate: upperBarrier,
          referenceIndex: rangeReferenceIndex,
          accrualCouponRate,
          currency,
          notional: rangeNotional,
          observationFrequency: rangeObservationFreq,
          paymentFrequency: rangeFreq,
          dayCount: rangeDayCount,
          fundingLegType: rangeFundingLegType,
          fundingDirection: rangeDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
          fundingIndex: rangeFundingIndex,
          fundingTenor: rangeFundingTenor,
          fundingSpreadBps: rangeFundingSpreadBps,
          fundingFixedRate: rangeFundingFixedRate,
          fundingResetType: rangeFundingResetType,
          fundingNotional: rangeNotional,
          fundingDayCount: rangeFundingDayCount,
          fundingPaymentFrequency: rangeFundingFreq,
        };
      } else if (selectedProduct === 'SNOW_RANGE') {
        tradePayload.snowRangeDetails = {
          direction: rangeDirection,
          lowerBarrierRate: snowLowerBarrier,
          upperBarrierRate: snowUpperBarrier,
          baseCouponRate: snowBaseCoupon,
          memoryMultiplier: snowMemoryMult,
          memoryEnabled: snowMemoryEnabled,
          referenceIndex: snowRefIndex,
          currency,
          notional: snowNotional,
          observationFrequency: snowObsFreq,
          paymentFrequency: snowPayFreq,
          dayCount: snowDayCount,
          fundingLegType: snowFundingLegType,
          fundingDirection: rangeDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
          fundingIndex: snowFundingIndex,
          fundingTenor: snowFundingTenor,
          fundingSpreadBps: snowFundingSpreadBps,
          fundingFixedRate: snowFundingFixedRate,
          fundingNotional: snowNotional,
          fundingDayCount: snowFundingDayCount,
          fundingPaymentFrequency: snowFundingFreq,
        };
      } else if (selectedProduct === 'TARN') {
        tradePayload.tarnDetails = {
          direction: tarnDirection,
          targetCapPct: tarnTargetCapPct,
          couponFormulaType: tarnFormulaType,
          strikeRate: tarnStrikeRate,
          leverageFactor: tarnLeverage,
          floorRate: tarnFloorRate,
          capRate: tarnCapRate,
          referenceIndex: tarnRefIndex,
          currency,
          notional: tarnNotional,
          paymentFrequency: tarnPayFreq,
          dayCount: tarnDayCount,
          fundingLegType: tarnFundingLegType,
          fundingDirection: tarnDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
          fundingIndex: tarnFundingIndex,
          fundingTenor: tarnFundingTenor,
          fundingSpreadBps: tarnFundingSpreadBps,
          fundingFixedRate: tarnFundingFixedRate,
          fundingNotional: tarnNotional,
          fundingDayCount: tarnFundingDayCount,
          fundingPaymentFrequency: tarnFundingFreq,
        };
      } else if (selectedProduct === 'SNOWBALL') {
        tradePayload.snowballDetails = {
          direction: sbDirection,
          initialCouponRate: sbInitialCoupon,
          bonusStepRate: sbBonusStep,
          leverageFactor: sbLeverage,
          floorRate: sbFloorRate,
          capRate: sbCapRate,
          referenceIndex: sbRefIndex,
          currency,
          notional: sbNotional,
          paymentFrequency: sbPayFreq,
          dayCount: sbDayCount,
          fundingLegType: sbFundingLegType,
          fundingDirection: sbDirection === 'RECEIVE' ? 'PAY' : 'RECEIVE',
          fundingIndex: sbFundingIndex,
          fundingTenor: sbFundingTenor,
          fundingSpreadBps: sbFundingSpreadBps,
          fundingFixedRate: sbFundingFixedRate,
          fundingNotional: sbNotional,
          fundingDayCount: sbFundingDayCount,
          fundingPaymentFrequency: sbFundingFreq,
        };
      } else if (selectedProduct === 'DUAL_DIGITAL') {
        tradePayload.dualDigitalDetails = {
          direction: ddDirection,
          digitalPayoutAmount: ddPayoutAmount,
          payoutType: ddPayoutType,
          index1: ddIndex1,
          index1Tenor: ddIndex1Tenor,
          condition1Operator: ddCondition1Op,
          trigger1Rate: ddTrigger1Rate,
          index2: ddIndex2,
          index2Tenor: ddIndex2Tenor,
          condition2Operator: ddCondition2Op,
          trigger2Rate: ddTrigger2Rate,
          impliedCorrelation: ddCorrelation,
          observationType: ddObservationType,
          currency,
          notional: ddNotional,
          dayCount: ddDayCount,
          paymentFrequency: '1Y',
        };
      }

      tradePayload.valuationModel = getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).name;

      if (Object.keys(scheduleDateOverrides).length > 0) {
        tradePayload.scheduleDateOverrides = scheduleDateOverrides;
      }

      const resp = await fetch('/api/trades/book-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade: tradePayload, user: { id: 'TRADER_01', name: traderUser } }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Failed to book trade.');
      }

      const bookedTrade: IRSwapTrade = await resp.json();
      setBookingSuccessMsg(`Trade successfully booked! Product: [${bookedTrade.productType}] ID: ${bookedTrade.tradeId} persisted in SQLite.`);
      onTradeBooked(bookedTrade);
    } catch (err: any) {
      setBookingErrorMsg(err.message || 'Error booking trade.');
    } finally {
      setIsLoading(false);
    }
  };

  // Live calculated cashflow schedules for preview trade
  const liveScheduleSummary: CashflowScheduleSummary | null = previewTrade ? generateCashflowSchedule(previewTrade, scheduleDateOverrides) : null;
  const independentLeg1Summary: IndependentLegSchedule | null = previewTrade ? generateIndependentLeg1Schedule(previewTrade, scheduleDateOverrides) : null;
  const independentLeg2Summary: IndependentLegSchedule | null = previewTrade ? generateIndependentLeg2Schedule(previewTrade, scheduleDateOverrides) : null;

  return (
    <div id="xml-capture-suite" className="space-y-6 pb-12">
      
      {/* Header Banner & Multi-Product Selector */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Multi-Product Derivative Trade Booking Engine
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Select product type, capture full trade attributes with exact leg conventions, generate ISO 20022/FpML 5.11 XML, and persist to SQLite.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowXmlModal(true)}
              className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="View live FpML 5.11 XML payload"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              View FpML XML
            </button>
          </div>
        </div>

        {/* Product Type Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-14 gap-2 pt-2 border-t border-gray-800/60">
          {[
            { type: 'IRS', label: '1. IR Swap', desc: 'Interest Rate Swap', color: 'border-blue-500 text-blue-400' },
            { type: 'CAP_FLOOR', label: '2. Cap / Floor', desc: 'IR Option', color: 'border-emerald-500 text-emerald-400' },
            { type: 'SWAPTION', label: '3. Swaption', desc: 'Option on IRS', color: 'border-amber-500 text-amber-400' },
            { type: 'RANGE_ACCRUAL', label: '4. Range Accrual', desc: 'Structured IR', color: 'border-teal-500 text-teal-300' },
            { type: 'SNOW_RANGE', label: '5. SnowRange', desc: 'Memory Accrual', color: 'border-cyan-500 text-cyan-300' },
            { type: 'TARN', label: '6. TARN Swap', desc: 'Target Knock-Out', color: 'border-orange-500 text-orange-400' },
            { type: 'SNOWBALL', label: '7. Snowball', desc: 'Ratchet Struct', color: 'border-indigo-500 text-indigo-300' },
            { type: 'FX_FORWARD', label: '8. FX Forward', desc: 'Currency Forward', color: 'border-purple-500 text-purple-400' },
            { type: 'FX_OPTION', label: '9. FX Option', desc: 'Currency Option', color: 'border-pink-500 text-pink-400' },
            { type: 'BOND', label: '10. Bond', desc: 'Fixed Income', color: 'border-red-500 text-red-400' },
            { type: 'FRA', label: '11. FRA', desc: 'Forward Rate', color: 'border-lime-500 text-lime-400' },
            { type: 'DEPOSIT', label: '12. Deposit', desc: 'Term Cash Loan', color: 'border-yellow-500 text-yellow-400' },
            { type: 'REPO', label: '13. Repo', desc: 'Repurchase Agmt', color: 'border-violet-500 text-violet-400' },
            { type: 'DUAL_DIGITAL', label: '14. Dual Digital', desc: 'Bivariate Digital IR', color: 'border-amber-400 text-amber-300' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setSelectedProduct(item.type as ProductType)}
              className={`p-2 text-left rounded-lg border transition-all cursor-pointer ${
                selectedProduct === item.type
                  ? `bg-[#16181d] ${item.color} shadow-lg font-bold`
                  : 'border-gray-800 bg-[#0a0b0d] text-gray-400 hover:border-gray-700'
              }`}
            >
              <div className="text-[11px] font-semibold truncate">{item.label}</div>
              <div className="text-[9px] text-gray-500 truncate">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* Valuation & Pricing Model Selection Dropdown */}
        <div className="bg-[#111318] border border-blue-900/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-950/60 border border-blue-800/60 rounded-lg text-blue-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Pricing & Valuation Model Selector:</label>
                <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/80 rounded text-[10px] font-mono font-semibold">
                  {getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).category}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).description}
              </p>
            </div>
          </div>

          <div className="min-w-[340px] shrink-0">
            <select
              value={selectedValuationModelMap[selectedProduct] || PRODUCT_VALUATION_MODELS[selectedProduct][0].id}
              onChange={(e) =>
                setSelectedValuationModelMap((prev) => ({
                  ...prev,
                  [selectedProduct]: e.target.value,
                }))
              }
              className="w-full bg-[#090a0c] border border-blue-700/60 text-white rounded-lg px-3 py-2 text-xs font-mono font-semibold focus:outline-none focus:border-blue-400 shadow-inner cursor-pointer"
            >
              {PRODUCT_VALUATION_MODELS[selectedProduct].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Payoff Calculation Details */}
        {renderPayoffDetails(selectedProduct)}
      </div>

      {/* Status Alerts */}
      {bookingSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bookingSuccessMsg}</span>
        </div>
      )}

      {bookingErrorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{bookingErrorMsg}</span>
        </div>
      )}

      {/* Main Trade Booking Form */}
      <div className="w-full">
        
        <form onSubmit={handleBookFromForm} className="w-full space-y-5 bg-[#0d0f12] border border-gray-800 rounded-xl p-6 shadow-xl">
          
          {/* 1. Common Trade Header */}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400" />
            1. General Trade Dates & Counterparty ({selectedProduct})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] uppercase font-bold text-gray-500">Counterparty Name</label>
                <button
                  type="button"
                  onClick={() => setShowAddCpModal(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <select
                value={counterpartyName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setCounterpartyName(selectedName);
                  const found = counterparties.find((c) => c.name === selectedName);
                  if (found) {
                    setCounterpartyLei(found.lei);
                  }
                }}
                className="w-full bg-[#16181d] border border-blue-500/80 rounded p-2 text-sm text-white font-semibold focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                {counterparties.map((cp) => (
                  <option key={cp.id} value={cp.name}>
                    {cp.name} ({cp.rating})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Counterparty LEI / Code</label>
              <input
                type="text"
                value={counterpartyLei}
                onChange={(e) => setCounterpartyLei(e.target.value)}
                className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* General Primary Currency Dropdown */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-blue-400" />
                Trade Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  const newCcy = e.target.value as Currency;
                  setCurrency(newCcy);
                  setLeg1Currency(newCcy);
                  setLeg2Currency(newCcy);
                  setFxBaseCurrency(newCcy);
                  setFxOptCallCurrency(newCcy);
                  autoSyncMarketCurves(newCcy);
                }}
                className="w-full bg-[#16181d] border border-blue-600/80 rounded p-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="USD">USD (US Dollar $)</option>
                <option value="EUR">EUR (Euro €)</option>
                <option value="GBP">GBP (British Pound £)</option>
                <option value="JPY">JPY (Japanese Yen ¥)</option>
                <option value="CAD">CAD (Canadian Dollar $)</option>
                <option value="AUD">AUD (Australian Dollar $)</option>
                <option value="CHF">CHF (Swiss Franc CHF)</option>
              </select>
            </div>

            {/* Trade Pay / Receive Structure Dropdown */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" />
                Pay / Receive Structure
              </label>
              <select
                value={leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'PAY_FIXED') {
                    setLeg1Direction('PAY');
                    setLeg2Direction('RECEIVE');
                  } else {
                    setLeg1Direction('RECEIVE');
                    setLeg2Direction('PAY');
                  }
                }}
                className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="PAY_FIXED">PAY FIXED / RECEIVE FLOAT (Pay Leg 1 / Rec Leg 2)</option>
                <option value="RECEIVE_FIXED">RECEIVE FIXED / PAY FLOAT (Rec Leg 1 / Pay Leg 2)</option>
              </select>
            </div>

            {/* Valuation Date Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-300" />
                Valuation Date (PV Date)
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-xs text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                required
              />
            </div>

            {selectedProduct !== 'SWAPTION' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">StartDate (Effective Date)</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            {selectedProduct !== 'FX_FORWARD' && selectedProduct !== 'FX_OPTION' && selectedProduct !== 'SWAPTION' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">EndDate (Maturity Date)</label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}
          </div>

          {/* LIVE TRADE PRESENT VALUE (PV) & QUANTITATIVE PRICING MODEL PANEL */}
          <div className="bg-gradient-to-r from-[#0d1322] via-[#0f172a] to-[#0d1322] p-4 rounded-xl border border-blue-600/60 font-mono shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-950/80 border border-blue-700/60 rounded-lg text-blue-400">
                  <Calculator className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 font-sans">
                    Live Trade Valuation & Quantitative Pricing Model
                    <span className="px-2 py-0.5 bg-blue-950 text-blue-300 text-[10px] rounded border border-blue-700 font-mono">
                      {selectedProduct}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 font-sans">
                    Real-time computed Present Value (PV), interest rate sensitivity ($\Delta$), and quantitative model specification
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  Valuation Date: {tradeDate} (COB)
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  {discountCurveName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
              {/* 1. Calculated Present Value (PV) Field */}
              <div className="bg-[#121624] p-3 rounded-lg border border-blue-700/80 space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-blue-300 font-sans flex items-center justify-between">
                  <span>Calculated Present Value (PV)</span>
                  <span className="text-[9px] text-amber-300 font-bold bg-amber-950/80 px-1 rounded border border-amber-800">
                    Val Date: {tradeDate}
                  </span>
                </label>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-extrabold font-mono ${ (liveScheduleSummary?.totalPV || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' }`}>
                    {currency} { (liveScheduleSummary?.totalPV || 0).toLocaleString() }
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-sans font-bold">
                    {currency}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-sans truncate" title="Discounted net cashflow sum over yield curve as of valuation date">
                  Valuation Date: <strong>{tradeDate}</strong> | PV = ∑ CF_k × DF(ValDate, T_k)
                </div>
              </div>

              {/* 2. Quantitative Valuation Model Used Field (Interactive Selection) */}
              <div className="bg-[#121624] p-3 rounded-lg border border-indigo-700/80 space-y-1.5 col-span-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-indigo-300 font-sans flex items-center justify-between">
                  <span>Valuation Model Used for PV</span>
                  <span className="text-[9px] text-indigo-300 font-normal bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-700/60 font-mono">
                    {getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).category}
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
                  <select
                    value={selectedValuationModelMap[selectedProduct] || PRODUCT_VALUATION_MODELS[selectedProduct][0].id}
                    onChange={(e) =>
                      setSelectedValuationModelMap((prev) => ({
                        ...prev,
                        [selectedProduct]: e.target.value,
                      }))
                    }
                    className="w-full bg-[#0a0c14] border border-indigo-500 text-white rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:border-indigo-400 shadow-inner cursor-pointer"
                  >
                    {PRODUCT_VALUATION_MODELS[selectedProduct].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-400 font-sans truncate" title={getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).description}>
                  {getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).description}
                </div>
              </div>

              {/* 3. Interest Rate Sensitivity (DV01) Field */}
              <div className="bg-[#121624] p-3 rounded-lg border border-teal-700/80 space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-teal-300 font-sans flex items-center justify-between">
                  <span>IR Sensitivity (DV01)</span>
                  <span className="text-[9px] text-teal-400 font-mono">$ / 1 bps</span>
                </label>
                <div className="text-base font-bold text-teal-300 font-mono">
                  ${ (liveScheduleSummary?.totalIrDelta || 2600).toLocaleString() }
                </div>
                <div className="text-[10px] text-gray-400 font-sans truncate">
                  Delta shift per 1 bps curve move
                </div>
              </div>
            </div>
          </div>

          {/* MARKET DATA ENVIRONMENT SECTION CARD */}
          <div className="bg-[#0f121a] p-4 rounded-xl border border-indigo-900/60 font-mono space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Market Data & Valuation Curves Environment Used
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/60">
                  SNAPSHOT: {marketSnapshotTimestamp}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              {/* Market Data Environment Source */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-indigo-300 mb-1">Market Data Source / Mode</label>
                <select
                  value={marketEnv}
                  onChange={(e) => {
                    const env = e.target.value as any;
                    setMarketEnv(env);
                    if (env === 'REALTIME') {
                      setMarketSnapshotTimestamp(`LIVE REAL-TIME INTRADAY (${new Date().toLocaleTimeString()})`);
                    } else if (env === 'EOD_NY_CLOSE') {
                      setMarketSnapshotTimestamp(`EOD COB ${tradeDate} 17:00:00 EST`);
                    } else if (env === 'LON_1600_FIX') {
                      setMarketSnapshotTimestamp(`EOD COB ${tradeDate} 16:00:00 GMT`);
                    } else if (env === 'TOKYO_CLOSE') {
                      setMarketSnapshotTimestamp(`EOD COB ${tradeDate} 15:00:00 JST`);
                    }
                  }}
                  className="w-full bg-[#16181d] border border-indigo-600 rounded p-2 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-indigo-400"
                >
                  <option value="EOD_NY_CLOSE">EOD NY Close Market Data ({tradeDate} 17:00 EST)</option>
                  <option value="REALTIME">⚡ Real-Time Live Streaming Market Data (Intraday Live Feed)</option>
                  <option value="LON_1600_FIX">EOD London 16:00 WM/Ref Fixing ({tradeDate} 16:00 GMT)</option>
                  <option value="TOKYO_CLOSE">EOD Tokyo Close Market Data ({tradeDate} 15:00 JST)</option>
                </select>
              </div>

              {/* Yield Curve Name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Forecast Yield / Benchmark Curve</label>
                <input
                  type="text"
                  value={yieldCurveName}
                  onChange={(e) => setYieldCurveName(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. USD-SOFR-OIS-CURVE"
                />
              </div>

              {/* Discount Curve Name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Discounting / OIS Curve</label>
                <input
                  type="text"
                  value={discountCurveName}
                  onChange={(e) => setDiscountCurveName(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. USD-SOFR-DISCOUNT-OIS"
                />
              </div>

              {/* Volatility Surface Name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Vol Surface / Model</label>
                <input
                  type="text"
                  value={volSurfaceName}
                  onChange={(e) => setVolSurfaceName(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  placeholder="e.g. SOFR-SABR-VOL-20260801"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-1 border-t border-gray-800/60">
              {/* Market Benchmark Rate */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Market Benchmark Par Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={benchmarkRatePct}
                  onChange={(e) => setBenchmarkRatePct(Number(e.target.value))}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono font-bold"
                />
              </div>

              {/* Implied Volatility % */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Implied Volatility (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={impliedVolPct}
                  onChange={(e) => setImpliedVolPct(Number(e.target.value))}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono font-bold"
                />
              </div>

              {/* FX Spot / Forward Curve */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">FX Curve / Spot Reference</label>
                <input
                  type="text"
                  value={fxCurveName}
                  onChange={(e) => setFxCurveName(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-cyan-300 font-mono font-bold"
                />
              </div>

              {/* Snapshot Timestamp Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Market Snapshot Timestamp</label>
                <input
                  type="text"
                  value={marketSnapshotTimestamp}
                  onChange={(e) => setMarketSnapshotTimestamp(e.target.value)}
                  className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-gray-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC PRODUCT SPECIFIC INPUTS */}

          {/* PRODUCT 1: IRS */}
          {selectedProduct === 'IRS' && (
            <>
              {/* LEG 1 FORM CARD */}
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2 flex items-center justify-between font-mono">
                <span>2. Leg 1 Parameters (Fixed or Floating Leg)</span>
                <span className="text-[10px] text-gray-400">Current: {leg1Type} LEG</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#12141a] p-4 rounded-xl border border-blue-900/60 font-mono">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 1 Type</label>
                  <select
                    value={leg1Type}
                    onChange={(e) => setLeg1Type(e.target.value as LegType)}
                    className="w-full bg-[#16181d] border border-blue-600 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="FIXED">FIXED RATE LEG</option>
                    <option value="FLOATING">FLOATING INDEX LEG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Direction</label>
                  <select
                    value={leg1Direction}
                    onChange={(e) => setLeg1Direction(e.target.value as 'PAY' | 'RECEIVE')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="PAY">PAY</option>
                    <option value="RECEIVE">RECEIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Currency</label>
                  <select
                    value={leg1Currency}
                    onChange={(e) => setLeg1Currency(e.target.value as Currency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Notional ({leg1Currency})</label>
                  <input
                    type="number"
                    step="100000"
                    value={notional}
                    onChange={(e) => setNotional(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                {leg1Type === 'FIXED' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 1 Fixed Coupon Rate (%)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={fixedRate}
                      onChange={(e) => setFixedRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-blue-500 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>
                )}

                {leg1Type === 'FLOATING' && (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Benchmark Index</label>
                      <select
                        value={leg1Index}
                        onChange={(e) => {
                          const idx = e.target.value as FloatingIndex;
                          setLeg1Index(idx);
                          autoSyncMarketCurves(leg1Currency, idx);
                        }}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="SOFR">SOFR</option>
                        <option value="EURIBOR">EURIBOR</option>
                        <option value="SONIA">SONIA</option>
                        <option value="TONA">TONA</option>
                        <option value="LIBOR-3M">LIBOR-3M</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Index Tenor</label>
                      <select
                        value={leg1Tenor}
                        onChange={(e) => setLeg1Tenor(e.target.value as IndexTenor)}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="1D">1D (1 Day)</option>
                        <option value="1M">1M (1 Month)</option>
                        <option value="3M">3M (3 Months)</option>
                        <option value="6M">6M (6 Months)</option>
                        <option value="12M">12M (1 Year)</option>
                        <option value="2Y">2Y (2 Years)</option>
                        <option value="5Y">5Y (5 Years)</option>
                        <option value="10Y">10Y (10 Years)</option>
                        <option value="20Y">20Y (20 Years)</option>
                        <option value="30Y">30Y (30 Years)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Reset Type</label>
                      <select
                        value={leg1ResetType}
                        onChange={(e) => setLeg1ResetType(e.target.value as ResetType)}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="ADVANCE">IN ADVANCE (Start of Period)</option>
                        <option value="ARREARS">IN ARREARS (End of Period)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Spread (Bps)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={leg1SpreadBps}
                        onChange={(e) => setLeg1SpreadBps(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Day Count</label>
                  <select
                    value={fixedDayCount}
                    onChange={(e) => setFixedDayCount(e.target.value as DayCountConvention)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white"
                  >
                    <option value="30/360">30/360 (Standard)</option>
                    <option value="ACT/360">ACT/360</option>
                    <option value="ACT/365">ACT/365</option>
                    <option value="ACT/ACT">ACT/ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Frequency</label>
                  <select
                    value={fixedFreq}
                    onChange={(e) => setFixedFreq(e.target.value as PaymentFrequency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="1D">Daily (1D)</option>
                    <option value="1M">Monthly (1M)</option>
                    <option value="3M">Quarterly (3M)</option>
                    <option value="6M">Semi-Annually (6M)</option>
                    <option value="1Y">Annually (1Y)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">Leg 1 Accrual Calendar</label>
                  <select
                    value={leg1AccrualCalendar}
                    onChange={(e) => setLeg1AccrualCalendar(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-blue-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USNY">USNY (New York)</option>
                    <option value="GBLO">GBLO (London)</option>
                    <option value="EUTA">EUTA (TARGET/Euro)</option>
                    <option value="JPTO">JPTO (Tokyo)</option>
                    <option value="CATO">CATO (Toronto)</option>
                    <option value="AUSY">AUSY (Sydney)</option>
                    <option value="CHZH">CHZH (Zurich)</option>
                    <option value="USNY+GBLO">USNY + GBLO Joint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-emerald-300 mb-1">Leg 1 Payment Calendar</label>
                  <select
                    value={leg1PaymentCalendar}
                    onChange={(e) => setLeg1PaymentCalendar(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-emerald-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USNY">USNY (New York)</option>
                    <option value="GBLO">GBLO (London)</option>
                    <option value="EUTA">EUTA (TARGET/Euro)</option>
                    <option value="JPTO">JPTO (Tokyo)</option>
                    <option value="CATO">CATO (Toronto)</option>
                    <option value="AUSY">AUSY (Sydney)</option>
                    <option value="CHZH">CHZH (Zurich)</option>
                    <option value="USNY+GBLO">USNY + GBLO Joint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Leg 1 Accrual Roll Convention</label>
                  <select
                    value={leg1AccrualRoll}
                    onChange={(e) => setLeg1AccrualRoll(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-amber-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="MODFOLLOWING">MODFOLLOWING (Modified Following)</option>
                    <option value="FOLLOWING">FOLLOWING</option>
                    <option value="PRECEDING">PRECEDING</option>
                    <option value="MODPRECEDING">MODPRECEDING</option>
                    <option value="NONE">NONE (No Adjustment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Leg 1 Payment Roll Convention</label>
                  <select
                    value={leg1PaymentRoll}
                    onChange={(e) => setLeg1PaymentRoll(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-purple-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="MODFOLLOWING">MODFOLLOWING (Modified Following)</option>
                    <option value="FOLLOWING">FOLLOWING</option>
                    <option value="PRECEDING">PRECEDING</option>
                    <option value="MODPRECEDING">MODPRECEDING</option>
                    <option value="NONE">NONE (No Adjustment)</option>
                  </select>
                </div>
              </div>

              {/* LEG 2 FORM CARD */}
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2 flex items-center justify-between font-mono">
                <span>3. Leg 2 Parameters (Fixed or Float Basis Swap)</span>
                <span className="text-[10px] text-gray-400">Current: {leg2Type} LEG</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#12141a] p-4 rounded-xl border border-amber-900/60 font-mono">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Type</label>
                  <select
                    value={leg2Type}
                    onChange={(e) => setLeg2Type(e.target.value as LegType)}
                    className="w-full bg-[#16181d] border border-amber-600 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="FLOATING">FLOATING INDEX LEG</option>
                    <option value="FIXED">FIXED RATE LEG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Direction</label>
                  <select
                    value={leg2Direction}
                    onChange={(e) => setLeg2Direction(e.target.value as 'PAY' | 'RECEIVE')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="RECEIVE">RECEIVE</option>
                    <option value="PAY">PAY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Currency</label>
                  <select
                    value={leg2Currency}
                    onChange={(e) => setLeg2Currency(e.target.value as Currency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Notional ({leg2Currency})</label>
                  <input
                    type="number"
                    step="100000"
                    value={floatingNotional}
                    onChange={(e) => setFloatingNotional(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono font-bold"
                  />
                </div>

                {leg2Type === 'FIXED' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 2 Fixed Rate (%)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={leg2FixedRate}
                      onChange={(e) => setLeg2FixedRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-blue-500 rounded p-2 text-sm text-white font-mono font-bold"
                    />
                  </div>
                )}

                {leg2Type === 'FLOATING' && (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Benchmark Index</label>
                      <select
                        value={floatingIndex}
                        onChange={(e) => {
                          const idx = e.target.value as FloatingIndex;
                          setFloatingIndex(idx);
                          autoSyncMarketCurves(leg2Currency, idx);
                        }}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="SOFR">SOFR</option>
                        <option value="EURIBOR">EURIBOR</option>
                        <option value="SONIA">SONIA</option>
                        <option value="TONA">TONA</option>
                        <option value="LIBOR-3M">LIBOR-3M</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Index Tenor</label>
                      <select
                        value={floatingTenor}
                        onChange={(e) => setFloatingTenor(e.target.value as IndexTenor)}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="1D">1D (1 Day)</option>
                        <option value="1M">1M (1 Month)</option>
                        <option value="3M">3M (3 Months)</option>
                        <option value="6M">6M (6 Months)</option>
                        <option value="12M">12M (1 Year)</option>
                        <option value="2Y">2Y (2 Years)</option>
                        <option value="5Y">5Y (5 Years)</option>
                        <option value="10Y">10Y (10 Years)</option>
                        <option value="20Y">20Y (20 Years)</option>
                        <option value="30Y">30Y (30 Years)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Reset Type</label>
                      <select
                        value={leg2ResetType}
                        onChange={(e) => setLeg2ResetType(e.target.value as ResetType)}
                        className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-bold"
                      >
                        <option value="ADVANCE">IN ADVANCE (Start of Period)</option>
                        <option value="ARREARS">IN ARREARS (End of Period)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Spread (Bps)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={spreadBps}
                        onChange={(e) => setSpreadBps(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Day Count</label>
                  <select
                    value={floatingDayCount}
                    onChange={(e) => setFloatingDayCount(e.target.value as DayCountConvention)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white"
                  >
                    <option value="ACT/360">ACT/360 (Standard)</option>
                    <option value="30/360">30/360</option>
                    <option value="ACT/365">ACT/365</option>
                    <option value="ACT/ACT">ACT/ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Frequency</label>
                  <select
                    value={floatingFreq}
                    onChange={(e) => setFloatingFreq(e.target.value as PaymentFrequency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="1D">Daily (1D)</option>
                    <option value="1M">Monthly (1M)</option>
                    <option value="3M">Quarterly (3M)</option>
                    <option value="6M">Semi-Annually (6M)</option>
                    <option value="1Y">Annually (1Y)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">Leg 2 Accrual Calendar</label>
                  <select
                    value={leg2AccrualCalendar}
                    onChange={(e) => setLeg2AccrualCalendar(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-blue-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USNY">USNY (New York)</option>
                    <option value="GBLO">GBLO (London)</option>
                    <option value="EUTA">EUTA (TARGET/Euro)</option>
                    <option value="JPTO">JPTO (Tokyo)</option>
                    <option value="CATO">CATO (Toronto)</option>
                    <option value="AUSY">AUSY (Sydney)</option>
                    <option value="CHZH">CHZH (Zurich)</option>
                    <option value="USNY+GBLO">USNY + GBLO Joint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-emerald-300 mb-1">Leg 2 Payment Calendar</label>
                  <select
                    value={leg2PaymentCalendar}
                    onChange={(e) => setLeg2PaymentCalendar(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-emerald-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="USNY">USNY (New York)</option>
                    <option value="GBLO">GBLO (London)</option>
                    <option value="EUTA">EUTA (TARGET/Euro)</option>
                    <option value="JPTO">JPTO (Tokyo)</option>
                    <option value="CATO">CATO (Toronto)</option>
                    <option value="AUSY">AUSY (Sydney)</option>
                    <option value="CHZH">CHZH (Zurich)</option>
                    <option value="USNY+GBLO">USNY + GBLO Joint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Leg 2 Accrual Roll Convention</label>
                  <select
                    value={leg2AccrualRoll}
                    onChange={(e) => setLeg2AccrualRoll(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-amber-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="MODFOLLOWING">MODFOLLOWING (Modified Following)</option>
                    <option value="FOLLOWING">FOLLOWING</option>
                    <option value="PRECEDING">PRECEDING</option>
                    <option value="MODPRECEDING">MODPRECEDING</option>
                    <option value="NONE">NONE (No Adjustment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">Leg 2 Payment Roll Convention</label>
                  <select
                    value={leg2PaymentRoll}
                    onChange={(e) => setLeg2PaymentRoll(e.target.value as any)}
                    className="w-full bg-[#16181d] border border-purple-600/80 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="MODFOLLOWING">MODFOLLOWING (Modified Following)</option>
                    <option value="FOLLOWING">FOLLOWING</option>
                    <option value="PRECEDING">PRECEDING</option>
                    <option value="MODPRECEDING">MODPRECEDING</option>
                    <option value="NONE">NONE (No Adjustment)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 2: CAP / FLOOR */}
          {selectedProduct === 'CAP_FLOOR' && (
            <>
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2">
                2. Interest Rate Cap / Floor Option Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Option Structure Type</label>
                  <select
                    value={capFloorType}
                    onChange={(e) => setCapFloorType(e.target.value as 'CAP' | 'FLOOR')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="CAP">CAP (Ceiling Protection)</option>
                    <option value="FLOOR">FLOOR (Floor Protection)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Option Position Direction</label>
                  <select
                    value={capFloorDirection}
                    onChange={(e) => setCapFloorDirection(e.target.value as 'BUY' | 'SELL')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="BUY">BUY (Long Option - Pay Premium)</option>
                    <option value="SELL">SELL (Short Option - Receive Premium)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Strike Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={capFloorStrike}
                    onChange={(e) => setCapFloorStrike(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-emerald-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Notional Amount ({currency})</label>
                  <input
                    type="number"
                    step="100000"
                    value={capFloorNotional}
                    onChange={(e) => setCapFloorNotional(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Upfront Premium Amount ({currency})</label>
                  <input
                    type="number"
                    step="1000"
                    value={capFloorPremium}
                    onChange={(e) => setCapFloorPremium(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-purple-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Underlying Benchmark Index</label>
                  <select
                    value={capFloorIndex}
                    onChange={(e) => setCapFloorIndex(e.target.value as FloatingIndex)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="SOFR">SOFR</option>
                    <option value="EURIBOR">EURIBOR</option>
                    <option value="SONIA">SONIA</option>
                    <option value="TONA">TONA</option>
                    <option value="LIBOR-3M">LIBOR-3M</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Day Count Convention</label>
                  <select
                    value={capFloorDayCount}
                    onChange={(e) => setCapFloorDayCount(e.target.value as DayCountConvention)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="ACT/360">ACT/360 (Standard)</option>
                    <option value="30/360">30/360</option>
                    <option value="ACT/365">ACT/365</option>
                    <option value="ACT/ACT">ACT/ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Caplet / Floorlet Reset Frequency</label>
                  <select
                    value={capFloorFreq}
                    onChange={(e) => setCapFloorFreq(e.target.value as PaymentFrequency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="1M">1 Month (1M)</option>
                    <option value="3M">3 Months (3M)</option>
                    <option value="6M">6 Months (6M)</option>
                    <option value="1Y">1 Year (1Y)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 3: SWAPTION */}
          {selectedProduct === 'SWAPTION' && (
            <>
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2">
                2. Swaption Option & Underlying Swap Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Swaption Type</label>
                  <select
                    value={swaptionType}
                    onChange={(e) => setSwaptionType(e.target.value as 'PAYER' | 'RECEIVER')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="PAYER">PAYER (Option to Pay Fixed / Rec Float)</option>
                    <option value="RECEIVER">RECEIVER (Option to Rec Fixed / Pay Float)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Position Direction</label>
                  <select
                    value={swaptionDirection}
                    onChange={(e) => setSwaptionDirection(e.target.value as 'BUY' | 'SELL')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="BUY">BUY (Long Swaption)</option>
                    <option value="SELL">SELL (Short Swaption)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Underlying Fixed Strike (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={swaptionStrike}
                    onChange={(e) => setSwaptionStrike(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Option Expiry Date</label>
                  <input
                    type="date"
                    value={swaptionOptionExpiry}
                    onChange={(e) => setSwaptionOptionExpiry(e.target.value)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Underlying Swap Maturity Date</label>
                  <input
                    type="date"
                    value={swaptionUnderlyingMaturity}
                    onChange={(e) => setSwaptionUnderlyingMaturity(e.target.value)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Settlement Type</label>
                  <select
                    value={swaptionSettlement}
                    onChange={(e) => setSwaptionSettlement(e.target.value as 'CASH' | 'PHYSICAL')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="CASH">CASH SETTLED</option>
                    <option value="PHYSICAL">PHYSICAL DELIVERY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Underlying Swap Notional ({currency})</label>
                  <input
                    type="number"
                    step="100000"
                    value={swaptionNotional}
                    onChange={(e) => setSwaptionNotional(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Option Premium ({currency})</label>
                  <input
                    type="number"
                    step="1000"
                    value={swaptionPremium}
                    onChange={(e) => setSwaptionPremium(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-purple-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Fixed Leg Day Count</label>
                  <select
                    value={swaptionFixedDayCount}
                    onChange={(e) => setSwaptionFixedDayCount(e.target.value as DayCountConvention)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="30/360">30/360</option>
                    <option value="ACT/360">ACT/360</option>
                    <option value="ACT/365">ACT/365</option>
                    <option value="ACT/ACT">ACT/ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Floating Leg Day Count</label>
                  <select
                    value={swaptionFloatDayCount}
                    onChange={(e) => setSwaptionFloatDayCount(e.target.value as DayCountConvention)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="ACT/360">ACT/360</option>
                    <option value="30/360">30/360</option>
                    <option value="ACT/365">ACT/365</option>
                    <option value="ACT/ACT">ACT/ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Fixed Payment Freq</label>
                  <select
                    value={swaptionFixedFreq}
                    onChange={(e) => setSwaptionFixedFreq(e.target.value as PaymentFrequency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="6M">6 Months (6M)</option>
                    <option value="1Y">1 Year (1Y)</option>
                    <option value="3M">3 Months (3M)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Float Reset Freq</label>
                  <select
                    value={swaptionFloatFreq}
                    onChange={(e) => setSwaptionFloatFreq(e.target.value as PaymentFrequency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="3M">3 Months (3M)</option>
                    <option value="6M">6 Months (6M)</option>
                    <option value="1M">1 Month (1M)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 4: RANGE ACCRUAL (LEG 1 & LEG 2) */}
          {selectedProduct === 'RANGE_ACCRUAL' && (
            <>
              {/* LEG 1: STRUCTURED RANGE ACCRUAL STREAM */}
              <div className="p-4 bg-[#12141a] border border-teal-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>2. Leg 1 — Structured Range Accrual Stream</span>
                  <span className="text-[10px] font-normal text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-700/60">Structured Coupon Leg</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Direction</label>
                    <select
                      value={rangeDirection}
                      onChange={(e) => setRangeDirection(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="RECEIVE">RECEIVE Range Accrual Coupon</option>
                      <option value="PAY">PAY Range Accrual Coupon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-teal-300 mb-1">Accrual Coupon Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={accrualCouponRate}
                      onChange={(e) => setAccrualCouponRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-teal-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Range Barrier Type</label>
                    <select
                      value={rangeType}
                      onChange={(e) => setRangeType(e.target.value as 'DUAL_BARRIER' | 'SINGLE_BARRIER')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-semibold"
                    >
                      <option value="DUAL_BARRIER">DUAL BARRIER (Lower & Upper)</option>
                      <option value="SINGLE_BARRIER">SINGLE BARRIER (Lower Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Lower Barrier Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={lowerBarrier}
                      onChange={(e) => setLowerBarrier(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  {rangeType === 'DUAL_BARRIER' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Upper Barrier Rate (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={upperBarrier}
                        onChange={(e) => setUpperBarrier(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-emerald-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Accrual Reference Index</label>
                    <select
                      value={rangeReferenceIndex}
                      onChange={(e) => setRangeReferenceIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                      <option value="TONA">TONA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Observation Frequency</label>
                    <select
                      value={rangeObservationFreq}
                      onChange={(e) => setRangeObservationFreq(e.target.value as 'DAILY_BUSINESS' | 'DAILY_CALENDAR')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="DAILY_BUSINESS">DAILY BUSINESS DAYS (Mon-Fri)</option>
                      <option value="DAILY_CALENDAR">DAILY CALENDAR DAYS (365 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Notional ({currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={rangeNotional}
                      onChange={(e) => setRangeNotional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Day Count</label>
                    <select
                      value={rangeDayCount}
                      onChange={(e) => setRangeDayCount(e.target.value as DayCountConvention)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="30/360">30/360</option>
                      <option value="ACT/360">ACT/360</option>
                      <option value="ACT/365">ACT/365</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Payment Frequency</label>
                    <select
                      value={rangeFreq}
                      onChange={(e) => setRangeFreq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="3M">3 Months (3M)</option>
                      <option value="6M">6 Months (6M)</option>
                      <option value="1M">1 Month (1M)</option>
                      <option value="1Y">1 Year (1Y)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LEG 2: FUNDING STREAM */}
              <div className="p-4 bg-[#12141a] border border-blue-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>3. Leg 2 — Funding Stream (Counter Leg)</span>
                  <span className="text-[10px] font-normal text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60">Floating/Fixed Funding</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Funding Type</label>
                    <select
                      value={rangeFundingLegType}
                      onChange={(e) => setRangeFundingLegType(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="FLOATING">FLOATING (Floating SOFR/Index)</option>
                      <option value="FIXED">FIXED (Fixed Funding Rate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Direction</label>
                    <input
                      type="text"
                      value={rangeDirection === 'RECEIVE' ? 'PAY Funding Leg' : 'RECEIVE Funding Leg'}
                      readOnly
                      className="w-full bg-[#0a0b0d] border border-gray-800 rounded p-2 text-sm text-blue-400 font-bold font-mono"
                    />
                  </div>

                  {rangeFundingLegType === 'FLOATING' ? (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Floating Index</label>
                        <select
                          value={rangeFundingIndex}
                          onChange={(e) => setRangeFundingIndex(e.target.value as FloatingIndex)}
                          className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                        >
                          <option value="SOFR">SOFR</option>
                          <option value="EURIBOR">EURIBOR</option>
                          <option value="SONIA">SONIA</option>
                          <option value="TONA">TONA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Index Tenor</label>
                        <select
                          value={rangeFundingTenor}
                          onChange={(e) => setRangeFundingTenor(e.target.value as IndexTenor)}
                          className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                        >
                          <option value="3M">3 Months (3M)</option>
                          <option value="1M">1 Month (1M)</option>
                          <option value="6M">6 Months (6M)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Spread (bps)</label>
                        <input
                          type="number"
                          step="1"
                          value={rangeFundingSpreadBps}
                          onChange={(e) => setRangeFundingSpreadBps(Number(e.target.value))}
                          className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Reset Type</label>
                        <select
                          value={rangeFundingResetType}
                          onChange={(e) => setRangeFundingResetType(e.target.value as ResetType)}
                          className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-semibold"
                        >
                          <option value="ADVANCE">ADVANCE (Setting In Advance)</option>
                          <option value="ARREARS">ARREARS (Setting In Arrears)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Fixed Funding Rate (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={rangeFundingFixedRate}
                        onChange={(e) => setRangeFundingFixedRate(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-blue-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Day Count</label>
                    <select
                      value={rangeFundingDayCount}
                      onChange={(e) => setRangeFundingDayCount(e.target.value as DayCountConvention)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="ACT/360">ACT/360</option>
                      <option value="30/360">30/360</option>
                      <option value="ACT/365">ACT/365</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Payment Frequency</label>
                    <select
                      value={rangeFundingFreq}
                      onChange={(e) => setRangeFundingFreq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="3M">3 Months (3M)</option>
                      <option value="6M">6 Months (6M)</option>
                      <option value="1M">1 Month (1M)</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 5: SNOW RANGE ACCRUAL */}
          {selectedProduct === 'SNOW_RANGE' && (
            <>
              <div className="p-4 bg-[#12141a] border border-cyan-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>2. Leg 1 — SnowRange Accrual Stream (Memory Ratchet)</span>
                  <span className="text-[10px] font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/60">Memory Range Accrual</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Direction</label>
                    <select
                      value={rangeDirection}
                      onChange={(e) => setRangeDirection(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="RECEIVE">RECEIVE SnowRange Coupon</option>
                      <option value="PAY">PAY SnowRange Coupon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-cyan-300 mb-1">Base Coupon Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={snowBaseCoupon}
                      onChange={(e) => setSnowBaseCoupon(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-cyan-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Lower Barrier Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={snowLowerBarrier}
                      onChange={(e) => setSnowLowerBarrier(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Upper Barrier Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={snowUpperBarrier}
                      onChange={(e) => setSnowUpperBarrier(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-emerald-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-indigo-300 mb-1">Memory Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={snowMemoryMult}
                      onChange={(e) => setSnowMemoryMult(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-indigo-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Reference Index</label>
                    <select
                      value={snowRefIndex}
                      onChange={(e) => setSnowRefIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                      <option value="TONA">TONA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Observation Freq</label>
                    <select
                      value={snowObsFreq}
                      onChange={(e) => setSnowObsFreq(e.target.value as 'DAILY_CALENDAR' | 'DAILY_BUSINESS')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="DAILY_CALENDAR">DAILY CALENDAR DAYS (365)</option>
                      <option value="DAILY_BUSINESS">DAILY BUSINESS DAYS (Mon-Fri)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Notional Amount ({currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={snowNotional}
                      onChange={(e) => setSnowNotional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Payment Frequency</label>
                    <select
                      value={snowPayFreq}
                      onChange={(e) => setSnowPayFreq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="3M">3 Months (3M)</option>
                      <option value="6M">6 Months (6M)</option>
                      <option value="1M">1 Month (1M)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Leg 2 Funding Stream */}
              <div className="p-4 bg-[#12141a] border border-blue-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>3. Leg 2 — Funding Stream</span>
                  <span className="text-[10px] font-normal text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60">Funding Leg</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Funding Type</label>
                    <select
                      value={snowFundingLegType}
                      onChange={(e) => setSnowFundingLegType(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="FLOATING">FLOATING (SOFR / Index)</option>
                      <option value="FIXED">FIXED (Fixed Funding Rate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Floating Index</label>
                    <select
                      value={snowFundingIndex}
                      onChange={(e) => setSnowFundingIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Spread (bps)</label>
                    <input
                      type="number"
                      value={snowFundingSpreadBps}
                      onChange={(e) => setSnowFundingSpreadBps(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 6: TARN (TARGET REDEMPTION NOTE) */}
          {selectedProduct === 'TARN' && (
            <>
              <div className="p-4 bg-[#12141a] border border-orange-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-orange-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>2. Leg 1 — Target Redemption (TARN) Structured Stream</span>
                  <span className="text-[10px] font-normal text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-700/60">Early Knock-Out Trigger</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Direction</label>
                    <select
                      value={tarnDirection}
                      onChange={(e) => setTarnDirection(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="RECEIVE">RECEIVE TARN Coupon</option>
                      <option value="PAY">PAY TARN Coupon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-orange-400 mb-1">Target Cap Limit (%)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={tarnTargetCapPct}
                      onChange={(e) => setTarnTargetCapPct(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-orange-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Coupon Formula Type</label>
                    <select
                      value={tarnFormulaType}
                      onChange={(e) => setTarnFormulaType(e.target.value as any)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-semibold"
                    >
                      <option value="INVERSE_FLOATER">INVERSE FLOATER (Strike - Leverage * Index)</option>
                      <option value="RANGE_ACCRUAL">RANGE ACCRUAL TARN</option>
                      <option value="FIXED_STEP">FIXED STEP TARN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Strike Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tarnStrikeRate}
                      onChange={(e) => setTarnStrikeRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leverage Factor</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tarnLeverage}
                      onChange={(e) => setTarnLeverage(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-blue-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Cap Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tarnCapRate}
                      onChange={(e) => setTarnCapRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-emerald-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Reference Index</label>
                    <select
                      value={tarnRefIndex}
                      onChange={(e) => setTarnRefIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Notional Amount ({currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={tarnNotional}
                      onChange={(e) => setTarnNotional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Payment Frequency</label>
                    <select
                      value={tarnPayFreq}
                      onChange={(e) => setTarnPayFreq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="3M">3 Months (3M)</option>
                      <option value="6M">6 Months (6M)</option>
                      <option value="1M">1 Month (1M)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Leg 2 Funding Stream */}
              <div className="p-4 bg-[#12141a] border border-blue-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>3. Leg 2 — Funding Stream</span>
                  <span className="text-[10px] font-normal text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60">Funding Leg</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Funding Type</label>
                    <select
                      value={tarnFundingLegType}
                      onChange={(e) => setTarnFundingLegType(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="FLOATING">FLOATING (SOFR / Index)</option>
                      <option value="FIXED">FIXED (Fixed Funding Rate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Floating Index</label>
                    <select
                      value={tarnFundingIndex}
                      onChange={(e) => setTarnFundingIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Spread (bps)</label>
                    <input
                      type="number"
                      value={tarnFundingSpreadBps}
                      onChange={(e) => setTarnFundingSpreadBps(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 7: SNOWBALL (RATCHET STRUCTURED SWAP) */}
          {selectedProduct === 'SNOWBALL' && (
            <>
              <div className="p-4 bg-[#12141a] border border-indigo-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>2. Leg 1 — Snowball Ratchet Structured Stream</span>
                  <span className="text-[10px] font-normal text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/60">Path-Dependent Ratchet</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 1 Direction</label>
                    <select
                      value={sbDirection}
                      onChange={(e) => setSbDirection(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="RECEIVE">RECEIVE Snowball Coupon</option>
                      <option value="PAY">PAY Snowball Coupon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-indigo-300 mb-1">Initial Coupon Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={sbInitialCoupon}
                      onChange={(e) => setSbInitialCoupon(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-indigo-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Bonus Step Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={sbBonusStep}
                      onChange={(e) => setSbBonusStep(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-emerald-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leverage Factor</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sbLeverage}
                      onChange={(e) => setSbLeverage(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-blue-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Cap Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sbCapRate}
                      onChange={(e) => setSbCapRate(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-amber-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Reference Index</label>
                    <select
                      value={sbRefIndex}
                      onChange={(e) => setSbRefIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Notional Amount ({currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={sbNotional}
                      onChange={(e) => setSbNotional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Payment Frequency</label>
                    <select
                      value={sbPayFreq}
                      onChange={(e) => setSbPayFreq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="3M">3 Months (3M)</option>
                      <option value="6M">6 Months (6M)</option>
                      <option value="1M">1 Month (1M)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Leg 2 Funding Stream */}
              <div className="p-4 bg-[#12141a] border border-blue-900/60 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
                  <span>3. Leg 2 — Funding Stream</span>
                  <span className="text-[10px] font-normal text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60">Funding Leg</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Leg 2 Funding Type</label>
                    <select
                      value={sbFundingLegType}
                      onChange={(e) => setSbFundingLegType(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                    >
                      <option value="FLOATING">FLOATING (SOFR / Index)</option>
                      <option value="FIXED">FIXED (Fixed Funding Rate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Floating Index</label>
                    <select
                      value={sbFundingIndex}
                      onChange={(e) => setSbFundingIndex(e.target.value as FloatingIndex)}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="EURIBOR">EURIBOR</option>
                      <option value="SONIA">SONIA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Funding Spread (bps)</label>
                    <input
                      type="number"
                      value={sbFundingSpreadBps}
                      onChange={(e) => setSbFundingSpreadBps(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 8: FX FORWARD */}
          {selectedProduct === 'FX_FORWARD' && (
            <>
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2">
                2. Cross-Currency FX Forward Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Base Currency</label>
                  <select
                    value={fxBaseCurrency}
                    onChange={(e) => setFxBaseCurrency(e.target.value as Currency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono font-bold"
                  >
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                    <option value="JPY">JPY</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Counter Currency</label>
                  <select
                    value={fxCounterCurrency}
                    onChange={(e) => setFxCounterCurrency(e.target.value as Currency)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono font-bold"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Direction</label>
                  <select
                    value={fxDirection}
                    onChange={(e) => setFxDirection(e.target.value as 'BUY_BASE' | 'SELL_BASE')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="BUY_BASE">BUY BASE (Rec Base / Pay Counter)</option>
                    <option value="SELL_BASE">SELL BASE (Pay Base / Rec Counter)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Base Notional ({fxBaseCurrency})</label>
                  <input
                    type="number"
                    step="100000"
                    value={fxBaseAmount}
                    onChange={(e) => setFxBaseAmount(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Dealt Forward Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={fxForwardRate}
                    onChange={(e) => setFxForwardRate(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-purple-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Current Spot Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={fxSpotRate}
                    onChange={(e) => setFxSpotRate(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Counter Amount ({fxCounterCurrency})</label>
                  <input
                    type="number"
                    value={fxCounterAmount}
                    readOnly
                    className="w-full bg-[#12141a] border border-gray-800 rounded p-2 text-sm text-gray-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Value / Settlement Date</label>
                  <input
                    type="date"
                    value={fxSettlementDate}
                    onChange={(e) => setFxSettlementDate(e.target.value)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* PRODUCT 6: FX OPTION */}
          {selectedProduct === 'FX_OPTION' && (
            <>
              <h3 className="text-xs font-bold text-pink-400 uppercase tracking-widest border-b border-gray-800 pb-2 pt-2">
                2. Currency Option Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Option Type</label>
                  <select
                    value={fxOptType}
                    onChange={(e) => setFxOptType(e.target.value as 'CALL' | 'PUT')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="CALL">CALL OPTION</option>
                    <option value="PUT">PUT OPTION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Position Direction</label>
                  <select
                    value={fxOptDirection}
                    onChange={(e) => setFxOptDirection(e.target.value as 'BUY' | 'SELL')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-bold"
                  >
                    <option value="BUY">BUY (Long Option)</option>
                    <option value="SELL">SELL (Short Option)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-pink-400 mb-1">Strike Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={fxOptStrikePrice}
                    onChange={(e) => setFxOptStrikePrice(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-pink-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Call Currency & Amount</label>
                  <div className="flex gap-2">
                    <select
                      value={fxOptCallCurrency}
                      onChange={(e) => setFxOptCallCurrency(e.target.value as Currency)}
                      className="w-24 bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono font-bold"
                    >
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                      <option value="JPY">JPY</option>
                    </select>
                    <input
                      type="number"
                      step="100000"
                      value={fxOptCallAmount}
                      onChange={(e) => setFxOptCallAmount(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Put Currency & Amount</label>
                  <div className="flex gap-2">
                    <select
                      value={fxOptPutCurrency}
                      onChange={(e) => setFxOptPutCurrency(e.target.value as Currency)}
                      className="w-24 bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono font-bold"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                    </select>
                    <input
                      type="number"
                      step="100000"
                      value={fxOptPutAmount}
                      onChange={(e) => setFxOptPutAmount(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Option Premium Amount</label>
                  <input
                    type="number"
                    step="1000"
                    value={fxOptPremium}
                    onChange={(e) => setFxOptPremium(Number(e.target.value))}
                    className="w-full bg-[#16181d] border border-purple-500/80 rounded p-2 text-sm text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={fxOptExpiryDate}
                    onChange={(e) => setFxOptExpiryDate(e.target.value)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Settlement Date</label>
                  <input
                    type="date"
                    value={fxOptSettlementDate}
                    onChange={(e) => setFxOptSettlementDate(e.target.value)}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Option Style</label>
                  <select
                    value={fxOptStyle}
                    onChange={(e) => setFxOptStyle(e.target.value as 'EUROPEAN' | 'AMERICAN')}
                    className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-sm text-white font-mono"
                  >
                    <option value="EUROPEAN">EUROPEAN</option>
                    <option value="AMERICAN">AMERICAN</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons: View XML & Book Trade + Valuation Summary Pill */}
          <div className="pt-4 border-t border-gray-800 space-y-3">
            {/* APPLY CHANGES & RECALCULATE SCHEDULE BUTTON BAR */}
            <div className="bg-[#0f1422] border border-blue-900/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border ${hasPendingChanges ? 'bg-amber-950/80 text-amber-400 border-amber-700/80 animate-pulse' : 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80'}`}>
                  <RefreshCw className={`w-5 h-5 ${hasPendingChanges ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    Schedule & Payload Synchronization
                    {hasPendingChanges ? (
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded border border-amber-700 font-sans font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Pending Changes
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-700 font-sans font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Applied & Synchronized
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                    {hasPendingChanges
                      ? 'Form inputs modified (e.g. Fixed Rate, Spread, Dates). Click Apply Changes to update Cashflow Schedule & FpML XML payload.'
                      : 'Live Cashflow Schedule & FpML 5.11 XML payload are fully synchronized with form inputs.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={recalculatePreviewTrade}
                className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto ${
                  hasPendingChanges
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white border border-blue-400 animate-pulse'
                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                {hasPendingChanges ? '⚡ Apply Changes & Recalculate' : '✓ Re-Apply Changes'}
              </button>
            </div>

            {/* Live Valuation & Model Status Bar */}
            <div className="p-3 bg-[#090b10] border border-gray-800 rounded-lg flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-sans">Valuation Model:</span>
                <span className="text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 truncate max-w-xs" title={getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).description}>
                  {getValuationModelForProduct(selectedProduct, selectedValuationModelMap[selectedProduct]).name}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-sans">Computed Trade PV:</span>
                <span className={`font-extrabold px-2.5 py-0.5 rounded border ${ (liveScheduleSummary?.totalPV || 0) >= 0 ? 'bg-emerald-950/90 text-emerald-400 border-emerald-700/80' : 'bg-rose-950/90 text-rose-400 border-rose-700/80' }`}>
                  {currency} { (liveScheduleSummary?.totalPV || 0).toLocaleString() }
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setShowXmlModal(true)}
                className="w-full sm:w-auto px-5 py-3 bg-[#12141a] hover:bg-[#1a1d26] text-emerald-400 border border-emerald-800/80 hover:border-emerald-500 rounded font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                View FpML XML Payload
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold uppercase tracking-widest text-xs transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Persisting Trade to SQLite...' : `Book ${selectedProduct} & Save to SQLite`}
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* EMBEDDED LIVE CASHFLOW SCHEDULE WITHIN PRODUCT TEMPLATE */}
      {liveScheduleSummary && (
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 space-y-6 shadow-xl">
          {Object.keys(scheduleDateOverrides).length > 0 && (
            <div className="bg-indigo-950/80 border border-indigo-500/80 rounded-xl p-3 px-4 flex items-center justify-between font-mono text-xs text-indigo-200 shadow-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Custom booking schedule dates applied! PV & cashflows dynamically recalculated for trade booking & final cashflow sheet.</span>
              </div>
              <button
                type="button"
                onClick={handleResetBookingDates}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset to Default Dates
              </button>
            </div>
          )}

          {/* PRIMARY SECTION: COMBINED LIVE CASHFLOW SCHEDULE (INITIAL CLEAN FORMAT) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-950/80 border border-blue-700/60 rounded-lg text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Live Cashflow Schedule — {selectedProduct} Product Template ({liveScheduleSummary.currency})
                  </h3>
                  <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                    Real-time generated cashflows in <strong>{liveScheduleSummary.currency}</strong> with ResetStartDate, ResetEndDate, PayResetDate, Day Count Fraction (α), and Notional
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                <span className="text-gray-400">Currency: <strong className="text-blue-400">{liveScheduleSummary.currency}</strong></span>
                <span className="text-gray-400">Periods: <strong className="text-white">{liveScheduleSummary.periods.length}</strong></span>
                <span className="text-gray-400">Net Flow: <strong className={liveScheduleSummary.totalNetCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{liveScheduleSummary.currency} {liveScheduleSummary.totalNetCashflow.toLocaleString()}</strong></span>
                <span className="text-gray-400">NPV: <strong className={liveScheduleSummary.totalPV >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{liveScheduleSummary.currency} {liveScheduleSummary.totalPV.toLocaleString()}</strong></span>
                <span className="text-emerald-400 font-bold">Total IRDelta: ${liveScheduleSummary.totalIrDelta.toLocaleString()} / bp</span>
              </div>
            </div>

            {/* Initial Cashflow Schedule Table */}
            <div className="bg-[#0a0b0d] border border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-[11px] border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#12141a] border-b border-gray-800 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-3"># Period</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-cyan-400">Accrual Period (Start → End)</th>
                      <th className="py-2.5 px-3 text-amber-400">Reset Type</th>
                      <th className="py-2.5 px-3">Reset Period (Start → End)</th>
                      <th className="py-2.5 px-3">Pay/Reset Date</th>
                      <th className="py-2.5 px-3 text-center">Days</th>
                      <th className="py-2.5 px-3 text-center">Fraction (α) & Conv</th>
                      <th className="py-2.5 px-3 text-right text-blue-400">Fixed Coupon Rate (%)</th>
                      <th className="py-2.5 px-3 text-right text-amber-400">Float Fixing (%)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-400">Float Coupon Rate (%)</th>
                      <th className="py-2.5 px-3 text-right">Net Flow ({liveScheduleSummary.currency})</th>
                      <th className="py-2.5 px-3 text-right text-emerald-300">IRDelta ($/1bp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {liveScheduleSummary.periods.map((p) => {
                      const isPositive = p.netCashflow >= 0;
                      const fixedRateVal = p.fixedCouponRate ?? p.couponRate ?? p.fixedRate ?? p.strikeRate;
                      const floatFixingVal = p.floatingFixingRate ?? p.fixingRate;
                      const floatTotalVal = p.floatingTotalRate ?? p.floatingRate ?? floatFixingVal;
                      const rType = p.resetType || 'ADVANCE';

                      return (
                        <tr key={p.periodNumber} className="hover:bg-gray-800/40 transition-colors">
                          
                          {/* Period # */}
                          <td className="py-2.5 px-3 font-bold text-white">
                            P-{p.periodNumber}
                          </td>

                          {/* Type */}
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              p.type === 'PREMIUM' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                              p.type === 'INTEREST' ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-gray-800 text-gray-300 border-gray-700'
                            }`}>
                              {p.type}
                            </span>
                          </td>

                          {/* Accrual Period Editable */}
                          <td className="py-2 px-2 text-cyan-300 font-bold">
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={p.startDate}
                                onChange={(e) => handleBookingDateChange(`P-${p.periodNumber}`, 'startDate', e.target.value)}
                                className="bg-[#121620] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[9.5px] font-mono focus:outline-none focus:border-cyan-400"
                              />
                              <span className="text-gray-500">→</span>
                              <input
                                type="date"
                                value={p.endDate}
                                onChange={(e) => handleBookingDateChange(`P-${p.periodNumber}`, 'endDate', e.target.value)}
                                className="bg-[#121620] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[9.5px] font-mono focus:outline-none focus:border-cyan-400"
                              />
                            </div>
                          </td>

                          {/* Reset Type */}
                          <td className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${rType === 'ARREARS' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
                              {rType}
                            </span>
                          </td>

                          {/* Reset Period Editable */}
                          <td className="py-2 px-2 text-amber-300">
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={p.resetStartDate}
                                onChange={(e) => handleBookingDateChange(`P-${p.periodNumber}`, 'resetStartDate', e.target.value)}
                                className="bg-[#1c1712] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[9.5px] font-mono focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-gray-500">→</span>
                              <input
                                type="date"
                                value={p.resetEndDate}
                                onChange={(e) => handleBookingDateChange(`P-${p.periodNumber}`, 'resetEndDate', e.target.value)}
                                className="bg-[#1c1712] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[9.5px] font-mono focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </td>

                          {/* Pay Reset Date Editable */}
                          <td className="py-2 px-2 text-emerald-300 font-bold">
                            <input
                              type="date"
                              value={p.payResetDate}
                              onChange={(e) => handleBookingDateChange(`P-${p.periodNumber}`, 'payResetDate', e.target.value)}
                              className="bg-[#121c18] text-emerald-300 border border-emerald-800/80 rounded px-1 py-0.5 text-[9.5px] font-mono focus:outline-none focus:border-emerald-400"
                            />
                          </td>

                          {/* Days */}
                          <td className="py-2 px-2 text-center text-amber-300 font-bold">
                            {p.numberOfDays}d
                          </td>

                          {/* Fraction & Convention */}
                          <td className="py-2.5 px-3 text-center text-gray-300">
                            <div>{p.dayCountFraction > 0 ? p.dayCountFraction.toFixed(4) : '-'}</div>
                            <div className="text-[8px] text-gray-500">{p.dayCountConvention}</div>
                          </td>

                          {/* Fixed Coupon Rate (%) with Hover Calculation Breakdown */}
                          <td className="py-2.5 px-3 text-right text-blue-400 font-bold">
                            {fixedRateVal !== undefined ? (
                              <div className="relative group/fixedTooltip inline-block cursor-help">
                                <span className="border-b border-dashed border-blue-400/80 pb-0.5 hover:text-white transition-colors">
                                  {fixedRateVal.toFixed(4)}%
                                </span>

                                {/* Fixed Rate Calculation Popover */}
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/fixedTooltip:block w-72 p-3 bg-[#0d1017] border border-blue-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
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
                                      <span className="text-gray-400">Day Count Fraction (α):</span>
                                      <span className="text-cyan-300 font-bold">{(p.dayCountFraction || 0.5).toFixed(4)}</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-blue-400">Fixed Coupon Rate:</span>
                                      <span className="text-blue-400 font-bold">{fixedRateVal.toFixed(4)}%</span>
                                    </div>
                                    <div className="bg-blue-950/40 p-1.5 rounded mt-1 border border-blue-900/60 text-[9px]">
                                      <div className="text-gray-300 font-sans font-bold">Cashflow Formula:</div>
                                      <div className="text-blue-200 font-mono text-[9px]">
                                        Notional × Rate × α = ${(p.fixedLegNotional || p.notional || liveScheduleSummary.notional).toLocaleString()} × {fixedRateVal.toFixed(4)}% × {(p.dayCountFraction || 0.5).toFixed(4)} = <strong className="text-blue-300">${(p.fixedCashflow || 0).toLocaleString()}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Float Fixing Rate */}
                          <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                            {floatFixingVal !== undefined ? `${floatFixingVal.toFixed(4)}%` : '-'}
                          </td>

                          {/* Float Coupon Rate (%) with Hover Calculation Breakdown */}
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            {floatTotalVal !== undefined ? (
                              <div className="relative group/floatTooltip inline-block cursor-help">
                                <div className="border-b border-dashed border-emerald-400/80 pb-0.5 hover:text-white transition-colors">
                                  <span>{floatTotalVal.toFixed(4)}%</span>
                                  {p.floatingSpreadBps !== undefined && p.floatingSpreadBps !== 0 && (
                                    <div className="text-[9px] text-gray-400">({p.floatingSpreadBps > 0 ? '+' : ''}{p.floatingSpreadBps}bps)</div>
                                  )}
                                </div>

                                {/* Float Coupon Rate Calculation Popover */}
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/floatTooltip:block w-76 p-3 bg-[#0d1017] border border-amber-500/50 rounded-xl shadow-2xl z-50 text-left font-mono text-[10px] text-gray-200 backdrop-blur-md">
                                  <div className="font-bold text-amber-400 border-b border-gray-800 pb-1 mb-1.5 flex items-center justify-between">
                                    <span>Float Coupon Rate Calculation</span>
                                    <span className="text-[9px] text-gray-400">P-{p.periodNumber}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Index Fixing Rate:</span>
                                      <span className="text-amber-300 font-bold">{floatFixingVal !== undefined ? `${floatFixingVal.toFixed(4)}%` : '3.8000%'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Spread:</span>
                                      <span className="text-emerald-300 font-bold">{p.floatingSpreadBps !== undefined ? `${p.floatingSpreadBps > 0 ? '+' : ''}${p.floatingSpreadBps} bps` : '+0 bps'} ({((p.floatingSpreadBps || 0) / 100).toFixed(4)}%)</span>
                                    </div>
                                    <div className="border-t border-gray-800 pt-1 flex justify-between font-bold text-white">
                                      <span className="text-emerald-400">Float Coupon Rate:</span>
                                      <span className="text-emerald-400 font-bold">{floatTotalVal.toFixed(4)}%</span>
                                    </div>
                                    <div className="bg-amber-950/40 p-1.5 rounded mt-1 border border-amber-900/60 text-[9px] space-y-1">
                                      <div className="text-gray-300 font-sans font-bold">Calculation Breakdown:</div>
                                      <div className="text-amber-200 font-mono text-[9px]">
                                        Fixing ({floatFixingVal !== undefined ? floatFixingVal.toFixed(4) : '3.8000'}%) + Spread ({((p.floatingSpreadBps || 0) / 100).toFixed(4)}%) = <strong className="text-emerald-300">{floatTotalVal.toFixed(4)}%</strong>
                                      </div>
                                      <div className="text-gray-400 font-mono text-[9px] pt-1 border-t border-gray-800">Flow = Notional × Float Rate × α</div>
                                      <div className="text-emerald-300 font-mono text-[9px]">
                                        ${(p.floatingLegNotional || p.notional || liveScheduleSummary.notional).toLocaleString()} × {floatTotalVal.toFixed(4)}% × {(p.dayCountFraction || 0.25).toFixed(4)} = <strong>${(p.floatingCashflow || 0).toLocaleString()}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Net Flow */}
                          <td className="py-2.5 px-3 text-right font-bold">
                            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                              {isPositive ? '+' : ''}{p.netCashflow.toLocaleString()}
                            </span>
                          </td>

                          {/* IRDelta */}
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-300">
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

          {/* DEDICATED NEW SECTION: LEG 1 AND LEG 2 INDEPENDENT CASHFLOW STREAM DECOMPOSITION */}
          {independentLeg1Summary && independentLeg2Summary && (
            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Independent Leg 1 & Leg 2 Cashflow Stream Decomposition
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                    Dedicated stream-level breakdown isolating cashflows based on independent <strong>Leg 1 Frequency ({independentLeg1Summary.frequency})</strong> vs <strong>Leg 2 Frequency ({independentLeg2Summary.frequency})</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 bg-blue-950 text-blue-300 rounded-md border border-blue-800 font-bold">
                    Leg 1 ({independentLeg1Summary.frequency}): {independentLeg1Summary.currency} {independentLeg1Summary.totalCashflow.toLocaleString()} ({independentLeg1Summary.periods.length} Flow{independentLeg1Summary.periods.length === 1 ? '' : 's'})
                  </span>
                  <span className="px-2.5 py-1 bg-amber-950 text-amber-300 rounded-md border border-amber-800 font-bold">
                    Leg 2 ({independentLeg2Summary.frequency}): {independentLeg2Summary.currency} {independentLeg2Summary.totalCashflow.toLocaleString()} ({independentLeg2Summary.periods.length} Flow{independentLeg2Summary.periods.length === 1 ? '' : 's'})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-mono">
                {/* SECTION A: DEDICATED LEG 1 CASHFLOW STREAM TABLE (FREQ: independentLeg1Summary.frequency) */}
                <div className="bg-[#0a0b0d] border border-blue-900/60 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-blue-900/50 pb-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 font-sans">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                      Leg 1 Stream ({independentLeg1Summary.frequency} Frequency — {independentLeg1Summary.periods.length} Flows)
                    </span>
                    <span className="text-[10px] text-blue-300 font-mono">
                      Conv: {independentLeg1Summary.dayCountConvention}
                    </span>
                  </div>

                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-[10px] border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#121624] text-blue-300 border-b border-blue-900/60 uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-1.5"># Period</th>
                          <th className="py-2 px-1.5 text-cyan-400">Accrual Period</th>
                          <th className="py-2 px-1.5 text-amber-400">Reset Period</th>
                          <th className="py-2 px-1.5 text-emerald-400">Pay Reset Date</th>
                          <th className="py-2 px-1.5 text-right text-blue-400">Rate / Spread</th>
                          <th className="py-2 px-1.5 text-right text-blue-300 bg-blue-950/40">Leg 1 Cashflow ({independentLeg1Summary.currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-950/40">
                        {independentLeg1Summary.periods.map((p) => {
                          return (
                            <tr key={p.periodNumber} className="hover:bg-blue-950/30 transition-colors">
                              <td className="py-2 px-1.5 font-bold text-white">P-{p.periodNumber}</td>
                              
                              {/* Accrual Period */}
                              <td className="py-2 px-1.5 text-cyan-300 font-bold">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={p.startDate}
                                    onChange={(e) => handleBookingDateChange(`L1-${p.periodNumber}`, 'startDate', e.target.value)}
                                    className="bg-[#0e1320] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-cyan-400"
                                  />
                                  <span className="text-gray-500">→</span>
                                  <input
                                    type="date"
                                    value={p.endDate}
                                    onChange={(e) => handleBookingDateChange(`L1-${p.periodNumber}`, 'endDate', e.target.value)}
                                    className="bg-[#0e1320] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-cyan-400"
                                  />
                                </div>
                              </td>

                              {/* Reset Period */}
                              <td className="py-2 px-1.5 text-amber-300 font-bold">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={p.resetStartDate || p.startDate}
                                    onChange={(e) => handleBookingDateChange(`L1-${p.periodNumber}`, 'resetStartDate', e.target.value)}
                                    className="bg-[#1c1712] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-amber-400"
                                  />
                                  <span className="text-gray-500">→</span>
                                  <input
                                    type="date"
                                    value={p.resetEndDate || p.endDate}
                                    onChange={(e) => handleBookingDateChange(`L1-${p.periodNumber}`, 'resetEndDate', e.target.value)}
                                    className="bg-[#1c1712] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-amber-400"
                                  />
                                </div>
                              </td>

                              {/* Pay Reset Date */}
                              <td className="py-2 px-1.5 text-emerald-300 font-bold">
                                <input
                                  type="date"
                                  value={p.payDate}
                                  onChange={(e) => handleBookingDateChange(`L1-${p.periodNumber}`, 'payResetDate', e.target.value)}
                                  className="bg-[#0e1c16] text-emerald-300 border border-emerald-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-emerald-400"
                                />
                              </td>

                              {/* Rate / Spread */}
                              <td className="py-2 px-1.5 text-right font-bold text-blue-400">
                                {p.ratePct.toFixed(4)}%
                              </td>

                              {/* Cashflow */}
                              <td className={`py-2 px-1.5 text-right font-extrabold bg-blue-950/20 ${p.cashflowAmount >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                                {p.cashflowAmount >= 0 ? '+' : ''}${Math.abs(p.cashflowAmount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION B: DEDICATED LEG 2 CASHFLOW STREAM TABLE (FREQ: independentLeg2Summary.frequency) */}
                <div className="bg-[#0a0b0d] border border-amber-900/60 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-amber-900/50 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 font-sans">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Leg 2 Stream ({independentLeg2Summary.frequency} Frequency — {independentLeg2Summary.periods.length} Flows)
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      Conv: {independentLeg2Summary.dayCountConvention}
                    </span>
                  </div>

                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-[10px] border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#1c1612] text-amber-300 border-b border-amber-900/60 uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-1.5"># Period</th>
                          <th className="py-2 px-1.5 text-cyan-400">Accrual Period</th>
                          <th className="py-2 px-1.5 text-amber-400">Reset Period</th>
                          <th className="py-2 px-1.5 text-emerald-400">Pay Reset Date</th>
                          <th className="py-2 px-1.5 text-right text-amber-400">Rate / Spread</th>
                          <th className="py-2 px-1.5 text-right text-amber-300 bg-amber-950/40">Leg 2 Cashflow ({independentLeg2Summary.currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-950/40">
                        {independentLeg2Summary.periods.map((p) => {
                          return (
                            <tr key={p.periodNumber} className="hover:bg-amber-950/30 transition-colors">
                              <td className="py-2 px-1.5 font-bold text-white">P-{p.periodNumber}</td>
                              
                              {/* Accrual Period */}
                              <td className="py-2 px-1.5 text-cyan-300 font-bold">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={p.startDate}
                                    onChange={(e) => handleBookingDateChange(`L2-${p.periodNumber}`, 'startDate', e.target.value)}
                                    className="bg-[#0e1320] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-cyan-400"
                                  />
                                  <span className="text-gray-500">→</span>
                                  <input
                                    type="date"
                                    value={p.endDate}
                                    onChange={(e) => handleBookingDateChange(`L2-${p.periodNumber}`, 'endDate', e.target.value)}
                                    className="bg-[#0e1320] text-cyan-300 border border-cyan-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-cyan-400"
                                  />
                                </div>
                              </td>

                              {/* Reset Period */}
                              <td className="py-2 px-1.5 text-amber-300 font-bold">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={p.resetStartDate || p.startDate}
                                    onChange={(e) => handleBookingDateChange(`L2-${p.periodNumber}`, 'resetStartDate', e.target.value)}
                                    className="bg-[#1e1710] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-amber-400"
                                  />
                                  <span className="text-gray-500">→</span>
                                  <input
                                    type="date"
                                    value={p.resetEndDate || p.endDate}
                                    onChange={(e) => handleBookingDateChange(`L2-${p.periodNumber}`, 'resetEndDate', e.target.value)}
                                    className="bg-[#1e1710] text-amber-300 border border-amber-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-amber-400"
                                  />
                                </div>
                              </td>

                              {/* Pay Reset Date */}
                              <td className="py-2 px-1.5 text-emerald-300 font-bold">
                                <input
                                  type="date"
                                  value={p.payDate}
                                  onChange={(e) => handleBookingDateChange(`L2-${p.periodNumber}`, 'payResetDate', e.target.value)}
                                  className="bg-[#0e1c16] text-emerald-300 border border-emerald-800/80 rounded px-1 py-0.5 text-[8.5px] font-mono focus:outline-none focus:border-emerald-400"
                                />
                              </td>

                              {/* Rate / Spread */}
                              <td className="py-2 px-1.5 text-right font-bold text-amber-400">
                                {p.ratePct.toFixed(4)}%
                                {p.spreadBps !== undefined && p.spreadBps !== 0 && (
                                  <span className="text-[8px] text-gray-400 ml-1">({p.spreadBps > 0 ? '+' : ''}{p.spreadBps}bp)</span>
                                )}
                              </td>

                              {/* Cashflow */}
                              <td className={`py-2 px-1.5 text-right font-extrabold bg-amber-950/20 ${p.cashflowAmount >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                                {p.cashflowAmount >= 0 ? '+' : ''}${Math.abs(p.cashflowAmount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Add Counterparty Modal */}
      {showAddCpModal && (
        <AddCounterpartyModal
          onClose={() => setShowAddCpModal(false)}
          onAdded={(newCpName) => {
            setCounterpartyName(newCpName);
            const found = getCounterparties().find((c) => c.name === newCpName);
            if (found) setCounterpartyLei(found.lei);
          }}
        />
      )}

      {/* FpML 5.11 XML Payload Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0f12] border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#12141a] border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                    Live FpML 5.11 XML Schema Payload
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded-full border border-emerald-700/80 font-sans font-bold">
                      ISO 20022 Validated ({currency})
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                    Synchronized live FpML XML payload for <strong>{selectedProduct}</strong> trade booking
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedXml);
                    alert('XML copied to clipboard!');
                  }}
                  className="px-3 py-1.5 bg-[#1a1d26] hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-700"
                  title="Copy XML"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  Copy XML
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([generatedXml], { type: 'text/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `FpML_${selectedProduct}_${new Date().toISOString().substring(0, 10)}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-700/80"
                  title="Download XML File"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Download .xml
                </button>

                <button
                  type="button"
                  onClick={() => setShowXmlModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - XML Viewer */}
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-[#0a0b0d] scrollbar-thin">
              <pre className="text-xs text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
                {generatedXml}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#12141a] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 font-sans">
              <span>Payload Size: ~{(new Blob([generatedXml]).size / 1024).toFixed(2)} KB | Encoding: UTF-8</span>
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
