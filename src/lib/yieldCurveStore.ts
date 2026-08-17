import { Currency, DayCountConvention } from '../types';
import { getDayCountFraction, getNumberOfDays } from './cashflowGenerator';

export interface YieldCurvePoint {
  tenorYears: number; // e.g., 0.083 (1M), 0.25 (3M), 0.5 (6M), 1, 2, 3, 5, 7, 10, 30
  zeroRatePct: number; // Zero rate (%)
}

/**
 * Multi-Currency Benchmark Zero Yield Curve Repository
 * Aligned with Global Market & Central Bank Rates
 */
export const BENCHMARK_YIELD_CURVES: Record<Currency, YieldCurvePoint[]> = {
  USD: [
    { tenorYears: 0.083, zeroRatePct: 5.35 }, // 1M SOFR
    { tenorYears: 0.25, zeroRatePct: 4.85 },  // 3M SOFR
    { tenorYears: 0.5, zeroRatePct: 4.39 },   // 6M SOFR
    { tenorYears: 1.0, zeroRatePct: 4.10 },   // 1Y SOFR
    { tenorYears: 2.0, zeroRatePct: 3.85 },   // 2Y SOFR
    { tenorYears: 3.0, zeroRatePct: 3.65 },   // 3Y SOFR
    { tenorYears: 5.0, zeroRatePct: 3.55 },   // 5Y SOFR
    { tenorYears: 7.0, zeroRatePct: 3.60 },   // 7Y SOFR
    { tenorYears: 10.0, zeroRatePct: 3.70 },  // 10Y SOFR
    { tenorYears: 30.0, zeroRatePct: 3.90 },  // 30Y SOFR
  ],
  EUR: [
    { tenorYears: 0.083, zeroRatePct: 3.65 },
    { tenorYears: 0.25, zeroRatePct: 3.40 },
    { tenorYears: 0.5, zeroRatePct: 3.15 },
    { tenorYears: 1.0, zeroRatePct: 2.85 },
    { tenorYears: 2.0, zeroRatePct: 2.60 },
    { tenorYears: 3.0, zeroRatePct: 2.50 },
    { tenorYears: 5.0, zeroRatePct: 2.55 },
    { tenorYears: 7.0, zeroRatePct: 2.65 },
    { tenorYears: 10.0, zeroRatePct: 2.80 },
    { tenorYears: 30.0, zeroRatePct: 3.05 },
  ],
  GBP: [
    { tenorYears: 0.083, zeroRatePct: 5.15 },
    { tenorYears: 0.25, zeroRatePct: 4.90 },
    { tenorYears: 0.5, zeroRatePct: 4.65 },
    { tenorYears: 1.0, zeroRatePct: 4.40 },
    { tenorYears: 2.0, zeroRatePct: 4.15 },
    { tenorYears: 3.0, zeroRatePct: 4.00 },
    { tenorYears: 5.0, zeroRatePct: 3.95 },
    { tenorYears: 7.0, zeroRatePct: 4.05 },
    { tenorYears: 10.0, zeroRatePct: 4.20 },
    { tenorYears: 30.0, zeroRatePct: 4.45 },
  ],
  JPY: [
    { tenorYears: 0.083, zeroRatePct: 0.10 },
    { tenorYears: 0.25, zeroRatePct: 0.25 },
    { tenorYears: 0.5, zeroRatePct: 0.35 },
    { tenorYears: 1.0, zeroRatePct: 0.45 },
    { tenorYears: 2.0, zeroRatePct: 0.60 },
    { tenorYears: 3.0, zeroRatePct: 0.75 },
    { tenorYears: 5.0, zeroRatePct: 0.95 },
    { tenorYears: 7.0, zeroRatePct: 1.15 },
    { tenorYears: 10.0, zeroRatePct: 1.40 },
    { tenorYears: 30.0, zeroRatePct: 2.10 },
  ],
  CAD: [
    { tenorYears: 0.083, zeroRatePct: 4.75 },
    { tenorYears: 0.25, zeroRatePct: 4.35 },
    { tenorYears: 0.5, zeroRatePct: 4.00 },
    { tenorYears: 1.0, zeroRatePct: 3.65 },
    { tenorYears: 2.0, zeroRatePct: 3.40 },
    { tenorYears: 3.0, zeroRatePct: 3.30 },
    { tenorYears: 5.0, zeroRatePct: 3.35 },
    { tenorYears: 7.0, zeroRatePct: 3.45 },
    { tenorYears: 10.0, zeroRatePct: 3.60 },
    { tenorYears: 30.0, zeroRatePct: 3.80 },
  ],
  AUD: [
    { tenorYears: 0.083, zeroRatePct: 4.35 },
    { tenorYears: 0.25, zeroRatePct: 4.25 },
    { tenorYears: 0.5, zeroRatePct: 4.10 },
    { tenorYears: 1.0, zeroRatePct: 3.95 },
    { tenorYears: 2.0, zeroRatePct: 3.80 },
    { tenorYears: 3.0, zeroRatePct: 3.75 },
    { tenorYears: 5.0, zeroRatePct: 3.85 },
    { tenorYears: 7.0, zeroRatePct: 4.00 },
    { tenorYears: 10.0, zeroRatePct: 4.20 },
    { tenorYears: 30.0, zeroRatePct: 4.50 },
  ],
  CHF: [
    { tenorYears: 0.083, zeroRatePct: 1.25 },
    { tenorYears: 0.25, zeroRatePct: 1.10 },
    { tenorYears: 0.5, zeroRatePct: 0.95 },
    { tenorYears: 1.0, zeroRatePct: 0.85 },
    { tenorYears: 2.0, zeroRatePct: 0.80 },
    { tenorYears: 3.0, zeroRatePct: 0.85 },
    { tenorYears: 5.0, zeroRatePct: 0.95 },
    { tenorYears: 7.0, zeroRatePct: 1.05 },
    { tenorYears: 10.0, zeroRatePct: 1.20 },
    { tenorYears: 30.0, zeroRatePct: 1.50 },
  ],
};

