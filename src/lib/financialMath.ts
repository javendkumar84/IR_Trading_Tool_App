import { Currency, FixedLeg, FloatingLeg, IRSwapTrade, PositionSummary, TenorDv01Risk } from '../types';

/**
 * Calculates swap tenor in years between effective date and maturity date
 */
export function calculateTenorYears(effectiveDate: string, maturityDate: string): number {
  const start = new Date(effectiveDate);
  const end = new Date(maturityDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 5; // default fallback
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = parseFloat((diffDays / 365.25).toFixed(2));
  return years > 0 ? years : 1;
}

/**
 * Maps tenor years to standard benchmark risk buckets: 2Y, 5Y, 10Y, 30Y, OTHER
 */
export function getTenorBucket(tenorYears: number): '2Y' | '5Y' | '10Y' | '30Y' | 'OTHER' {
  if (tenorYears <= 3) return '2Y';
  if (tenorYears <= 7) return '5Y';
  if (tenorYears <= 15) return '10Y';
  if (tenorYears <= 35) return '30Y';
  return 'OTHER';
}

/**
 * Estimates Market Par Rate based on currency and tenor
 */
export function getEstimatedParRate(currency: Currency, tenorYears: number): number {
  const baseRates: Record<Currency, number> = {
    USD: 3.85,
    EUR: 2.75,
    GBP: 4.10,
    JPY: 0.65,
    CAD: 3.20,
    AUD: 3.90,
    CHF: 1.15,
  };

  const base = baseRates[currency] || 3.50;
  // Yield curve slope component: +0.08% per year of tenor
  const curveSlope = (tenorYears - 5) * 0.08;
  return parseFloat(Math.max(0.1, base + curveSlope).toFixed(4));
}

/**
 * Calculates DV01 (Dollar Value of a 1 basis point change in fixed rate)
 * Formula approx: Annuity * 0.0001 * Notional
 * Annuity approx = sum_{i=1}^{T*freq} 1 / (1 + r/freq)^i
 */
export function calculateDv01(notional: number, fixedRatePercent: number, tenorYears: number, frequencyStr: string): number {
  const freqMap: Record<string, number> = { '1M': 12, '3M': 4, '6M': 2, '1Y': 1 };
  const freq = freqMap[frequencyStr] || 2;
  const totalPeriods = Math.max(1, Math.round(tenorYears * freq));
  const periodRate = (fixedRatePercent / 100) / freq;

  let annuity = 0;
  for (let i = 1; i <= totalPeriods; i++) {
    annuity += 1 / Math.pow(1 + periodRate, i);
  }
  // Period fraction approx
  const dt = 1 / freq;
  const dv01 = annuity * dt * 0.0001 * notional;
  return Math.round(dv01);
}

/**
 * Calculates Mark to Market (MTM) of the swap position
 * MTM = (Par Rate - Fixed Rate) * Annuity * Notional * DirectionMultiplier
 */
export function calculateMarkToMarket(
  fixedLeg: FixedLeg,
  floatingLeg: FloatingLeg,
  tenorYears: number,
  currentMarketParRate: number
): { mtm: number; dv01: number; parRate: number } {
  const dv01 = calculateDv01(fixedLeg.notional, fixedLeg.fixedRate, tenorYears, fixedLeg.frequency);
  const freqMap: Record<string, number> = { '1M': 12, '3M': 4, '6M': 2, '1Y': 1 };
  const freq = freqMap[fixedLeg.frequency] || 2;
  const totalPeriods = Math.max(1, Math.round(tenorYears * freq));
  const periodRate = (currentMarketParRate / 100) / freq;

  let annuity = 0;
  for (let i = 1; i <= totalPeriods; i++) {
    annuity += 1 / Math.pow(1 + periodRate, i);
  }
  const dt = 1 / freq;
  
  // Rate differential = (Market Rate - Booked Fixed Rate)
  // Add floating spread effect if any
  const spreadPercent = (floatingLeg.spreadBps || 0) / 100;
  const effectiveMarketRate = currentMarketParRate - spreadPercent;
  const rateDiff = (effectiveMarketRate - fixedLeg.fixedRate) / 100;

  // Direction:
  // RECEIVE_FIXED: If market rate goes down, fixed rate we receive is higher -> MTM positive
  // PAY_FIXED: If market rate goes up, fixed rate we pay is lower than market -> MTM positive
  const directionMultiplier = fixedLeg.direction === 'RECEIVE_FIXED' ? -1 : 1;
  const mtm = Math.round(rateDiff * annuity * dt * fixedLeg.notional * directionMultiplier);

  return {
    mtm,
    dv01,
    parRate: currentMarketParRate,
  };
}

/**
 * Calculates Cap/Floor option valuation, DV01/Vega sensitivity, and Mark to Market
 */
export function calculateCapFloorValuation(
  capFloorType: 'CAP' | 'FLOOR',
  direction: 'BUY' | 'SELL',
  strikeRate: number,
  notional: number,
  currency: Currency,
  tenorYears: number,
  currentMarketRate: number,
  premiumAmount: number
): { mtm: number; dv01: number; parRate: number } {
  // Option intrinsic value estimation per annum
  const rateDiff = capFloorType === 'CAP'
    ? Math.max(0, currentMarketRate - strikeRate) / 100
    : Math.max(0, strikeRate - currentMarketRate) / 100;

  const intrinsicVal = rateDiff * notional * tenorYears;
  // Time value decay factor approx
  const timeValueEst = (notional * 0.0015 * Math.sqrt(tenorYears));
  const estimatedCurrentValue = intrinsicVal + timeValueEst;

  const buySellSign = direction === 'BUY' ? 1 : -1;
  const mtm = Math.round((estimatedCurrentValue - premiumAmount) * buySellSign);

  // DV01 delta sensitivity to rate shifts
  const dv01 = Math.round(calculateDv01(notional, strikeRate, tenorYears, '3M') * (rateDiff > 0 ? 0.75 : 0.25));

  return { mtm, dv01, parRate: currentMarketRate };
}

/**
 * Calculates Swaption valuation, underlying swap DV01 sensitivity, and Mark to Market
 */
export function calculateSwaptionValuation(
  swaptionType: 'PAYER' | 'RECEIVER',
  direction: 'BUY' | 'SELL',
  strikeRate: number,
  notional: number,
  currency: Currency,
  underlyingTenorYears: number,
  currentMarketSwapRate: number,
  premiumAmount: number
): { mtm: number; dv01: number; parRate: number } {
  // Black-76 Black model approximation for Swaption
  const rateDiff = swaptionType === 'PAYER'
    ? Math.max(0, currentMarketSwapRate - strikeRate) / 100
    : Math.max(0, strikeRate - currentMarketSwapRate) / 100;

  const baseSwapDv01 = calculateDv01(notional, strikeRate, underlyingTenorYears, '6M');
  const BlackDelta = rateDiff > 0 ? 0.65 : 0.35;
  const swaptionDv01 = Math.round(baseSwapDv01 * BlackDelta);

  const intrinsicVal = rateDiff * baseSwapDv01 * 10000;
  const timeValueEst = (notional * 0.0025 * Math.sqrt(underlyingTenorYears));
  const currentOptionValue = intrinsicVal + timeValueEst;

  const buySellSign = direction === 'BUY' ? 1 : -1;
  const mtm = Math.round((currentOptionValue - premiumAmount) * buySellSign);

  return { mtm, dv01: swaptionDv01, parRate: currentMarketSwapRate };
}

/**
 * Calculates FX Forward MTM and USD Equivalent Delta
 */
export function calculateFxForwardValuation(
  direction: 'BUY_BASE' | 'SELL_BASE',
  baseAmount: number,
  forwardRate: number,
  spotRate: number,
  baseCurrency: Currency,
  counterCurrency: Currency
): { mtm: number; dv01: number; parRate: number } {
  // Rate differential = (Market Forward / Spot - Contract Forward Rate)
  const rateDiff = forwardRate - spotRate; // forward pips or spread
  const dirSign = direction === 'BUY_BASE' ? 1 : -1;

  const mtm = Math.round(baseAmount * (spotRate - forwardRate) * dirSign);
  // Delta in USD equivalent (sensitivity per 10 pips = 0.0010)
  const dv01 = Math.round(baseAmount * 0.0001);

  return { mtm, dv01, parRate: spotRate };
}

/**
 * Calculates FX Option MTM, Delta, and Mark to Market
 */
export function calculateFxOptionValuation(
  optionType: 'CALL' | 'PUT',
  direction: 'BUY' | 'SELL',
  strikePrice: number,
  callAmount: number,
  putAmount: number,
  premiumAmount: number,
  baseCurrency: Currency
): { mtm: number; dv01: number; parRate: number } {
  const buySellSign = direction === 'BUY' ? 1 : -1;
  const estCurrentOptionValue = premiumAmount * 1.05; // Slight market movement
  const mtm = Math.round((estCurrentOptionValue - premiumAmount) * buySellSign);
  const dv01 = Math.round(callAmount * 0.0001 * 0.5); // 50-delta option approx

  return { mtm, dv01, parRate: strikePrice };
}

/**
 * Calculates Bond Valuation, Clean/Dirty Price, YTM, DV01, and MTM
 */
export function calculateBondValuation(
  couponRatePct: number,
  yieldToMaturityPct: number,
  notional: number,
  tenorYears: number,
  cleanPrice: number
): { mtm: number; dv01: number; parRate: number; dirtyPrice: number } {
  // Dirty price = Clean Price + Accrued interest estimate (approx 0.5 * coupon)
  const accruedInterest = couponRatePct * 0.5;
  const dirtyPrice = cleanPrice + accruedInterest;
  
  // DV01 calculation for fixed income bond based on Modified Duration
  const modifiedDuration = tenorYears / (1 + yieldToMaturityPct / 100);
  const dv01 = Math.round(notional * (dirtyPrice / 100) * (modifiedDuration / 10000));
  
  // Price differential MTM vs Par
  const mtm = Math.round(((cleanPrice - 100) / 100) * notional);
  return { mtm, dv01, parRate: yieldToMaturityPct, dirtyPrice };
}

/**
 * Calculates FRA (Forward Rate Agreement) Valuation & DV01
 */
export function calculateFraValuation(
  fraRatePct: number,
  marketForwardRatePct: number,
  notional: number,
  tenorYears: number
): { mtm: number; dv01: number; parRate: number } {
  const rateDiff = (marketForwardRatePct - fraRatePct) / 100;
  // FRA DV01 approx 1bp over fractional tenor (e.g. 3M = 0.25y)
  const periodFraction = Math.min(1.0, tenorYears || 0.25);
  const dv01 = Math.round(notional * periodFraction * 0.0001);
  const mtm = Math.round(rateDiff * periodFraction * notional);
  return { mtm, dv01, parRate: marketForwardRatePct };
}

/**
 * Calculates Cash Term Deposit / Loan Valuation
 */
export function calculateDepositValuation(
  depositRatePct: number,
  marketDepositRatePct: number,
  notional: number,
  termDays: number,
  direction: 'LEND' | 'BORROW'
): { mtm: number; dv01: number; parRate: number } {
  const termFraction = termDays / 360;
  const directionSign = direction === 'LEND' ? 1 : -1;
  const rateDiff = (depositRatePct - marketDepositRatePct) / 100;
  const mtm = Math.round(rateDiff * termFraction * notional * directionSign);
  const dv01 = Math.round(notional * termFraction * 0.0001);
  return { mtm, dv01, parRate: marketDepositRatePct };
}

/**
 * Calculates Repo / Reverse Repo Valuation
 */
export function calculateRepoValuation(
  repoRatePct: number,
  marketRepoRatePct: number,
  purchasePrice: number,
  tenorYears: number,
  repoType: 'CLASSIC_REPO' | 'REVERSE_REPO'
): { mtm: number; dv01: number; parRate: number } {
  const directionSign = repoType === 'CLASSIC_REPO' ? -1 : 1;
  const periodFraction = Math.min(1.0, tenorYears || 0.08); // e.g. 1M term
  const rateDiff = (marketRepoRatePct - repoRatePct) / 100;
  const mtm = Math.round(rateDiff * periodFraction * purchasePrice * directionSign);
  const dv01 = Math.round(purchasePrice * periodFraction * 0.0001);
  return { mtm, dv01, parRate: marketRepoRatePct };
}


/**
 * Summarizes position metrics grouped by currency
 */
/**
 * Calculates Dual Digital Interest Rate Swap / Option Valuation
 * Evaluates bivariate cumulative normal / joint trigger probability:
 * Payoff = Binary Payout if (Index1 Condition1 Trigger1) AND (Index2 Condition2 Trigger2)
 */
export function calculateDualDigitalValuation(
  direction: 'PAY_DIGITAL' | 'RECEIVE_DIGITAL',
  digitalPayoutAmount: number,
  payoutType: 'FIXED_AMOUNT' | 'COUPON_PERCENT',
  index1: string,
  condition1Operator: 'GREATER_THAN' | 'LESS_THAN',
  trigger1Rate: number,
  index2: string,
  condition2Operator: 'GREATER_THAN' | 'LESS_THAN',
  trigger2Rate: number,
  impliedCorrelation: number,
  notional: number,
  tenorYears: number,
  currentRate1: number,
  currentRate2: number
): { mtm: number; dv01: number; jointProbability: number } {
  // 1. Calculate marginal condition probabilities (d1 / d2 moneyness proxy)
  const isCond1Met = condition1Operator === 'GREATER_THAN' ? currentRate1 >= trigger1Rate : currentRate1 <= trigger1Rate;
  const isCond2Met = condition2Operator === 'GREATER_THAN' ? currentRate2 >= trigger2Rate : currentRate2 <= trigger2Rate;

  // Single-variable marginal probabilities
  const dist1 = Math.abs(currentRate1 - trigger1Rate) / 0.50; // 50bps vol scale
  const dist2 = Math.abs(currentRate2 - trigger2Rate) / 0.50;
  
  const prob1 = isCond1Met ? Math.min(0.95, 0.5 + 0.4 * Math.tanh(dist1)) : Math.max(0.05, 0.5 - 0.4 * Math.tanh(dist1));
  const prob2 = isCond2Met ? Math.min(0.95, 0.5 + 0.4 * Math.tanh(dist2)) : Math.max(0.05, 0.5 - 0.4 * Math.tanh(dist2));

  // Bivariate Joint Probability with correlation term rho
  // Joint P(A and B) = P(A)*P(B) + rho * sqrt(P(A)(1-P(A))*P(B)(1-P(B)))
  const correlationEffect = impliedCorrelation * Math.sqrt(prob1 * (1 - prob1) * prob2 * (1 - prob2));
  const jointProbability = Math.max(0.01, Math.min(0.99, prob1 * prob2 + correlationEffect));

  // Calculate Expected Payout Value
  const rawPayoutUsd = payoutType === 'FIXED_AMOUNT' ? digitalPayoutAmount : (digitalPayoutAmount / 100) * notional;
  const expectedPayoutUsd = rawPayoutUsd * jointProbability;

  const sign = direction === 'RECEIVE_DIGITAL' ? 1 : -1;
  const mtm = Math.round(expectedPayoutUsd * sign);

  // Dual Digital DV01 Sensitivity (digital gamma peak near triggers)
  const dv01 = Math.round((notional * 0.00015 * jointProbability * (1 - jointProbability)) * 100);

  return { mtm, dv01, jointProbability: parseFloat((jointProbability * 100).toFixed(2)) };
}

export function summarizePositionsByCurrency(trades: IRSwapTrade[]): PositionSummary[] {
  const groups: Record<string, PositionSummary> = {};

  trades.forEach((trade) => {
    if (trade.status === 'TERMINATED' || trade.status === 'MATURED' || trade.status === 'DRAFT') return;

    const ccy = trade.fixedLeg?.currency || trade.capFloorDetails?.currency || trade.swaptionDetails?.currency || trade.fxForwardDetails?.baseCurrency || trade.fxOptionDetails?.callCurrency || 'USD';
    const notional = trade.notionalUsd || trade.fixedLeg?.notional || trade.capFloorDetails?.notional || trade.swaptionDetails?.notional || trade.fxForwardDetails?.baseAmount || trade.fxOptionDetails?.callAmount || 10000000;

    if (!groups[ccy]) {
      groups[ccy] = {
        currency: ccy,
        tradeCount: 0,
        grossNotional: 0,
        netNotional: 0,
        totalDv01: 0,
        totalMtm: 0,
      };
    }

    const g = groups[ccy];
    g.tradeCount += 1;
    g.grossNotional += notional;

    // Direction sign: PAY_FIXED/SELL is -Notional; RECEIVE_FIXED/BUY is +Notional
    const isPay = trade.fixedLeg?.direction === 'PAY_FIXED' || trade.capFloorDetails?.direction === 'SELL' || trade.swaptionDetails?.direction === 'SELL' || trade.fxForwardDetails?.direction === 'SELL_BASE' || trade.fxOptionDetails?.direction === 'SELL';
    const notionalSign = isPay ? -1 : 1;

    g.netNotional += notional * notionalSign;
    g.totalDv01 += (trade.dv01 || 0) * (isPay ? 1 : -1);
    g.totalMtm += (trade.markToMarket || 0);
  });

  return Object.values(groups);
}

/**
 * Calculates DV01 risk buckets by tenor
 */
export function calculateTenorRiskBuckets(trades: IRSwapTrade[]): TenorDv01Risk[] {
  const buckets: Record<string, TenorDv01Risk> = {
    '2Y': { tenorBucket: '2Y', payDv01: 0, receiveDv01: 0, netDv01: 0 },
    '5Y': { tenorBucket: '5Y', payDv01: 0, receiveDv01: 0, netDv01: 0 },
    '10Y': { tenorBucket: '10Y', payDv01: 0, receiveDv01: 0, netDv01: 0 },
    '30Y': { tenorBucket: '30Y', payDv01: 0, receiveDv01: 0, netDv01: 0 },
    'OTHER': { tenorBucket: 'OTHER', payDv01: 0, receiveDv01: 0, netDv01: 0 },
  };

  trades.forEach((t) => {
    if (t.status === 'TERMINATED' || t.status === 'MATURED' || t.status === 'DRAFT') return;

    const bKey = getTenorBucket(t.tenorYears);
    const b = buckets[bKey];
    if (t.fixedLeg.direction === 'PAY_FIXED') {
      b.payDv01 += t.dv01;
    } else {
      b.receiveDv01 += t.dv01;
    }
    b.netDv01 = b.payDv01 - b.receiveDv01;
  });

  return Object.values(buckets);
}