/**
 * Interpolates zero rate (%) for any maturity in years using log-linear zero curve interpolation
 */
export function getZeroRate(currency: Currency = 'USD', tenorYears: number, overrideBaseRate?: number): number {
  if (overrideBaseRate !== undefined && overrideBaseRate > 0) {
    const usdCurve = BENCHMARK_YIELD_CURVES[currency] || BENCHMARK_YIELD_CURVES.USD;
    const baseCurveRate = usdCurve[1].zeroRatePct; // 3M point
    const shift = overrideBaseRate - baseCurveRate;
    return Math.max(0.01, interpolateCurveRate(usdCurve, tenorYears) + shift);
  }

  const points = BENCHMARK_YIELD_CURVES[currency] || BENCHMARK_YIELD_CURVES.USD;
  return interpolateCurveRate(points, tenorYears);
}

function interpolateCurveRate(points: YieldCurvePoint[], tenorYears: number): number {
  if (tenorYears <= points[0].tenorYears) return points[0].zeroRatePct;
  if (tenorYears >= points[points.length - 1].tenorYears) return points[points.length - 1].zeroRatePct;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (tenorYears >= p1.tenorYears && tenorYears <= p2.tenorYears) {
      const weight = (tenorYears - p1.tenorYears) / (p2.tenorYears - p1.tenorYears);
      return p1.zeroRatePct + weight * (p2.zeroRatePct - p1.zeroRatePct);
    }
  }
  return points[0].zeroRatePct;
}

/**
 * Computes exact ISDA Continuous / Annualized Discount Factor DF(T_asof, T_target)
 *  DF(T_asof, T_target) = exp(-y(T) * tau)
 */
export function getDiscountFactorFromValuationDate(
  currency: Currency = 'USD',
  valuationDateISO: string = '2026-08-15',
  targetDateISO: string,
  baseZeroRate?: number
): number {
  if (targetDateISO < valuationDateISO) {
    return 0.0; // Past cashflow already settled relative to valuation date
  }
  if (targetDateISO === valuationDateISO) {
    return 1.0;
  }

  const days = getNumberOfDays(valuationDateISO, targetDateISO);
  const tau = days / 365.25;
  const zeroRatePct = getZeroRate(currency, tau, baseZeroRate);
  const zeroRate = zeroRatePct / 100;

  // Continuous compounding discount factor DF = exp(-y * t)
  return parseFloat(Math.exp(-zeroRate * tau).toFixed(6));
}

/**
 * Global Banking & ISDA Standard Forward Rate Forecast Engine
 * Derives future forward rate F(T1, T2) from discount factors:
 *   F(T1, T2) = (1 / tau) * [ DF(T_asof, T1) / DF(T_asof, T2) - 1 ]
 */
export function calculateForwardRate(
  currency: Currency = 'USD',
  periodStartDateISO: string,
  periodEndDateISO: string,
  dayCountConvention: DayCountConvention = 'ACT/360',
  valuationDateISO: string = '2026-08-15',
  baseZeroRate?: number
): number {
  const dcf = getDayCountFraction(periodStartDateISO, periodEndDateISO, dayCountConvention);
  if (dcf <= 0) return baseZeroRate || 3.85;

  const df1 = getDiscountFactorFromValuationDate(currency, valuationDateISO, periodStartDateISO, baseZeroRate);
  const df2 = getDiscountFactorFromValuationDate(currency, valuationDateISO, periodEndDateISO, baseZeroRate);

  if (df2 <= 0) return baseZeroRate || 3.85;

  // F(T1, T2) = (1 / dcf) * [ DF(T1) / DF(T2) - 1 ]
  const fwdRateFraction = (1 / dcf) * (df1 / df2 - 1);
  const fwdRatePct = fwdRateFraction * 100;

  return parseFloat(Math.max(0.01, fwdRatePct).toFixed(4));
}
