import { IRSwapTrade, ProductType, Currency, DayCountConvention, PaymentFrequency, ResetType, GenericSwapLeg, FixedLeg, LegType, BusinessCalendar, BusinessDayRollConvention, IndexTenor } from '../types';
import { convertCurrency } from './fxRates';
import { getOfficialHistoricalFixingRate, OFFICIAL_INDEX_REGISTRY, getFixingLagDays } from './historicalFixingStore';
import { adjustBusinessDay, isBusinessDay, getBusinessDayDifference } from './businessCalendar';
import { calculateForwardRate, getDiscountFactorFromValuationDate } from './yieldCurveStore';

export interface CashflowPeriod {
  periodNumber: number;
  startDate: string;             // StartDate / Effective Date of period
  endDate: string;               // EndDate / Maturity Date of period
  accrualStartDate?: string;     // Accrual Start Date
  accrualEndDate?: string;       // Accrual End Date
  resetType?: ResetType;         // Reset Type ('ADVANCE' | 'ARREARS')
  paymentDate: string;           // Payment Date
  fixingDate?: string;           // Fixing Date
  resetStartDate: string;        // ResetStartDate (Rate reset period start)
  resetEndDate: string;          // ResetEndDate (Rate reset period end)
  payResetDate: string;          // PayResetDate (Reset payment date)
  numberOfDays: number;          // Exact calendar days in period (e.g. 180, 91)
  dayCountFraction: number;      // Day Count Fraction alpha
  dayCountConvention: DayCountConvention | string; // Selected Convention ('30/360', 'ACT/360', 'ACT/365', 'ACT/ACT')
  fixedLegConvention?: DayCountConvention | string;
  floatingLegConvention?: DayCountConvention | string;
  fixedLegCurrency?: Currency;
  floatingLegCurrency?: Currency;
  isCrossCurrency?: boolean;
  notional: number;
  fixedLegNotional?: number;
  floatingLegNotional?: number;
  fixedLegFrequency?: PaymentFrequency | string;
  floatingLegFrequency?: PaymentFrequency | string;

  // Calendar & Roll Conventions
  accrualCalendar?: BusinessCalendar | string;
  paymentCalendar?: BusinessCalendar | string;
  accrualRollConvention?: BusinessDayRollConvention | string;
  paymentRollConvention?: BusinessDayRollConvention | string;

  // Explicit Leg Rates & Fixing Parameters
  fixedCouponRate?: number;      // Fixed Leg Coupon Rate (%) e.g. 3.85%
  floatingFixingRate?: number;   // Floating Leg Index Benchmark Fixing Rate (%) e.g. 3.90%
  floatingSpreadBps?: number;    // Floating Leg Spread (bps) e.g. +15 bps
  floatingTotalRate?: number;    // Floating Leg Total Rate (%) = Fixing Rate + (Spread / 100)

  couponRate?: number;           // Coupon Rate (%) (Fixed leg rate or strike)
  fixingRate?: number;           // Fixing Rate (%) (Floating index rate)
  fixedRate?: number;            // %
  floatingRate?: number;         // %
  strikeRate?: number;           // %

  fixedCashflow?: number;
  floatingCashflow?: number;
  capFloorPayoffPercent?: number; // %
  netCashflow: number;

  // Risk & Sensitivity
  irDelta: number;               // Period IRDelta / DV01 ($ sensitivity per 1bp shift)

  discountFactor: number;
  discountedCashflow: number;
  cumulativeCashflow: number;
  type: 'PREMIUM' | 'INTEREST' | 'EXCHANGE' | 'SETTLEMENT' | 'OPTION_EXERCISE';
  description: string;
}

export interface CashflowScheduleSummary {
  tradeId: string;
  productType: ProductType;
  currency: Currency;
  fixedLegCurrency?: Currency;
  floatingLegCurrency?: Currency;
  isCrossCurrency?: boolean;
  notional: number;
  effectiveDate: string;
  maturityDate: string;
  totalFixedCashflow: number;
  totalFloatingCashflow: number;
  totalNetCashflow: number;
  totalPV: number;
  pvNoCash?: number;            // PV excluding cashflows settling on trade date / cash on the day
  cashOnTheDay?: number;        // Immediate upfront cashflow / premium / T+0 settlement cash
  totalIrDelta: number;          // Total Trade IRDelta (DV01 in $)
  accrualCalendar?: BusinessCalendar | string;
  paymentCalendar?: BusinessCalendar | string;
  accrualRollConvention?: BusinessDayRollConvention | string;
  paymentRollConvention?: BusinessDayRollConvention | string;
  periods: CashflowPeriod[];
}

export interface IndependentLegSchedule {
  legName: string;
  legType?: LegType;
  currency: Currency;
  notional: number;
  frequency: PaymentFrequency | string;
  dayCount?: DayCountConvention | string;
  dayCountConvention?: DayCountConvention | string;
  direction?: string;
  totalCashflow: number;
  totalPV?: number;
  periods: Array<{
    periodNumber: number;
    startDate: string;
    endDate: string;
    paymentDate?: string;
    payDate?: string;
    resetStartDate?: string;
    resetEndDate?: string;
    numberOfDays: number;
    dayCountFraction: number;
    rate?: number;
    ratePct?: number;
    fixingRate?: number;
    floatingFixingRate?: number;
    floatingTotalRate?: number;
    spreadBps?: number;
    cashflow?: number;
    cashflowAmount?: number;
    discountFactor?: number;
    pv?: number;
    description?: string;
    notional?: number;
    currency?: Currency;
  }>;
}

/**
 * Helper to add months to a date string YYYY-MM-DD
 */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

/**
 * Helper to add calendar days to a date string YYYY-MM-DD
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Safely resolves the agreed fixed rate for a leg or trade, preventing 0% falsy fallback bugs
 */
export function resolveFixedRate(
  leg?: GenericSwapLeg | FixedLeg,
  trade?: IRSwapTrade
): number {
  if (leg && 'fixedRate' in leg && typeof leg.fixedRate === 'number' && !isNaN(leg.fixedRate)) {
    return leg.fixedRate;
  }
  if (trade?.leg1 && 'fixedRate' in trade.leg1 && typeof trade.leg1.fixedRate === 'number' && !isNaN(trade.leg1.fixedRate)) {
    return trade.leg1.fixedRate;
  }
  if (trade?.leg2 && 'fixedRate' in trade.leg2 && typeof trade.leg2.fixedRate === 'number' && !isNaN(trade.leg2.fixedRate)) {
    return trade.leg2.fixedRate;
  }
  if (trade?.fixedLeg?.fixedRate !== undefined && typeof trade.fixedLeg.fixedRate === 'number' && !isNaN(trade.fixedLeg.fixedRate)) {
    return trade.fixedLeg.fixedRate;
  }
  if (trade?.parRate !== undefined && typeof trade.parRate === 'number' && !isNaN(trade.parRate)) {
    return trade.parRate;
  }
  return 3.85;
}

/**
 * Calculates exact calendar days between two ISO date strings YYYY-MM-DD
 */
export function getNumberOfDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 180;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Computes exact Day Count Fraction (alpha) according to standard market conventions
 */
export function getDayCountFraction(
  startDateStr: string,
  endDateStr: string,
  convention: DayCountConvention | string = '30/360'
): number {
  const d1 = new Date(startDateStr);
  const d2 = new Date(endDateStr);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0.5;

  const y1 = d1.getFullYear();
  const m1 = d1.getMonth() + 1;
  const day1 = d1.getDate();

  const y2 = d2.getFullYear();
  const m2 = d2.getMonth() + 1;
  const day2 = d2.getDate();

  switch (convention) {
    case '30/360': {
      const day1Adj = Math.min(day1, 30);
      const day2Adj = day1Adj === 30 ? Math.min(day2, 30) : day2;
      const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (day2Adj - day1Adj);
      return parseFloat((days / 360).toFixed(6));
    }
    case 'ACT/360': {
      const days = getNumberOfDays(startDateStr, endDateStr);
      return parseFloat((days / 360).toFixed(6));
    }
    case 'ACT/365': {
      const days = getNumberOfDays(startDateStr, endDateStr);
      return parseFloat((days / 365).toFixed(6));
    }
    case 'ACT/ACT': {
      const days = getNumberOfDays(startDateStr, endDateStr);
      const year = d1.getFullYear();
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeap ? 366 : 365;
      return parseFloat((days / daysInYear).toFixed(6));
    }
    default: {
      const days = getNumberOfDays(startDateStr, endDateStr);
      return parseFloat((days / 360).toFixed(6));
    }
  }
}

/**
 * Returns next period end date based on payment frequency
 */
export function getNextPeriodEndDate(startDateStr: string, frequency: PaymentFrequency | string = '6M'): string {
  const monthsMap: Record<string, number> = {
    '1D': 0.033,
    '1M': 1,
    '3M': 3,
    '6M': 6,
    '12M': 12,
    '1Y': 12,
  };
  const m = monthsMap[frequency] || 6;
  return addMonths(startDateStr, m);
}

/**
 * Returns baseline benchmark rate (%) for a given index symbol or currency
 */
export function getBenchmarkFixingRate(indexOrCcy?: string, indexTenor?: IndexTenor | string): number {
  if (!indexOrCcy) return 3.85;
  const upper = indexOrCcy.toUpperCase();
  let baseRate = 3.85;

  if (upper.includes('SOFR') || upper.includes('USD')) baseRate = 3.85;
  else if (upper.includes('EURIBOR') || upper.includes('ESTR') || upper.includes('EUR')) baseRate = 2.75;
  else if (upper.includes('SONIA') || upper.includes('GBP')) baseRate = 4.15;
  else if (upper.includes('TONA') || upper.includes('JPY')) baseRate = 0.25;
  else if (upper.includes('SARON') || upper.includes('CHF')) baseRate = 1.10;
  else if (upper.includes('CDOR') || upper.includes('CORRA') || upper.includes('CAD')) baseRate = 3.25;
  else if (upper.includes('AONIA') || upper.includes('BBSW') || upper.includes('AUD')) baseRate = 3.80;

  if (indexTenor) {
    const tUpper = indexTenor.toUpperCase();
    if (tUpper === '1D') return 3.66;
    if (tUpper === '1M') return parseFloat((baseRate + 0.05).toFixed(4));
    if (tUpper === '3M') return parseFloat((baseRate + 0.12).toFixed(4));
    if (tUpper === '6M') return parseFloat((baseRate + 0.18).toFixed(4));
    if (tUpper === '12M' || tUpper === '1Y') return parseFloat((baseRate + 0.25).toFixed(4));
    if (tUpper === '2Y') return parseFloat((baseRate + 0.38).toFixed(4));
    if (tUpper === '5Y') return parseFloat((baseRate + 0.55).toFixed(4));
    if (tUpper === '10Y') return parseFloat((baseRate + 0.72).toFixed(4));
    if (tUpper === '20Y') return parseFloat((baseRate + 0.80).toFixed(4));
    if (tUpper === '30Y') return parseFloat((baseRate + 0.85).toFixed(4));
  }

  return baseRate;
}

/**
 * Official Published Historical Index Fixing Rates Repository
 * Delegates to historicalFixingStore.ts (Official Publisher Time-Series Repository)
 */
export function getHistoricalFixingRate(
  indexSymbol: string = 'SOFR',
  dateStr?: string,
  indexTenor?: IndexTenor | string
): number | null {
  const result = getOfficialHistoricalFixingRate(indexSymbol, dateStr, indexTenor);
  return result ? result.ratePct : null;
}

/**
 * Global Banking Standard Period Fixing Rate Resolver
 *  - Historical Date (T_fixing <= T_asof): Returns official published rate from historicalFixingStore.ts
 *  - Future Date (T_fixing > T_asof): Forecasts forward rate F(T1, T2) = (1/tau) * [ DF(T1)/DF(T2) - 1 ]
 */
export function getPeriodFixingRate(
  indexSymbol: string,
  dateStr: string,
  periodNum: number,
  baseRate: number,
  indexTenor?: IndexTenor | string,
  valuationDateISO: string = '2026-08-15',
  periodStartDateISO?: string,
  periodEndDateISO?: string,
  dayCountConvention: DayCountConvention = 'ACT/360'
): number {
  const officialRes = getOfficialHistoricalFixingRate(indexSymbol, dateStr, indexTenor, valuationDateISO);
  if (officialRes !== null) {
    return officialRes.ratePct;
  }
  
  // Future date -> Derive forward rate via yield curve equation F(T1, T2) = (1/tau) * [ DF(T1)/DF(T2) - 1 ]
  if (periodStartDateISO && periodEndDateISO) {
    const ccy = (OFFICIAL_INDEX_REGISTRY[indexSymbol]?.currency || 'USD') as Currency;
    return calculateForwardRate(ccy, periodStartDateISO, periodEndDateISO, dayCountConvention, valuationDateISO, baseRate);
  }

  return derivePeriodFixingRate(baseRate, periodNum, 0.035);
}

/**
 * Derives a dynamic period-specific forward fixing rate (%) for floating legs
 */
export function derivePeriodFixingRate(baseRate: number, periodNum: number, tenorMultiplier = 0.035): number {
  const curveDrift = (periodNum - 1) * tenorMultiplier;
  const curveSeasonality = Math.sin(periodNum * 0.5) * 0.08;
  return parseFloat((baseRate + curveDrift + curveSeasonality).toFixed(4));
}

/**
 * Generates Cashflow Schedule for Interest Rate Swaps (IRS / Basis Swaps / Cross Currency Swaps)
 */
export function generateIRSwapCashflowSchedule(
  trade: IRSwapTrade,
  dateOverrides?: Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>
): CashflowScheduleSummary {
  const overrides = dateOverrides || trade.scheduleDateOverrides || {};

  // Check if trade uses generic leg1 & leg2 (e.g., Float vs Float Basis Swap)
  const leg1 = trade.leg1;
  const leg2 = trade.leg2;

  if (leg1 && leg2) {
    const leg1Ccy = leg1.currency || 'USD';
    const leg2Ccy = leg2.currency || leg1Ccy;
    const isCrossCurrency = leg1Ccy !== leg2Ccy;

    const leg1Notional = leg1.notional || trade.notionalUsd || 25000000;
    const leg2Notional = leg2.notional || leg1Notional;

    const leg1Convention = leg1.dayCount || '30/360';
    const leg2Convention = leg2.dayCount || 'ACT/360';

    const leg1Freq = leg1.frequency || trade.fixedLeg?.frequency || '6M';
    const leg2Freq = leg2.frequency || trade.floatingLeg?.frequency || leg1Freq || '6M';

    const periods: CashflowPeriod[] = [];
    let currStart = trade.effectiveDate || '2026-08-01';
    const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

    let periodNum = 1;
    let cumCashflow = 0;
    let totalFixed = 0;
    let totalFloating = 0;
    let totalNet = 0;
    let totalPV = 0;
    let totalIrDelta = 0;

    const discountRate = (trade.parRate || 3.85) / 100;

    while (currStart < maturity && periodNum <= 120) {
      const monthsMap: Record<string, number> = { '1D': 0.033, '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
      const leg1M = monthsMap[leg1Freq] || 6;
      const leg2M = monthsMap[leg2Freq] || 6;
      const stepFreq = leg1M <= leg2M ? leg1Freq : leg2Freq;
      let defaultEnd = getNextPeriodEndDate(currStart, stepFreq);
      if (defaultEnd > maturity) defaultEnd = maturity;

      // Apply overrides for main period (key 'P-{periodNum}')
      const ov = overrides[`P-${periodNum}`] || {};
      const effStart = ov.startDate || currStart;
      const effEnd = ov.endDate || defaultEnd;

      const numDays = getNumberOfDays(effStart, effEnd);
      const leg1Dcf = getDayCountFraction(effStart, effEnd, leg1Convention);
      const leg2Dcf = getDayCountFraction(effStart, effEnd, leg2Convention);

      const resetType: ResetType = leg2.resetType || leg1.resetType || trade.floatingLeg?.resetType || 'ADVANCE';
      const accrualCal = leg1.accrualCalendar || leg2.accrualCalendar || trade.fixedLeg?.accrualCalendar || trade.floatingLeg?.accrualCalendar || 'USNY';
      const paymentCal = leg1.paymentCalendar || leg2.paymentCalendar || trade.fixedLeg?.paymentCalendar || trade.floatingLeg?.paymentCalendar || 'USNY';
      const accrualRoll = leg1.accrualRollConvention || leg2.accrualRollConvention || trade.fixedLeg?.accrualRollConvention || trade.floatingLeg?.accrualRollConvention || 'MODFOLLOWING';
      const paymentRoll = leg1.paymentRollConvention || leg2.paymentRollConvention || trade.fixedLeg?.paymentRollConvention || trade.floatingLeg?.paymentRollConvention || 'MODFOLLOWING';

      const fixingLag1 = getFixingLagDays(leg1.index || leg1.currency || 'SOFR');
      const fixingLag2 = getFixingLagDays(leg2.index || leg2.currency || 'SOFR');
      const effectiveFixingLag = leg1.legType === 'FLOATING' ? fixingLag1 : leg2.legType === 'FLOATING' ? fixingLag2 : 0;

      const leg1FixingDate = adjustBusinessDay(resetType === 'ARREARS' ? addDays(effEnd, -fixingLag1) : addDays(effStart, -fixingLag1), accrualCal, 'PRECEDING');
      const leg2FixingDate = adjustBusinessDay(resetType === 'ARREARS' ? addDays(effEnd, -fixingLag2) : addDays(effStart, -fixingLag2), accrualCal, 'PRECEDING');
      const fixingDate = adjustBusinessDay(resetType === 'ARREARS' ? addDays(effEnd, -effectiveFixingLag) : addDays(effStart, -effectiveFixingLag), accrualCal, 'PRECEDING');

      const valDateStr = '2026-08-15'; // Active Valuation Date (EOD As-Of Date)

      // LEG 1 RATE & CASHFLOW
      let leg1Rate = 0;
      let leg1Fixing = 0;
      let leg1Spread = leg1.spreadBps || 0;
      if (leg1.legType === 'FIXED') {
        leg1Rate = resolveFixedRate(leg1, trade);
      } else {
        const base1 = getBenchmarkFixingRate(leg1.index || leg1.currency || trade.fixedLeg?.currency || 'USD', leg1.indexTenor);
        leg1Fixing = getPeriodFixingRate(leg1.index || leg1.currency || 'USD', leg1FixingDate, periodNum, base1, leg1.indexTenor, valDateStr, effStart, effEnd, leg1Convention);
        leg1Rate = parseFloat((leg1Fixing + leg1Spread / 100).toFixed(4));
      }

      const leg1Raw = leg1Notional * (leg1Rate / 100) * leg1Dcf;
      const isLeg1Pay = leg1.direction === 'PAY' || leg1.direction === 'PAY_FIXED';
      const leg1Flow = isLeg1Pay ? -leg1Raw : leg1Raw;

      // LEG 2 RATE & CASHFLOW
      let leg2Rate = 0;
      let leg2Fixing = 0;
      let leg2Spread = leg2.spreadBps || 0;
      if (leg2.legType === 'FIXED') {
        leg2Rate = resolveFixedRate(leg2, trade);
      } else {
        const base2 = getBenchmarkFixingRate(leg2.index || leg2.currency || trade.floatingLeg?.currency || 'USD', leg2.indexTenor);
        leg2Fixing = getPeriodFixingRate(leg2.index || leg2.currency || 'USD', leg2FixingDate, periodNum, base2, leg2.indexTenor, valDateStr, effStart, effEnd, leg2Convention);
        leg2Rate = parseFloat((leg2Fixing + leg2Spread / 100).toFixed(4));
      }

      const leg2Raw = leg2Notional * (leg2Rate / 100) * leg2Dcf;
      const isLeg2Pay = leg2.direction === 'PAY' || leg2.direction === 'PAY_FIXED';
      const leg2Flow = isLeg2Pay ? -leg2Raw : leg2Raw;

      // Convert Leg 2 Flow to Leg 1 Currency if Cross Currency
      const leg2FlowConverted = convertCurrency(leg2Flow, leg2Ccy, leg1Ccy);

      const netCashflow = Math.round(leg1Flow + leg2FlowConverted);
      cumCashflow += netCashflow;

      totalFixed += Math.round(leg1Flow);
      totalFloating += Math.round(leg2FlowConverted);
      totalNet += netCashflow;

      const resetStartDate = ov.resetStartDate || adjustBusinessDay(effStart, accrualCal, accrualRoll);
      const resetEndDate = ov.resetEndDate || adjustBusinessDay(effEnd, accrualCal, accrualRoll);
      const payResetDate = ov.payResetDate || adjustBusinessDay(effEnd, paymentCal, paymentRoll);

      const discountFactor = getDiscountFactorFromValuationDate(leg1Ccy as Currency, valDateStr, payResetDate, discountRate * 100);
      const discountedCashflow = Math.round(netCashflow * discountFactor);
      totalPV += discountedCashflow;

      const irDelta = Math.round(leg1Notional * leg1Dcf * 0.0001 * discountFactor);
      totalIrDelta += irDelta;

      const leg1Desc = leg1.legType === 'FIXED' ? `Fixed: ${leg1Rate}%` : `Float (${leg1.index || 'SOFR'} ${leg1.indexTenor || '3M'}): ${leg1Fixing}% + ${leg1Spread}bps`;
      const leg2Desc = leg2.legType === 'FIXED' ? `Fixed: ${leg2Rate}%` : `Float (${leg2.index || 'SOFR'} ${leg2.indexTenor || '1M'}): ${leg2Fixing}% + ${leg2Spread}bps`;

      periods.push({
        periodNumber: periodNum,
        startDate: effStart,
        endDate: effEnd,
        accrualStartDate: effStart,
        accrualEndDate: effEnd,
        resetType,
        paymentDate: payResetDate,
        fixingDate,
        resetStartDate,
        resetEndDate,
        payResetDate,
        numberOfDays: numDays,
        dayCountFraction: leg1Dcf,
        dayCountConvention: leg1Convention,
        fixedLegConvention: leg1Convention,
        floatingLegConvention: leg2Convention,
        fixedLegCurrency: leg1Ccy,
        floatingLegCurrency: leg2Ccy,
        isCrossCurrency,
        notional: leg1Notional,
        fixedLegNotional: leg1Notional,
        floatingLegNotional: leg2Notional,
        fixedLegFrequency: leg1Freq,
        floatingLegFrequency: leg2Freq,

        accrualCalendar: leg1.accrualCalendar || leg2.accrualCalendar || 'USNY',
        paymentCalendar: leg1.paymentCalendar || leg2.paymentCalendar || 'USNY',
        accrualRollConvention: leg1.accrualRollConvention || 'MODFOLLOWING',
        paymentRollConvention: leg1.paymentRollConvention || 'MODFOLLOWING',

        fixedCouponRate: leg1.legType === 'FIXED' ? leg1Rate : leg2.legType === 'FIXED' ? leg2Rate : leg1Rate,
        floatingFixingRate: leg1.legType === 'FLOATING' ? leg1Fixing : leg2.legType === 'FLOATING' ? leg2Fixing : leg1Fixing,
        floatingSpreadBps: leg1.legType === 'FLOATING' ? leg1Spread : leg2.legType === 'FLOATING' ? leg2Spread : 0,
        floatingTotalRate: leg1.legType === 'FLOATING' ? leg1Rate : leg2.legType === 'FLOATING' ? leg2Rate : leg2Rate,

        couponRate: leg1.legType === 'FIXED' ? leg1Rate : leg2.legType === 'FIXED' ? leg2Rate : leg1Rate,
        fixingRate: leg1.legType === 'FLOATING' ? leg1Fixing : leg2.legType === 'FLOATING' ? leg2Fixing : leg2Fixing,
        fixedRate: leg1.legType === 'FIXED' ? leg1Rate : leg2Rate,
        floatingRate: leg1.legType === 'FLOATING' ? leg1Rate : leg2Rate,

        fixedCashflow: Math.round(leg1Flow),
        floatingCashflow: Math.round(leg2FlowConverted),
        netCashflow,
        irDelta,
        discountFactor,
        discountedCashflow,
        cumulativeCashflow: cumCashflow,
        type: 'INTEREST',
        description: `Period #${periodNum} [L1 ${leg1.legType}: ${leg1Desc}] vs [L2 ${leg2.legType}: ${leg2Desc}]`,
      });

      currStart = defaultEnd;
      periodNum++;
    }

    return {
      tradeId: trade.tradeId,
      productType: trade.productType,
      currency: leg1Ccy,
      fixedLegCurrency: leg1Ccy,
      floatingLegCurrency: leg2Ccy,
      isCrossCurrency,
      notional: leg1Notional,
      effectiveDate: trade.effectiveDate,
      maturityDate: trade.maturityDate,
      totalFixedCashflow: totalFixed,
      totalFloatingCashflow: totalFloating,
      totalNetCashflow: totalNet,
      totalPV,
      totalIrDelta,
      periods,
    };
  }

  // Fallback to standard FixedLeg vs FloatingLeg
  const fixed = trade.fixedLeg;
  const floating = trade.floatingLeg;

  const fixedCcy = fixed?.currency || 'USD';
  const floatCcy = floating?.currency || fixedCcy;
  const isCrossCurrency = fixedCcy !== floatCcy;

  const fixedNotional = fixed?.notional || trade.notionalUsd || 25000000;
  const floatNotional = floating?.notional || fixedNotional;
  const couponRate = resolveFixedRate(fixed, trade);

  const fixedConvention = fixed?.dayCount || '30/360';
  const floatConvention = floating?.dayCount || 'ACT/360';

  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const fixedFreq = fixed?.frequency || trade.leg1?.frequency || '6M';
  const floatFreq = floating?.frequency || trade.leg2?.frequency || fixedFreq || '6M';
  const stepMonths = freqMonthsMap[fixedFreq] || 6;

  const periods: CashflowPeriod[] = [];
  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const isPayFixed = fixed?.direction === 'PAY_FIXED';
  const discountRate = (trade.parRate || 3.85) / 100;

  let periodNum = 1;
  let cumCashflow = 0;
  let totalFixed = 0;
  let totalFloating = 0;
  let totalNet = 0;
  let totalPV = 0;
  let totalIrDelta = 0;

  while (currStart < maturity && periodNum <= 120) {
    let defaultEnd = addMonths(currStart, stepMonths);
    if (defaultEnd > maturity) defaultEnd = maturity;

    // Apply overrides for main period (key 'P-{periodNum}')
    const ov = overrides[`P-${periodNum}`] || {};
    const effStart = ov.startDate || currStart;
    const effEnd = ov.endDate || defaultEnd;

    const numDays = getNumberOfDays(effStart, effEnd);
    const fixedDcf = getDayCountFraction(effStart, effEnd, fixedConvention);
    const floatDcf = getDayCountFraction(effStart, effEnd, floatConvention);

    // Fixed Leg cashflow (in fixedCcy)
    const fixedAmountRaw = fixedNotional * (couponRate / 100) * fixedDcf;
    const fixedCashflowInFixedCcy = isPayFixed ? -fixedAmountRaw : fixedAmountRaw;

    const accrualCal = fixed?.accrualCalendar || floating?.accrualCalendar || 'USNY';
    const paymentCal = fixed?.paymentCalendar || floating?.paymentCalendar || 'USNY';
    const accrualRoll = fixed?.accrualRollConvention || floating?.accrualRollConvention || 'MODFOLLOWING';
    const paymentRoll = fixed?.paymentRollConvention || floating?.paymentRollConvention || 'MODFOLLOWING';
    const resetType: ResetType = floating?.resetType || trade.floatingLeg?.resetType || 'ADVANCE';

    const floatIdxSym = floating?.index || floatCcy || 'USD';
    const floatLag = getFixingLagDays(floatIdxSym);
    const fixingDate = adjustBusinessDay(resetType === 'ARREARS' ? addDays(effEnd, -floatLag) : addDays(effStart, -floatLag), accrualCal, 'PRECEDING');

    // Projected Floating Leg Benchmark Fixing Rate & Total Rate
    const spreadBps = floating?.spreadBps || 0;
    const spreadPercent = spreadBps / 100;
    const baseFloat = getBenchmarkFixingRate(floatIdxSym, floating?.indexTenor || trade.leg2?.indexTenor);
    const floatingFixingRate = getPeriodFixingRate(floatIdxSym, fixingDate, periodNum, baseFloat, floating?.indexTenor || trade.leg2?.indexTenor);
    const floatingTotalRate = parseFloat((floatingFixingRate + spreadPercent).toFixed(4));

    const floatAmountRaw = floatNotional * (floatingTotalRate / 100) * floatDcf;
    const floatCashflowInFloatCcy = isPayFixed ? floatAmountRaw : -floatAmountRaw;

    // Convert Float Cashflow to Fixed Leg Currency for Net Flow calculation if Cross Currency
    const floatCashflowConverted = convertCurrency(floatCashflowInFloatCcy, floatCcy, fixedCcy);

    const netCashflow = Math.round(fixedCashflowInFixedCcy + floatCashflowConverted);
    cumCashflow += netCashflow;

    totalFixed += Math.round(fixedCashflowInFixedCcy);
    totalFloating += Math.round(floatCashflowConverted);
    totalNet += netCashflow;

    // Discount Factor DF = 1 / (1 + r)^t measured from Valuation Date (tradeDate)
    const valDateStr = trade.tradeDate || trade.effectiveDate || '2026-08-01';
    const yearsFromValDate = Math.max(0, getNumberOfDays(valDateStr, effEnd) / 365.25);
    const discountFactor = valDateStr >= effEnd ? 1.0 : parseFloat((1 / Math.pow(1 + discountRate, yearsFromValDate)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    // Calculate IRDelta (DV01 per 1bp shift) for this period
    const irDelta = Math.round(fixedNotional * fixedDcf * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    const resetStartDate = ov.resetStartDate || adjustBusinessDay(effStart, accrualCal, accrualRoll);
    const resetEndDate = ov.resetEndDate || adjustBusinessDay(effEnd, accrualCal, accrualRoll);
    const payResetDate = ov.payResetDate || adjustBusinessDay(effEnd, paymentCal, paymentRoll);

    periods.push({
      periodNumber: periodNum,
      startDate: effStart,
      endDate: effEnd,
      accrualStartDate: effStart,
      accrualEndDate: effEnd,
      resetType,
      paymentDate: payResetDate,
      fixingDate,
      resetStartDate,
      resetEndDate,
      payResetDate,
      numberOfDays: numDays,
      dayCountFraction: fixedDcf,
      dayCountConvention: fixedConvention,
      fixedLegConvention: fixedConvention,
      floatingLegConvention: floatConvention,
      fixedLegCurrency: fixedCcy,
      floatingLegCurrency: floatCcy,
      isCrossCurrency,
      notional: fixedNotional,
      fixedLegNotional: fixedNotional,
      floatingLegNotional: floatNotional,
      fixedLegFrequency: fixedFreq,
      floatingLegFrequency: floatFreq,

      // Explicit Rates
      fixedCouponRate: couponRate,
      floatingFixingRate,
      floatingSpreadBps: spreadBps,
      floatingTotalRate,

      couponRate,
      fixingRate: floatingFixingRate,
      fixedRate: couponRate,
      floatingRate: floatingTotalRate,

      fixedCashflow: Math.round(fixedCashflowInFixedCcy),
      floatingCashflow: Math.round(floatCashflowInFloatCcy),
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: isCrossCurrency
        ? `XCCY Swap #${periodNum} (${fixedCcy} Fixed @ ${couponRate}% vs ${floatCcy} Float @ ${floatingTotalRate}%)`
        : `Swap Period #${periodNum} (Fixed: ${couponRate}% vs Float Fixing: ${floatingFixingRate}% + ${spreadBps}bp = ${floatingTotalRate}%)`,
    });

    currStart = defaultEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: trade.productType,
    currency: fixedCcy,
    fixedLegCurrency: fixedCcy,
    floatingLegCurrency: floatCcy,
    isCrossCurrency,
    notional: fixedNotional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: totalFixed,
    totalFloatingCashflow: totalFloating,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

/**
 * Generates Cashflow Schedule for Interest Rate Cap / Floor
 */
export function generateCapFloorCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.capFloorDetails;
  const ccy = details?.currency || trade.fixedLeg?.currency || 'USD';
  const notional = details?.notional || trade.notionalUsd || 10000000;
  const couponRate = details?.strikeRate || 4.00;
  const capFloorType = details?.capFloorType || 'CAP';
  const direction = details?.direction || 'BUY';
  const premium = details?.premiumAmount || 185000;
  const convention = details?.dayCount || 'ACT/360';
  const frequency = details?.paymentFrequency || '3M';

  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[frequency] || 3;

  const periods: CashflowPeriod[] = [];
  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 3) * 12));

  let cumCashflow = 0;
  let totalNet = 0;
  let totalPV = 0;
  let totalIrDelta = 0;

  // Period 0: Option Premium Cashflow
  const premiumCashflow = direction === 'BUY' ? -premium : premium;
  cumCashflow += premiumCashflow;
  totalNet += premiumCashflow;
  totalPV += premiumCashflow;

  periods.push({
    periodNumber: 0,
    startDate: trade.tradeDate,
    endDate: trade.effectiveDate,
    paymentDate: trade.effectiveDate,
    resetStartDate: trade.tradeDate,
    resetEndDate: trade.effectiveDate,
    payResetDate: trade.effectiveDate,
    numberOfDays: getNumberOfDays(trade.tradeDate, trade.effectiveDate),
    dayCountFraction: 0,
    dayCountConvention: convention,
    notional,
    fixedLegNotional: notional,
    floatingLegNotional: notional,
    fixedLegFrequency: frequency,
    floatingLegFrequency: frequency,
    fixedCouponRate: couponRate,
    floatingFixingRate: couponRate,
    floatingSpreadBps: 0,
    floatingTotalRate: couponRate,
    couponRate,
    strikeRate: couponRate,
    netCashflow: premiumCashflow,
    irDelta: 0,
    discountFactor: 1.0,
    discountedCashflow: premiumCashflow,
    cumulativeCashflow: cumCashflow,
    type: 'PREMIUM',
    description: `Option Premium ${direction === 'BUY' ? 'Payment Outflow' : 'Receipt Inflow'} (${capFloorType})`,
  });

  let periodNum = 1;
  const discountRate = 0.0385;

  while (currStart < maturity && periodNum <= 60) {
    let currEnd = addMonths(currStart, stepMonths);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcf = getDayCountFraction(currStart, currEnd, convention);

    // Simulated index fixing rate
    const fixingRate = parseFloat((couponRate + (periodNum % 2 === 0 ? 0.35 : -0.20)).toFixed(4));

    // Payoff calculation
    let payoffPercent = 0;
    if (capFloorType === 'CAP') {
      payoffPercent = Math.max(0, fixingRate - couponRate);
    } else {
      payoffPercent = Math.max(0, couponRate - fixingRate);
    }

    const grossPayoff = notional * (payoffPercent / 100) * dcf;
    const netCashflow = Math.round(direction === 'BUY' ? grossPayoff : -grossPayoff);

    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / (12 / stepMonths), periodNum)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcf * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    const accrualCal = details?.accrualCalendar || 'USNY';
    const paymentCal = details?.paymentCalendar || 'USNY';
    const accrualRoll = details?.accrualRollConvention || 'MODFOLLOWING';
    const paymentRoll = details?.paymentRollConvention || 'MODFOLLOWING';
    const resetType: ResetType = details?.resetType || 'ADVANCE';

    const resetStartDate = adjustBusinessDay(currStart, accrualCal, accrualRoll);
    const resetEndDate = adjustBusinessDay(currEnd, accrualCal, accrualRoll);
    const payResetDate = adjustBusinessDay(currEnd, paymentCal, paymentRoll);
    const fixingDate = adjustBusinessDay(resetType === 'ARREARS' ? addDays(currEnd, -2) : addDays(currStart, -2), accrualCal, 'PRECEDING');

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate,
      resetStartDate,
      resetEndDate,
      payResetDate,
      numberOfDays: numDays,
      dayCountFraction: dcf,
      dayCountConvention: convention,
      notional,
      fixedLegNotional: notional,
      floatingLegNotional: notional,
      fixedLegFrequency: frequency,
      floatingLegFrequency: frequency,

      fixedCouponRate: couponRate,
      floatingFixingRate: fixingRate,
      floatingSpreadBps: 0,
      floatingTotalRate: fixingRate,

      couponRate,
      fixingRate,
      strikeRate: couponRate,
      floatingRate: fixingRate,
      capFloorPayoffPercent: payoffPercent,
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `${capFloorType}let Period #${periodNum} (Strike: ${couponRate}%, Float Fixing: ${fixingRate}%)`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: trade.productType,
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: 0,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

/**
 * Generates Cashflow Schedule for Swaptions (Option + Underlying Swap)
 */
export function generateSwaptionCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.swaptionDetails;
  const ccy = details?.currency || trade.fixedLeg?.currency || 'EUR';
  const notional = details?.notional || trade.notionalUsd || 20000000;
  const couponRate = details?.strikeRate || 2.75;
  const swaptionType = details?.swaptionType || 'PAYER';
  const direction = details?.direction || 'BUY';
  const premium = details?.premiumAmount || 310000;
  const expiryDate = details?.optionExpiryDate || trade.effectiveDate;
  const underlyingMaturity = details?.underlyingMaturityDate || trade.maturityDate;
  const fixedConvention = trade.fixedLeg?.dayCount || '30/360';
  const floatConvention = trade.floatingLeg?.dayCount || 'ACT/360';
  const fixedFreq = trade.fixedLeg?.frequency || '6M';
  const floatFreq = trade.floatingLeg?.frequency || '3M';

  const periods: CashflowPeriod[] = [];
  let cumCashflow = 0;
  let totalNet = 0;
  let totalPV = 0;
  let totalIrDelta = 0;

  // Period 0: Swaption Upfront Premium
  const premiumCashflow = direction === 'BUY' ? -premium : premium;
  cumCashflow += premiumCashflow;
  totalNet += premiumCashflow;
  totalPV += premiumCashflow;

  periods.push({
    periodNumber: 0,
    startDate: trade.tradeDate,
    endDate: expiryDate,
    paymentDate: trade.tradeDate,
    resetStartDate: trade.tradeDate,
    resetEndDate: expiryDate,
    payResetDate: trade.tradeDate,
    numberOfDays: getNumberOfDays(trade.tradeDate, expiryDate),
    dayCountFraction: 0,
    dayCountConvention: fixedConvention,
    notional,
    fixedLegNotional: notional,
    floatingLegNotional: notional,
    fixedLegFrequency: fixedFreq,
    floatingLegFrequency: floatFreq,
    fixedCouponRate: couponRate,
    floatingFixingRate: couponRate,
    floatingSpreadBps: 0,
    floatingTotalRate: couponRate,
    couponRate,
    strikeRate: couponRate,
    netCashflow: premiumCashflow,
    irDelta: 0,
    discountFactor: 1.0,
    discountedCashflow: premiumCashflow,
    cumulativeCashflow: cumCashflow,
    type: 'PREMIUM',
    description: `Swaption Premium ${direction === 'BUY' ? 'Payment Outflow' : 'Receipt Inflow'} (${swaptionType} Swaption)`,
  });

  // Period 1: Exercise Date Event
  periods.push({
    periodNumber: 1,
    startDate: expiryDate,
    endDate: expiryDate,
    paymentDate: expiryDate,
    resetStartDate: expiryDate,
    resetEndDate: expiryDate,
    payResetDate: expiryDate,
    numberOfDays: 0,
    dayCountFraction: 0,
    dayCountConvention: fixedConvention,
    notional,
    fixedLegNotional: notional,
    floatingLegNotional: notional,
    fixedLegFrequency: fixedFreq,
    floatingLegFrequency: floatFreq,
    fixedCouponRate: couponRate,
    floatingFixingRate: couponRate,
    floatingSpreadBps: 0,
    floatingTotalRate: couponRate,
    couponRate,
    strikeRate: couponRate,
    netCashflow: 0,
    irDelta: 0,
    discountFactor: 0.965,
    discountedCashflow: 0,
    cumulativeCashflow: cumCashflow,
    type: 'OPTION_EXERCISE',
    description: `Swaption Expiry & Exercise Decision Date (${details?.settlementType || 'CASH'} Settlement)`,
  });

  // Underlying Swap Cashflows (if exercised)
  let currStart = expiryDate;
  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[fixedFreq] || 6;
  let periodNum = 2;
  const discountRate = 0.0275;

  while (currStart < underlyingMaturity && periodNum <= 40) {
    let currEnd = addMonths(currStart, stepMonths);
    if (currEnd > underlyingMaturity) currEnd = underlyingMaturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcf = getDayCountFraction(currStart, currEnd, fixedConvention);

    const isPayFixed = swaptionType === 'PAYER';
    const fixedAmountRaw = notional * (couponRate / 100) * dcf;
    const fixedCashflow = isPayFixed ? -fixedAmountRaw : fixedAmountRaw;

    const fixingRate = parseFloat((couponRate + 0.15).toFixed(4));
    const floatAmountRaw = notional * (fixingRate / 100) * dcf;
    const floatingCashflow = isPayFixed ? floatAmountRaw : -floatAmountRaw;

    const netCashflow = Math.round(fixedCashflow + floatingCashflow);
    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / 2, periodNum - 1)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcf * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    const resetStartDate = currStart;
    const resetEndDate = currEnd;
    const payResetDate = addDays(currEnd, 2);
    const fixingDate = addDays(currStart, -2);

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate,
      resetStartDate,
      resetEndDate,
      payResetDate,
      numberOfDays: numDays,
      dayCountFraction: dcf,
      dayCountConvention: fixedConvention,
      fixedLegConvention: fixedConvention,
      floatingLegConvention: floatConvention,
      notional,
      fixedLegNotional: notional,
      floatingLegNotional: notional,
      fixedLegFrequency: fixedFreq,
      floatingLegFrequency: floatFreq,

      fixedCouponRate: couponRate,
      floatingFixingRate: fixingRate,
      floatingSpreadBps: 0,
      floatingTotalRate: fixingRate,

      couponRate,
      fixingRate,
      fixedRate: couponRate,
      floatingRate: fixingRate,
      fixedCashflow: Math.round(fixedCashflow),
      floatingCashflow: Math.round(floatingCashflow),
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `Underlying Swap Period #${periodNum - 1} (Fixed Strike: ${couponRate}% vs Float Fixing: ${fixingRate}%)`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: trade.productType,
    currency: ccy,
    notional,
    effectiveDate: expiryDate,
    maturityDate: underlyingMaturity,
    totalFixedCashflow: 0,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

/**
 * Generates Cashflow Schedule for FX Forward / FX Option
 */
export function generateFxCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const isOption = trade.productType === 'FX_OPTION';
  const fwdDetails = trade.fxForwardDetails;
  const optDetails = trade.fxOptionDetails;

  const ccy = optDetails?.callCurrency || fwdDetails?.baseCurrency || 'EUR';
  const notional = optDetails?.callAmount || fwdDetails?.baseAmount || 15000000;
  const settlementDate = optDetails?.settlementDate || fwdDetails?.settlementDate || trade.maturityDate;

  const periods: CashflowPeriod[] = [];
  let cumCashflow = 0;

  if (isOption && optDetails) {
    const premiumCashflow = optDetails.direction === 'BUY' ? -optDetails.premiumAmount : optDetails.premiumAmount;
    cumCashflow += premiumCashflow;

    periods.push({
      periodNumber: 0,
      startDate: trade.tradeDate,
      endDate: trade.effectiveDate,
      paymentDate: trade.effectiveDate,
      resetStartDate: trade.tradeDate,
      resetEndDate: trade.effectiveDate,
      payResetDate: trade.effectiveDate,
      numberOfDays: getNumberOfDays(trade.tradeDate, trade.effectiveDate),
      dayCountFraction: 0,
      dayCountConvention: 'ACT/360',
      notional,
      fixedCouponRate: optDetails.strikePrice,
      floatingFixingRate: optDetails.strikePrice,
      floatingSpreadBps: 0,
      floatingTotalRate: optDetails.strikePrice,
      couponRate: optDetails.strikePrice,
      fixingRate: optDetails.strikePrice,
      fixedRate: optDetails.strikePrice,
      floatingRate: optDetails.strikePrice,
      netCashflow: premiumCashflow,
      irDelta: 0,
      discountFactor: 1.0,
      discountedCashflow: premiumCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'PREMIUM',
      description: `FX Option Premium ${optDetails.direction === 'BUY' ? 'Payment Outflow' : 'Receipt Inflow'} (${optDetails.optionType} @ ${optDetails.strikePrice})`,
    });

    const isCall = optDetails.optionType === 'CALL';
    const isBuy = optDetails.direction === 'BUY';
    const baseFlow = isBuy ? (isCall ? optDetails.callAmount : -optDetails.callAmount) : (isCall ? -optDetails.callAmount : optDetails.callAmount);

    cumCashflow += baseFlow;

    periods.push({
      periodNumber: 1,
      startDate: optDetails.expiryDate,
      endDate: settlementDate,
      paymentDate: settlementDate,
      fixingDate: optDetails.expiryDate,
      resetStartDate: optDetails.expiryDate,
      resetEndDate: settlementDate,
      payResetDate: settlementDate,
      numberOfDays: getNumberOfDays(optDetails.expiryDate, settlementDate),
      dayCountFraction: getDayCountFraction(optDetails.expiryDate, settlementDate, 'ACT/360'),
      dayCountConvention: 'ACT/360',
      notional,
      fixedCouponRate: optDetails.strikePrice,
      floatingFixingRate: optDetails.strikePrice,
      floatingSpreadBps: 0,
      floatingTotalRate: optDetails.strikePrice,
      couponRate: optDetails.strikePrice,
      fixingRate: optDetails.strikePrice,
      fixedRate: optDetails.strikePrice,
      floatingRate: optDetails.strikePrice,
      fixedCashflow: baseFlow,
      netCashflow: baseFlow,
      irDelta: Math.round(notional * 0.0001),
      discountFactor: 0.992,
      discountedCashflow: Math.round(baseFlow * 0.992),
      cumulativeCashflow: cumCashflow,
      type: 'SETTLEMENT',
      description: `FX Option Exercise Settlement (${optDetails.callCurrency} ${optDetails.callAmount.toLocaleString()} vs ${optDetails.putCurrency} ${optDetails.putAmount.toLocaleString()})`,
    });
  } else if (fwdDetails) {
    const isBuyBase = fwdDetails.direction === 'BUY_BASE';
    const baseFlow = isBuyBase ? fwdDetails.baseAmount : -fwdDetails.baseAmount;
    const counterFlow = isBuyBase ? -fwdDetails.counterAmount : fwdDetails.counterAmount;

    cumCashflow += baseFlow;
    const numDays = getNumberOfDays(trade.effectiveDate, settlementDate);

    periods.push({
      periodNumber: 1,
      startDate: trade.effectiveDate,
      endDate: settlementDate,
      paymentDate: settlementDate,
      fixingDate: trade.effectiveDate,
      resetStartDate: trade.effectiveDate,
      resetEndDate: settlementDate,
      payResetDate: settlementDate,
      numberOfDays: numDays,
      dayCountFraction: getDayCountFraction(trade.effectiveDate, settlementDate, 'ACT/360'),
      dayCountConvention: 'ACT/360',
      notional,
      fixedCouponRate: fwdDetails.forwardRate,
      floatingFixingRate: fwdDetails.spotRate,
      floatingSpreadBps: 0,
      floatingTotalRate: fwdDetails.spotRate,
      couponRate: fwdDetails.forwardRate,
      fixingRate: fwdDetails.spotRate,
      fixedRate: fwdDetails.forwardRate,
      fixedCashflow: baseFlow,
      floatingCashflow: counterFlow,
      netCashflow: Math.round(baseFlow),
      irDelta: Math.round(notional * 0.0001),
      discountFactor: 0.985,
      discountedCashflow: Math.round(baseFlow * 0.985),
      cumulativeCashflow: Math.round(baseFlow),
      type: 'EXCHANGE',
      description: `FX Forward Principal Exchange (${fwdDetails.direction}: ${fwdDetails.baseCurrency} ${fwdDetails.baseAmount.toLocaleString()} vs ${fwdDetails.counterCurrency} ${fwdDetails.counterAmount.toLocaleString()} @ ${fwdDetails.forwardRate})`,
    });
  }

  const totalNet = cumCashflow;

  return {
    tradeId: trade.tradeId,
    productType: trade.productType,
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: settlementDate,
    totalFixedCashflow: 0,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV: Math.round(totalNet * 0.98),
    totalIrDelta: Math.round(notional * 0.0001),
    periods,
  };
}

/**
 * Generates Cashflow Schedule for Interest Rate Range Accrual
 */
export function generateRangeAccrualCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const ra = trade.rangeAccrualDetails;
  const ccy = ra?.currency || trade.fixedLeg?.currency || 'USD';
  const notional = ra?.notional || trade.notionalUsd || 10000000;
  const couponRate = ra?.accrualCouponRate || 5.25;
  const lowerBarrier = ra?.lowerBarrierRate ?? 2.50;
  const upperBarrier = ra?.upperBarrierRate ?? 4.50;
  const convention = ra?.dayCount || '30/360';
  const freq = ra?.paymentFrequency || '3M';
  const isRecLeg1 = ra?.direction !== 'PAY';

  // Leg 2 Funding parameters
  const fundingLegType = ra?.fundingLegType || 'FLOATING';
  const fundingIndex = ra?.fundingIndex || 'SOFR';
  const fundingSpreadBps = ra?.fundingSpreadBps || 0;
  const fundingFixedRate = ra?.fundingFixedRate || 3.85;
  const fundingDayCount = ra?.fundingDayCount || 'ACT/360';

  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[freq] || 3;

  const periods: CashflowPeriod[] = [];
  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, 24);

  let periodNum = 1;
  let cumCashflow = 0;
  let totalFixedCashflow = 0;
  let totalFloatingCashflow = 0;
  let totalNet = 0;
  let totalPV = 0;
  let totalIrDelta = 0;
  const discountRate = (trade.parRate || 3.85) / 100;

  while (currStart < maturity && periodNum <= 120) {
    let currEnd = addMonths(currStart, stepMonths);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcfLeg1 = getDayCountFraction(currStart, currEnd, convention);
    const dcfLeg2 = getDayCountFraction(currStart, currEnd, fundingDayCount);

    // Simulate Leg 1 range accrual ratio (percentage of days where reference index stays in barrier range)
    const accrualRatioPercent = parseFloat((90 - (periodNum % 4) * 3.5).toFixed(2));
    const inRangeDays = Math.round(numDays * (accrualRatioPercent / 100));

    // Leg 1 Range Accrual Flow = Notional * Coupon * DCF * AccrualRatio
    const leg1Flow = notional * (couponRate / 100) * dcfLeg1 * (accrualRatioPercent / 100);
    const signedLeg1Flow = Math.round(isRecLeg1 ? leg1Flow : -leg1Flow);

    // Leg 2 Funding Flow (SOFR Floating or Fixed)
    const fundingFixingRate = 3.85; // Simulated SOFR rate
    const leg2RatePct = fundingLegType === 'FLOATING' ? (fundingFixingRate + fundingSpreadBps / 100) : fundingFixedRate;
    const leg2Flow = notional * (leg2RatePct / 100) * dcfLeg2;
    const signedLeg2Flow = Math.round(isRecLeg1 ? -leg2Flow : leg2Flow);

    const netCashflow = signedLeg1Flow + signedLeg2Flow;

    if (isRecLeg1) {
      totalFixedCashflow += signedLeg1Flow;
      totalFloatingCashflow += signedLeg2Flow;
    } else {
      totalFixedCashflow += signedLeg2Flow;
      totalFloatingCashflow += signedLeg1Flow;
    }

    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / (12 / stepMonths), periodNum)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcfLeg1 * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    const resetStartDate = currStart;
    const resetEndDate = currEnd;
    const payResetDate = addDays(currEnd, 2);
    const fixingDate = addDays(currStart, -2);

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate,
      resetStartDate,
      resetEndDate,
      payResetDate,
      numberOfDays: numDays,
      dayCountFraction: dcfLeg1,
      dayCountConvention: convention,
      notional,
      fixedCouponRate: couponRate,
      floatingFixingRate: fundingFixingRate,
      floatingSpreadBps: fundingSpreadBps,
      floatingTotalRate: leg2RatePct,
      couponRate,
      fixingRate: fundingFixingRate,
      fixedRate: couponRate,
      fixedCashflow: signedLeg1Flow,
      floatingCashflow: signedLeg2Flow,
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `Leg 1 Range Accrual (${inRangeDays}/${numDays} days in [${lowerBarrier.toFixed(2)}%-${upperBarrier.toFixed(2)}%] @ ${couponRate.toFixed(2)}%: $${signedLeg1Flow.toLocaleString()}) vs Leg 2 Funding (${fundingLegType === 'FLOATING' ? `${fundingIndex}+${fundingSpreadBps}bps` : 'Fixed'} @ ${leg2RatePct.toFixed(2)}%: $${signedLeg2Flow.toLocaleString()})`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: 'RANGE_ACCRUAL',
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: totalNet,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

export function generateSnowRangeCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.snowRangeDetails || {
    direction: 'RECEIVE',
    lowerBarrierRate: 2.00,
    upperBarrierRate: 4.75,
    baseCouponRate: 5.50,
    memoryMultiplier: 1.0,
    memoryEnabled: true,
    referenceIndex: 'SOFR',
    currency: 'USD',
    notional: trade.notionalUsd || 25000000,
    observationFrequency: 'DAILY_CALENDAR',
    paymentFrequency: '3M',
    dayCount: '30/360',
    fundingLegType: 'FLOATING',
    fundingIndex: 'SOFR',
    fundingSpreadBps: 0,
    fundingFixedRate: 3.85,
    fundingDayCount: 'ACT/360',
    fundingPaymentFrequency: '3M',
  };

  const ccy = details.currency || 'USD';
  const notional = details.notional || trade.notionalUsd || 25000000;
  const freq = details.paymentFrequency || '3M';
  const convention = details.dayCount || '30/360';
  const lowerBarrier = details.lowerBarrierRate ?? 2.00;
  const upperBarrier = details.upperBarrierRate ?? 4.75;
  const baseCouponRate = details.baseCouponRate ?? 5.50;
  const memoryMult = details.memoryEnabled ? (details.memoryMultiplier ?? 1.0) : 0;

  const fundingLegType = details.fundingLegType || 'FLOATING';
  const fundingSpreadBps = details.fundingSpreadBps || 0;
  const fundingFixedRate = details.fundingFixedRate || 3.85;

  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const periods: CashflowPeriod[] = [];
  let periodNum = 1;
  let cumCashflow = 0;
  let totalPV = 0;
  let totalIrDelta = 0;
  let totalNet = 0;

  const discountRate = 0.0385;
  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[freq] || 3;
  let previousCoupon = baseCouponRate;

  while (currStart < maturity && periodNum <= 120) {
    let currEnd = getNextPeriodEndDate(currStart, freq);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcfLeg1 = getDayCountFraction(currStart, currEnd, convention);
    const dcfLeg2 = getDayCountFraction(currStart, currEnd, details.fundingDayCount || 'ACT/360');

    const refIndexFixing = parseFloat((3.80 + (periodNum % 3) * 0.05).toFixed(4));
    const isInsideRange = refIndexFixing >= lowerBarrier && refIndexFixing <= upperBarrier;
    const inRangeDays = isInsideRange ? numDays : Math.round(numDays * 0.8);
    const rangeFraction = inRangeDays / numDays;

    let couponRate = 0;
    if (periodNum === 1) {
      couponRate = baseCouponRate * rangeFraction;
    } else {
      couponRate = baseCouponRate + memoryMult * previousCoupon * rangeFraction;
    }
    previousCoupon = couponRate;

    const leg1Raw = notional * (couponRate / 100) * dcfLeg1;
    const isLeg1Pay = details.direction === 'PAY';
    const signedLeg1Flow = Math.round(isLeg1Pay ? -leg1Raw : leg1Raw);

    let fundingFixingRate = 3.80;
    let leg2RatePct = fundingLegType === 'FIXED' ? fundingFixedRate : (fundingFixingRate + fundingSpreadBps / 100);
    const leg2Raw = (details.fundingNotional || notional) * (leg2RatePct / 100) * dcfLeg2;
    const isLeg2Pay = details.fundingDirection === 'PAY' || !isLeg1Pay;
    const signedLeg2Flow = Math.round(isLeg2Pay ? -leg2Raw : leg2Raw);

    const netCashflow = signedLeg1Flow + signedLeg2Flow;
    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / (12 / stepMonths), periodNum)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcfLeg1 * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate: addDays(currStart, -2),
      resetStartDate: currStart,
      resetEndDate: currEnd,
      payResetDate: addDays(currEnd, 2),
      numberOfDays: numDays,
      dayCountFraction: dcfLeg1,
      dayCountConvention: convention,
      notional,
      fixedCouponRate: couponRate,
      floatingFixingRate: refIndexFixing,
      floatingSpreadBps: 0,
      floatingTotalRate: couponRate,
      couponRate,
      fixingRate: refIndexFixing,
      fixedRate: couponRate,
      fixedCashflow: signedLeg1Flow,
      floatingCashflow: signedLeg2Flow,
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `Leg 1 SnowRange (${inRangeDays}/${numDays} days in [${lowerBarrier.toFixed(2)}%-${upperBarrier.toFixed(2)}%] Ratchet Coupon @ ${couponRate.toFixed(4)}%: $${signedLeg1Flow.toLocaleString()}) vs Leg 2 Funding ($${signedLeg2Flow.toLocaleString()})`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: 'SNOW_RANGE',
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: totalNet,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

export function generateTarnCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.tarnDetails || {
    direction: 'RECEIVE',
    targetCapPct: 10.00,
    couponFormulaType: 'INVERSE_FLOATER',
    strikeRate: 6.50,
    leverageFactor: 1.5,
    floorRate: 0.00,
    capRate: 10.00,
    referenceIndex: 'SOFR',
    currency: 'USD',
    notional: trade.notionalUsd || 25000000,
    paymentFrequency: '3M',
    dayCount: '30/360',
    fundingLegType: 'FLOATING',
    fundingIndex: 'SOFR',
    fundingSpreadBps: 0,
    fundingFixedRate: 3.85,
    fundingDayCount: 'ACT/360',
    fundingPaymentFrequency: '3M',
  };

  const ccy = details.currency || 'USD';
  const notional = details.notional || trade.notionalUsd || 25000000;
  const freq = details.paymentFrequency || '3M';
  const convention = details.dayCount || '30/360';
  const targetCapPct = details.targetCapPct ?? 10.00;
  const strikeRate = details.strikeRate ?? 6.50;
  const leverage = details.leverageFactor ?? 1.5;
  const floorRate = details.floorRate ?? 0.00;
  const capRate = details.capRate ?? 10.00;

  const fundingLegType = details.fundingLegType || 'FLOATING';
  const fundingSpreadBps = details.fundingSpreadBps || 0;
  const fundingFixedRate = details.fundingFixedRate || 3.85;

  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const periods: CashflowPeriod[] = [];
  let periodNum = 1;
  let cumCashflow = 0;
  let cumCouponPct = 0;
  let totalPV = 0;
  let totalIrDelta = 0;
  let totalNet = 0;
  let knockOutTriggered = false;

  const discountRate = 0.0385;
  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[freq] || 3;

  while (currStart < maturity && periodNum <= 120 && !knockOutTriggered) {
    let currEnd = getNextPeriodEndDate(currStart, freq);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcfLeg1 = getDayCountFraction(currStart, currEnd, convention);
    const dcfLeg2 = getDayCountFraction(currStart, currEnd, details.fundingDayCount || 'ACT/360');

    const refIndexFixing = parseFloat((3.75 + (periodNum % 4) * 0.10).toFixed(4));
    let rawCouponRate = strikeRate - leverage * refIndexFixing;
    if (rawCouponRate < floorRate) rawCouponRate = floorRate;
    if (rawCouponRate > capRate) rawCouponRate = capRate;

    let couponRate = rawCouponRate;
    if (cumCouponPct + rawCouponRate >= targetCapPct) {
      couponRate = Math.max(0, parseFloat((targetCapPct - cumCouponPct).toFixed(4)));
      knockOutTriggered = true;
    }
    cumCouponPct += couponRate;

    const leg1Raw = notional * (couponRate / 100) * dcfLeg1;
    const isLeg1Pay = details.direction === 'PAY';
    const signedLeg1Flow = Math.round(isLeg1Pay ? -leg1Raw : leg1Raw);

    let fundingFixingRate = 3.80;
    let leg2RatePct = fundingLegType === 'FIXED' ? fundingFixedRate : (fundingFixingRate + fundingSpreadBps / 100);
    const leg2Raw = (details.fundingNotional || notional) * (leg2RatePct / 100) * dcfLeg2;
    const isLeg2Pay = details.fundingDirection === 'PAY' || !isLeg1Pay;
    const signedLeg2Flow = Math.round(isLeg2Pay ? -leg2Raw : leg2Raw);

    const netCashflow = signedLeg1Flow + signedLeg2Flow;
    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / (12 / stepMonths), periodNum)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcfLeg1 * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    const statusDesc = knockOutTriggered
      ? `🚨 TARGET KNOCK-OUT REACHED (Cum ${cumCouponPct.toFixed(2)}% ≥ ${targetCapPct.toFixed(2)}% Cap)`
      : `Cum Coupon: ${cumCouponPct.toFixed(2)}% / ${targetCapPct.toFixed(2)}% Target`;

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate: addDays(currStart, -2),
      resetStartDate: currStart,
      resetEndDate: currEnd,
      payResetDate: addDays(currEnd, 2),
      numberOfDays: numDays,
      dayCountFraction: dcfLeg1,
      dayCountConvention: convention,
      notional,
      fixedCouponRate: couponRate,
      floatingFixingRate: refIndexFixing,
      floatingSpreadBps: 0,
      floatingTotalRate: couponRate,
      couponRate,
      fixingRate: refIndexFixing,
      fixedRate: couponRate,
      fixedCashflow: signedLeg1Flow,
      floatingCashflow: signedLeg2Flow,
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `Leg 1 TARN Coupon (${couponRate.toFixed(4)}%: $${signedLeg1Flow.toLocaleString()} | ${statusDesc}) vs Leg 2 Funding ($${signedLeg2Flow.toLocaleString()})`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: 'TARN',
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: totalNet,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

export function generateSnowballCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.snowballDetails || {
    direction: 'RECEIVE',
    initialCouponRate: 6.00,
    bonusStepRate: 1.50,
    leverageFactor: 1.0,
    floorRate: 0.00,
    capRate: 12.00,
    referenceIndex: 'SOFR',
    currency: 'USD',
    notional: trade.notionalUsd || 25000000,
    paymentFrequency: '3M',
    dayCount: '30/360',
    fundingLegType: 'FLOATING',
    fundingIndex: 'SOFR',
    fundingSpreadBps: 0,
    fundingFixedRate: 3.85,
    fundingDayCount: 'ACT/360',
    fundingPaymentFrequency: '3M',
  };

  const ccy = details.currency || 'USD';
  const notional = details.notional || trade.notionalUsd || 25000000;
  const freq = details.paymentFrequency || '3M';
  const convention = details.dayCount || '30/360';
  const initialCoupon = details.initialCouponRate ?? 6.00;
  const bonusStep = details.bonusStepRate ?? 1.50;
  const leverage = details.leverageFactor ?? 1.0;
  const floorRate = details.floorRate ?? 0.00;
  const capRate = details.capRate ?? 12.00;

  const fundingLegType = details.fundingLegType || 'FLOATING';
  const fundingSpreadBps = details.fundingSpreadBps || 0;
  const fundingFixedRate = details.fundingFixedRate || 3.85;

  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const periods: CashflowPeriod[] = [];
  let periodNum = 1;
  let cumCashflow = 0;
  let totalPV = 0;
  let totalIrDelta = 0;
  let totalNet = 0;

  const discountRate = 0.0385;
  const freqMonthsMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
  const stepMonths = freqMonthsMap[freq] || 3;
  let previousCoupon = initialCoupon;

  while (currStart < maturity && periodNum <= 120) {
    let currEnd = getNextPeriodEndDate(currStart, freq);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcfLeg1 = getDayCountFraction(currStart, currEnd, convention);
    const dcfLeg2 = getDayCountFraction(currStart, currEnd, details.fundingDayCount || 'ACT/360');

    const refIndexFixing = parseFloat((3.80 + (periodNum % 3) * 0.05).toFixed(4));
    let couponRate = initialCoupon;
    if (periodNum > 1) {
      const rawCoupon = previousCoupon + bonusStep - leverage * refIndexFixing;
      couponRate = Math.max(floorRate, Math.min(capRate, parseFloat(rawCoupon.toFixed(4))));
    }
    previousCoupon = couponRate;

    const leg1Raw = notional * (couponRate / 100) * dcfLeg1;
    const isLeg1Pay = details.direction === 'PAY';
    const signedLeg1Flow = Math.round(isLeg1Pay ? -leg1Raw : leg1Raw);

    let fundingFixingRate = 3.80;
    let leg2RatePct = fundingLegType === 'FIXED' ? fundingFixedRate : (fundingFixingRate + fundingSpreadBps / 100);
    const leg2Raw = (details.fundingNotional || notional) * (leg2RatePct / 100) * dcfLeg2;
    const isLeg2Pay = details.fundingDirection === 'PAY' || !isLeg1Pay;
    const signedLeg2Flow = Math.round(isLeg2Pay ? -leg2Raw : leg2Raw);

    const netCashflow = signedLeg1Flow + signedLeg2Flow;
    cumCashflow += netCashflow;
    totalNet += netCashflow;

    const discountFactor = parseFloat((1 / Math.pow(1 + discountRate / (12 / stepMonths), periodNum)).toFixed(5));
    const discountedCashflow = Math.round(netCashflow * discountFactor);
    totalPV += discountedCashflow;

    const irDelta = Math.round(notional * dcfLeg1 * 0.0001 * discountFactor);
    totalIrDelta += irDelta;

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate: currEnd,
      fixingDate: addDays(currStart, -2),
      resetStartDate: currStart,
      resetEndDate: currEnd,
      payResetDate: addDays(currEnd, 2),
      numberOfDays: numDays,
      dayCountFraction: dcfLeg1,
      dayCountConvention: convention,
      notional,
      fixedCouponRate: couponRate,
      floatingFixingRate: refIndexFixing,
      floatingSpreadBps: 0,
      floatingTotalRate: couponRate,
      couponRate,
      fixingRate: refIndexFixing,
      fixedRate: couponRate,
      fixedCashflow: signedLeg1Flow,
      floatingCashflow: signedLeg2Flow,
      netCashflow,
      irDelta,
      discountFactor,
      discountedCashflow,
      cumulativeCashflow: cumCashflow,
      type: 'INTEREST',
      description: `Leg 1 Snowball Ratchet Coupon #${periodNum} (${couponRate.toFixed(4)}%: $${signedLeg1Flow.toLocaleString()}) vs Leg 2 Funding ($${signedLeg2Flow.toLocaleString()})`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: 'SNOWBALL',
    currency: ccy,
    notional,
    effectiveDate: trade.effectiveDate,
    maturityDate: trade.maturityDate,
    totalFixedCashflow: totalNet,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalNet,
    totalPV,
    totalIrDelta,
    periods,
  };
}

export function generateIndependentLeg1Schedule(
  trade: IRSwapTrade,
  dateOverrides?: Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>
): IndependentLegSchedule {
  const overrides = dateOverrides || trade.scheduleDateOverrides || {};
  const ccy = trade.leg1?.currency || trade.fixedLeg?.currency || trade.rangeAccrualDetails?.currency || trade.snowRangeDetails?.currency || trade.tarnDetails?.currency || trade.snowballDetails?.currency || 'USD';
  const notional = trade.leg1?.notional || trade.fixedLeg?.notional || trade.rangeAccrualDetails?.notional || trade.snowRangeDetails?.notional || trade.tarnDetails?.notional || trade.snowballDetails?.notional || trade.notionalUsd || 25000000;
  const freq = trade.leg1?.frequency || trade.fixedLeg?.frequency || trade.rangeAccrualDetails?.paymentFrequency || trade.snowRangeDetails?.paymentFrequency || trade.tarnDetails?.paymentFrequency || trade.snowballDetails?.paymentFrequency || trade.leg2?.frequency || trade.floatingLeg?.frequency || '6M';
  const convention = trade.leg1?.dayCount || trade.fixedLeg?.dayCount || trade.rangeAccrualDetails?.dayCount || trade.snowRangeDetails?.dayCount || trade.tarnDetails?.dayCount || trade.snowballDetails?.dayCount || '30/360';
  const legType = trade.leg1?.legType || (trade.fixedLeg ? 'FIXED' : 'FLOATING');

  const ratePct = legType === 'FIXED' ? resolveFixedRate(trade.leg1 || trade.fixedLeg, trade) : (trade.rangeAccrualDetails?.accrualCouponRate ?? trade.snowRangeDetails?.baseCouponRate ?? trade.tarnDetails?.strikeRate ?? trade.snowballDetails?.initialCouponRate ?? resolveFixedRate(undefined, trade));

  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const periods: IndependentLegSchedule['periods'] = [];
  let periodNum = 1;
  let totalCashflow = 0;
  let previousCoupon = ratePct;
  let cumTarnCoupon = 0;
  let tarnKnockOut = false;

  while (currStart < maturity && periodNum <= 120 && !tarnKnockOut) {
    let defaultEnd = getNextPeriodEndDate(currStart, freq);
    if (defaultEnd > maturity) defaultEnd = maturity;

    const ov = overrides[`L1-${periodNum}`] || overrides[`P-${periodNum}`] || {};
    const effStart = ov.startDate || currStart;
    const effEnd = ov.endDate || defaultEnd;
    const accrualCal = trade.leg1?.accrualCalendar || trade.fixedLeg?.accrualCalendar || 'USNY';
    const paymentCal = trade.leg1?.paymentCalendar || trade.fixedLeg?.paymentCalendar || 'USNY';
    const accrualRoll = trade.leg1?.accrualRollConvention || trade.fixedLeg?.accrualRollConvention || 'MODFOLLOWING';
    const paymentRoll = trade.leg1?.paymentRollConvention || trade.fixedLeg?.paymentRollConvention || 'MODFOLLOWING';

    const resetStart = ov.resetStartDate || adjustBusinessDay(effStart, accrualCal, accrualRoll);
    const resetEnd = ov.resetEndDate || adjustBusinessDay(effEnd, accrualCal, accrualRoll);
    const payDate = ov.payResetDate || adjustBusinessDay(effEnd, paymentCal, paymentRoll);

    const numDays = getNumberOfDays(resetStart, resetEnd);
    const dcf = getDayCountFraction(resetStart, resetEnd, convention);

    let flowRate = ratePct;
    let periodFixing: number | undefined = undefined;
    let periodSpread: number | undefined = undefined;

    if (legType === 'FLOATING') {
      const idxSym1 = trade.leg1?.index || trade.leg1?.currency || ccy;
      const lag1 = getFixingLagDays(idxSym1);
      const resetType1: ResetType = trade.leg1?.resetType || (trade.fixedLeg as any)?.resetType || 'ADVANCE';
      const fixingObsDate1 = adjustBusinessDay(resetType1 === 'ARREARS' ? addDays(effEnd, -lag1) : addDays(effStart, -lag1), accrualCal, 'PRECEDING');
      const base1 = getBenchmarkFixingRate(idxSym1, trade.leg1?.indexTenor);
      periodFixing = getPeriodFixingRate(idxSym1, fixingObsDate1, periodNum, base1, trade.leg1?.indexTenor);
      periodSpread = trade.leg1?.spreadBps || 0;
      flowRate = parseFloat((periodFixing + periodSpread / 100).toFixed(4));
    } else if (trade.productType === 'RANGE_ACCRUAL' && trade.rangeAccrualDetails) {
      const lowerB = trade.rangeAccrualDetails.lowerBarrierRate || 3.0;
      const upperB = trade.rangeAccrualDetails.upperBarrierRate || 5.0;
      const baseIdx = getBenchmarkFixingRate(trade.rangeAccrualDetails.referenceIndex || ccy, trade.leg1?.indexTenor);
      periodFixing = getPeriodFixingRate(trade.rangeAccrualDetails.referenceIndex || ccy, effStart, periodNum, baseIdx, trade.leg1?.indexTenor);
      if (periodFixing < lowerB || periodFixing > upperB) flowRate = 0;
    } else if (trade.productType === 'SNOW_RANGE' && trade.snowRangeDetails) {
      const lowerB = trade.snowRangeDetails.lowerBarrierRate || 2.0;
      const upperB = trade.snowRangeDetails.upperBarrierRate || 4.75;
      const baseC = trade.snowRangeDetails.baseCouponRate || 5.50;
      const mult = trade.snowRangeDetails.memoryEnabled ? (trade.snowRangeDetails.memoryMultiplier || 1.0) : 0;
      const baseIdx = getBenchmarkFixingRate(trade.snowRangeDetails.referenceIndex || ccy, trade.leg1?.indexTenor);
      periodFixing = getPeriodFixingRate(trade.snowRangeDetails.referenceIndex || ccy, effStart, periodNum, baseIdx, trade.leg1?.indexTenor);
      const isInside = periodFixing >= lowerB && periodFixing <= upperB;
      const fraction = isInside ? 1.0 : 0.8;
      flowRate = periodNum === 1 ? baseC * fraction : baseC + mult * previousCoupon * fraction;
      previousCoupon = flowRate;
    } else if (trade.productType === 'TARN' && trade.tarnDetails) {
      const targetCap = trade.tarnDetails.targetCapPct || 10.0;
      const strike = trade.tarnDetails.strikeRate || 6.50;
      const leverage = trade.tarnDetails.leverageFactor || 1.5;
      const baseIdx = getBenchmarkFixingRate(trade.tarnDetails.referenceIndex || ccy, trade.leg1?.indexTenor);
      periodFixing = getPeriodFixingRate(trade.tarnDetails.referenceIndex || ccy, effStart, periodNum, baseIdx, trade.leg1?.indexTenor);
      let rawRate = strike - leverage * periodFixing;
      if (rawRate < (trade.tarnDetails.floorRate || 0)) rawRate = trade.tarnDetails.floorRate || 0;
      if (cumTarnCoupon + rawRate >= targetCap) {
        flowRate = Math.max(0, targetCap - cumTarnCoupon);
        tarnKnockOut = true;
      } else {
        flowRate = rawRate;
      }
      cumTarnCoupon += flowRate;
    } else if (trade.productType === 'SNOWBALL' && trade.snowballDetails) {
      const initC = trade.snowballDetails.initialCouponRate || 6.0;
      const bonus = trade.snowballDetails.bonusStepRate || 1.5;
      const leverage = trade.snowballDetails.leverageFactor || 1.0;
      const baseIdx = getBenchmarkFixingRate(trade.snowballDetails.referenceIndex || ccy, trade.leg1?.indexTenor);
      periodFixing = getPeriodFixingRate(trade.snowballDetails.referenceIndex || ccy, effStart, periodNum, baseIdx, trade.leg1?.indexTenor);
      if (periodNum === 1) {
        flowRate = initC;
      } else {
        flowRate = Math.max(trade.snowballDetails.floorRate || 0, Math.min(trade.snowballDetails.capRate || 12.0, previousCoupon + bonus - leverage * periodFixing));
      }
      previousCoupon = flowRate;
    }

    const rawFlow = Math.round(notional * (flowRate / 100) * dcf);
    const direction = trade.fixedLeg?.direction || trade.leg1?.direction || trade.rangeAccrualDetails?.direction || trade.snowRangeDetails?.direction || trade.tarnDetails?.direction || trade.snowballDetails?.direction || 'RECEIVE';
    const isPay = direction === 'PAY' || direction === 'PAY_FIXED';
    const signedFlow = isPay ? -rawFlow : rawFlow;

    totalCashflow += signedFlow;

    periods.push({
      periodNumber: periodNum,
      startDate: effStart,
      endDate: effEnd,
      payDate,
      resetStartDate: resetStart,
      resetEndDate: resetEnd,
      numberOfDays: numDays,
      dayCountFraction: dcf,
      ratePct: flowRate,
      fixingRate: periodFixing,
      spreadBps: periodSpread,
      cashflowAmount: signedFlow,
      description: `Leg 1 Period #${periodNum} (${freq}): ${effStart} → ${effEnd}`,
    });

    currStart = defaultEnd;
    periodNum++;
  }

  return {
    legName: 'Leg 1 (Structured / Coupon)',
    currency: ccy,
    notional,
    frequency: freq,
    dayCountConvention: convention,
    totalCashflow,
    periods,
  };
}

export function generateIndependentLeg2Schedule(
  trade: IRSwapTrade,
  dateOverrides?: Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>
): IndependentLegSchedule {
  const overrides = dateOverrides || trade.scheduleDateOverrides || {};
  const ccy = trade.leg2?.currency || trade.floatingLeg?.currency || trade.rangeAccrualDetails?.currency || trade.snowRangeDetails?.currency || trade.tarnDetails?.currency || trade.snowballDetails?.currency || 'USD';
  const notional = trade.leg2?.notional || trade.floatingLeg?.notional || trade.rangeAccrualDetails?.fundingNotional || trade.snowRangeDetails?.fundingNotional || trade.tarnDetails?.fundingNotional || trade.snowballDetails?.fundingNotional || trade.notionalUsd || 25000000;
  const freq = trade.leg2?.frequency || trade.floatingLeg?.frequency || trade.rangeAccrualDetails?.fundingPaymentFrequency || trade.snowRangeDetails?.fundingPaymentFrequency || trade.tarnDetails?.fundingPaymentFrequency || trade.snowballDetails?.fundingPaymentFrequency || trade.leg1?.frequency || trade.fixedLeg?.frequency || '6M';
  const convention = trade.leg2?.dayCount || trade.floatingLeg?.dayCount || trade.rangeAccrualDetails?.fundingDayCount || trade.snowRangeDetails?.fundingDayCount || trade.tarnDetails?.fundingDayCount || trade.snowballDetails?.fundingDayCount || 'ACT/360';

  const spreadBps = trade.floatingLeg?.spreadBps || trade.leg2?.spreadBps || trade.rangeAccrualDetails?.fundingSpreadBps || trade.snowRangeDetails?.fundingSpreadBps || trade.tarnDetails?.fundingSpreadBps || trade.snowballDetails?.fundingSpreadBps || 0;
  const legType = trade.leg2?.legType || trade.rangeAccrualDetails?.fundingLegType || trade.snowRangeDetails?.fundingLegType || trade.tarnDetails?.fundingLegType || trade.snowballDetails?.fundingLegType || 'FLOATING';

  let currStart = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || addMonths(currStart, Math.round((trade.tenorYears || 5) * 12));

  const periods: IndependentLegSchedule['periods'] = [];
  let periodNum = 1;
  let totalCashflow = 0;

  while (currStart < maturity && periodNum <= 120) {
    let defaultEnd = getNextPeriodEndDate(currStart, freq);
    if (defaultEnd > maturity) defaultEnd = maturity;

    const ov = overrides[`L2-${periodNum}`] || overrides[`P-${periodNum}`] || {};
    const effStart = ov.startDate || currStart;
    const effEnd = ov.endDate || defaultEnd;
    const accrualCal = trade.leg2?.accrualCalendar || trade.floatingLeg?.accrualCalendar || 'USNY';
    const paymentCal = trade.leg2?.paymentCalendar || trade.floatingLeg?.paymentCalendar || 'USNY';
    const accrualRoll = trade.leg2?.accrualRollConvention || trade.floatingLeg?.accrualRollConvention || 'MODFOLLOWING';
    const paymentRoll = trade.leg2?.paymentRollConvention || trade.floatingLeg?.paymentRollConvention || 'MODFOLLOWING';

    const resetStart = ov.resetStartDate || adjustBusinessDay(effStart, accrualCal, accrualRoll);
    const resetEnd = ov.resetEndDate || adjustBusinessDay(effEnd, accrualCal, accrualRoll);
    const payDate = ov.payResetDate || adjustBusinessDay(effEnd, paymentCal, paymentRoll);

    const numDays = getNumberOfDays(resetStart, resetEnd);
    const dcf = getDayCountFraction(resetStart, resetEnd, convention);

    const idxSym2 = trade.leg2?.index || trade.floatingLeg?.index || ccy;
    const lag2 = getFixingLagDays(idxSym2);
    const resetType2: ResetType = trade.leg2?.resetType || trade.floatingLeg?.resetType || 'ADVANCE';
    const fixingObsDate2 = adjustBusinessDay(resetType2 === 'ARREARS' ? addDays(effEnd, -lag2) : addDays(effStart, -lag2), accrualCal, 'PRECEDING');
    const base2 = getBenchmarkFixingRate(idxSym2, trade.leg2?.indexTenor || trade.floatingLeg?.indexTenor);
    const periodFixingRate = getPeriodFixingRate(idxSym2, fixingObsDate2, periodNum, base2, trade.leg2?.indexTenor || trade.floatingLeg?.indexTenor);
    const totalRatePct = legType === 'FIXED'
      ? resolveFixedRate(trade.leg2, trade)
      : parseFloat((periodFixingRate + spreadBps / 100).toFixed(4));

    const rawFlow = Math.round(notional * (totalRatePct / 100) * dcf);

    const direction = trade.floatingLeg?.direction || trade.leg2?.direction || trade.rangeAccrualDetails?.fundingDirection || trade.snowRangeDetails?.fundingDirection || trade.tarnDetails?.fundingDirection || trade.snowballDetails?.fundingDirection || 'PAY';
    const isPay = direction === 'PAY' || direction === 'PAY_FIXED';
    const signedFlow = isPay ? -rawFlow : rawFlow;

    totalCashflow += signedFlow;

    periods.push({
      periodNumber: periodNum,
      startDate: effStart,
      endDate: effEnd,
      payDate,
      resetStartDate: resetStart,
      resetEndDate: resetEnd,
      numberOfDays: numDays,
      dayCountFraction: dcf,
      ratePct: totalRatePct,
      fixingRate: legType === 'FLOATING' ? periodFixingRate : undefined,
      spreadBps,
      cashflowAmount: signedFlow,
      description: `Leg 2 Period #${periodNum} (${freq}): ${effStart} → ${effEnd}`,
    });

    currStart = defaultEnd;
    periodNum++;
  }

  return {
    legName: 'Leg 2 (Funding / Floating)',
    currency: ccy,
    notional,
    frequency: freq,
    dayCountConvention: convention,
    totalCashflow,
    periods,
  };
}

/**
 * Universal Cashflow Generator dispatcher
 */
export function generateCashflowSchedule(
  trade: IRSwapTrade,
  dateOverrides?: Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>
): CashflowScheduleSummary {
  const effectiveOverrides = dateOverrides || trade.scheduleDateOverrides;
  let summary: CashflowScheduleSummary;

  switch (trade.productType) {
    case 'IRS':
      summary = generateIRSwapCashflowSchedule(trade, effectiveOverrides);
      break;
    case 'CAP_FLOOR':
      summary = generateCapFloorCashflowSchedule(trade);
      break;
    case 'SWAPTION':
      summary = generateSwaptionCashflowSchedule(trade);
      break;
    case 'RANGE_ACCRUAL':
      summary = generateRangeAccrualCashflowSchedule(trade);
      break;
    case 'SNOW_RANGE':
      summary = generateSnowRangeCashflowSchedule(trade);
      break;
    case 'TARN':
      summary = generateTarnCashflowSchedule(trade);
      break;
    case 'SNOWBALL':
      summary = generateSnowballCashflowSchedule(trade);
      break;
    case 'FX_FORWARD':
    case 'FX_OPTION':
      summary = generateFxCashflowSchedule(trade);
      break;
    case 'BOND':
      summary = generateBondCashflowSchedule(trade);
      break;
    case 'FRA':
      summary = generateFraCashflowSchedule(trade);
      break;
    case 'DEPOSIT':
      summary = generateDepositCashflowSchedule(trade);
      break;
    case 'REPO':
      summary = generateRepoCashflowSchedule(trade);
      break;
    case 'DUAL_DIGITAL':
      summary = generateDualDigitalCashflowSchedule(trade);
      break;
    default:
      summary = generateIRSwapCashflowSchedule(trade);
      break;
  }

  // Calculate Cash on the Day (T+0 upfront settlement, premium, or fee cashflows on trade/effective date)
  const valDate = trade.tradeDate || new Date().toISOString().split('T')[0];
  let cashOnTheDay = 0;

  if (trade.productType === 'CAP_FLOOR' && trade.capFloorDetails) {
    const prem = trade.capFloorDetails.premiumAmount || 0;
    cashOnTheDay = trade.capFloorDetails.direction === 'BUY' ? -prem : prem;
  } else if (trade.productType === 'SWAPTION' && trade.swaptionDetails) {
    const prem = trade.swaptionDetails.premiumAmount || 0;
    cashOnTheDay = trade.swaptionDetails.direction === 'BUY' ? -prem : prem;
  } else if (trade.productType === 'FX_OPTION' && trade.fxOptionDetails) {
    const prem = trade.fxOptionDetails.premiumAmount || 0;
    cashOnTheDay = trade.fxOptionDetails.direction === 'BUY' ? -prem : prem;
  } else {
    // Sum any cashflow periods maturing/settling on tradeDate or effectiveDate (Period 0)
    (summary.periods || []).forEach((p) => {
      if (p.periodNumber === 0 || p.paymentDate === valDate || p.paymentDate === trade.effectiveDate) {
        cashOnTheDay += (p.netCashflow || p.discountedCashflow || 0);
      }
    });
  }

  // PV NoCash = Total PV excluding Cash on the Day
  const pvNoCash = Math.round(summary.totalPV - cashOnTheDay);

  return {
    ...summary,
    cashOnTheDay: Math.round(cashOnTheDay),
    pvNoCash,
  };
}

/**
 * Cashflow Schedule Generator for Fixed Income Bonds
 */
export function generateBondCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.bondDetails;
  const ccy = details?.currency || trade.fixedLeg?.currency || 'USD';
  const notional = details?.notional || trade.notionalUsd || 10000000;
  const couponRate = details?.couponRate || 4.25;
  const freq = details?.couponFrequency || '6M';
  const dayCount = details?.dayCount || '30/360';
  const effective = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || '2031-08-01';

  const periods: CashflowPeriod[] = [];
  let totalFixed = 0;
  let currStart = effective;
  let periodNum = 1;

  while (currStart < maturity && periodNum <= 100) {
    let currEnd = getNextPeriodEndDate(currStart, freq);
    if (currEnd > maturity) currEnd = maturity;

    const numDays = getNumberOfDays(currStart, currEnd);
    const dcf = getDayCountFraction(currStart, currEnd, dayCount);
    const couponFlow = Math.round(notional * (couponRate / 100) * dcf);
    const isMaturity = currEnd >= maturity;
    const netFlow = isMaturity ? couponFlow + notional : couponFlow;

    totalFixed += netFlow;

    const accrualCal = details?.accrualCalendar || 'USNY';
    const paymentCal = details?.paymentCalendar || 'USNY';
    const accrualRoll = details?.accrualRollConvention || 'MODFOLLOWING';
    const paymentRoll = details?.paymentRollConvention || 'MODFOLLOWING';

    const resetStartDate = adjustBusinessDay(currStart, accrualCal, accrualRoll);
    const resetEndDate = adjustBusinessDay(currEnd, accrualCal, accrualRoll);
    const paymentDate = adjustBusinessDay(currEnd, paymentCal, paymentRoll);

    periods.push({
      periodNumber: periodNum,
      startDate: currStart,
      endDate: currEnd,
      paymentDate,
      resetStartDate,
      resetEndDate,
      payResetDate: paymentDate,
      numberOfDays: numDays,
      dayCountFraction: dcf,
      dayCountConvention: dayCount,
      notional,
      fixedCouponRate: couponRate,
      fixedCashflow: netFlow,
      netCashflow: netFlow,
      irDelta: Math.round(notional * dcf * 0.0001),
      discountFactor: Math.exp(-0.035 * (periodNum * 0.5)),
      discountedCashflow: Math.round(netFlow * Math.exp(-0.035 * (periodNum * 0.5))),
      cumulativeCashflow: totalFixed,
      type: isMaturity ? 'EXCHANGE' : 'INTEREST',
      description: isMaturity ? `Bond Maturity Principal Redemption + Coupon #${periodNum}` : `Bond Coupon Period #${periodNum}`,
    });

    currStart = currEnd;
    periodNum++;
  }

  return {
    tradeId: trade.tradeId,
    productType: 'BOND',
    currency: ccy,
    notional,
    effectiveDate: effective,
    maturityDate: maturity,
    totalFixedCashflow: totalFixed,
    totalFloatingCashflow: 0,
    totalNetCashflow: totalFixed,
    totalPV: Math.round(totalFixed * 0.9),
    totalIrDelta: Math.round(notional * 0.0004),
    periods,
  };
}

/**
 * Cashflow Schedule Generator for FRA (Forward Rate Agreement)
 */
export function generateFraCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.fraDetails;
  const ccy = details?.currency || 'USD';
  const notional = details?.notional || trade.notionalUsd || 10000000;
  const fraRate = details?.fraRate || 3.95;
  const dayCount = details?.dayCount || 'ACT/360';
  const effective = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || '2026-11-01';

  const dcf = getDayCountFraction(effective, maturity, dayCount);
  const fixingRate = 3.90; // Current market fixing benchmark
  const settlementFlow = Math.round(notional * ((fixingRate - fraRate) / 100) * dcf);

  const periods: CashflowPeriod[] = [
    {
      periodNumber: 1,
      startDate: effective,
      endDate: maturity,
      paymentDate: effective, // FRA settles at start of period
      resetStartDate: effective,
      resetEndDate: maturity,
      payResetDate: effective,
      numberOfDays: getNumberOfDays(effective, maturity),
      dayCountFraction: dcf,
      dayCountConvention: dayCount,
      notional,
      fixedCouponRate: fraRate,
      floatingFixingRate: fixingRate,
      netCashflow: settlementFlow,
      irDelta: Math.round(notional * dcf * 0.0001),
      discountFactor: 0.995,
      discountedCashflow: Math.round(settlementFlow * 0.995),
      cumulativeCashflow: settlementFlow,
      type: 'SETTLEMENT',
      description: `FRA Net Discounted Cash Settlement on Fixing Date (${effective})`,
    },
  ];

  return {
    tradeId: trade.tradeId,
    productType: 'FRA',
    currency: ccy,
    notional,
    effectiveDate: effective,
    maturityDate: maturity,
    totalFixedCashflow: Math.round(notional * (fraRate / 100) * dcf),
    totalFloatingCashflow: Math.round(notional * (fixingRate / 100) * dcf),
    totalNetCashflow: settlementFlow,
    totalPV: Math.round(settlementFlow * 0.995),
    totalIrDelta: Math.round(notional * dcf * 0.0001),
    periods,
  };
}

/**
 * Cashflow Schedule Generator for Cash Term Deposit
 */
export function generateDepositCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.depositDetails;
  const ccy = details?.currency || 'USD';
  const notional = details?.notional || trade.notionalUsd || 10000000;
  const depositRate = details?.depositRate || 4.10;
  const dayCount = details?.dayCount || 'ACT/360';
  const effective = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || '2026-11-01';
  const direction = details?.direction || 'LEND';
  const sign = direction === 'LEND' ? 1 : -1;

  const dcf = getDayCountFraction(effective, maturity, dayCount);
  const interestFlow = Math.round(notional * (depositRate / 100) * dcf);
  const netMaturityFlow = (notional + interestFlow) * sign;

  const periods: CashflowPeriod[] = [
    {
      periodNumber: 1,
      startDate: effective,
      endDate: effective,
      paymentDate: effective,
      resetStartDate: effective,
      resetEndDate: effective,
      payResetDate: effective,
      numberOfDays: 0,
      dayCountFraction: 0,
      dayCountConvention: dayCount,
      notional,
      netCashflow: -notional * sign,
      irDelta: 0,
      discountFactor: 1.0,
      discountedCashflow: -notional * sign,
      cumulativeCashflow: -notional * sign,
      type: 'EXCHANGE',
      description: `Deposit Initial Outflow / Principal Funding (${effective})`,
    },
    {
      periodNumber: 2,
      startDate: effective,
      endDate: maturity,
      paymentDate: maturity,
      resetStartDate: effective,
      resetEndDate: maturity,
      payResetDate: maturity,
      numberOfDays: getNumberOfDays(effective, maturity),
      dayCountFraction: dcf,
      dayCountConvention: dayCount,
      notional,
      fixedCouponRate: depositRate,
      netCashflow: netMaturityFlow,
      irDelta: Math.round(notional * dcf * 0.0001),
      discountFactor: 0.99,
      discountedCashflow: Math.round(netMaturityFlow * 0.99),
      cumulativeCashflow: interestFlow * sign,
      type: 'EXCHANGE',
      description: `Deposit Maturity Principal Repayment + Accrued Interest (${maturity})`,
    },
  ];

  return {
    tradeId: trade.tradeId,
    productType: 'DEPOSIT',
    currency: ccy,
    notional,
    effectiveDate: effective,
    maturityDate: maturity,
    totalFixedCashflow: interestFlow,
    totalFloatingCashflow: 0,
    totalNetCashflow: interestFlow * sign,
    totalPV: Math.round(interestFlow * sign * 0.99),
    totalIrDelta: Math.round(notional * dcf * 0.0001),
    periods,
  };
}

/**
 * Cashflow Schedule Generator for Repo / Reverse Repo
 */
export function generateRepoCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.repoDetails;
  const ccy = details?.currency || 'USD';
  const purchasePrice = details?.purchasePrice || trade.notionalUsd || 10000000;
  const repoRate = details?.repoRate || 3.75;
  const dayCount = details?.dayCount || 'ACT/360';
  const effective = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || '2026-08-08';
  const repoType = details?.repoType || 'CLASSIC_REPO';
  const sign = repoType === 'CLASSIC_REPO' ? 1 : -1;

  const dcf = getDayCountFraction(effective, maturity, dayCount);
  const repoInterest = Math.round(purchasePrice * (repoRate / 100) * dcf);
  const repurchasePrice = purchasePrice + repoInterest;

  const periods: CashflowPeriod[] = [
    {
      periodNumber: 1,
      startDate: effective,
      endDate: effective,
      paymentDate: effective,
      resetStartDate: effective,
      resetEndDate: effective,
      payResetDate: effective,
      numberOfDays: 0,
      dayCountFraction: 0,
      dayCountConvention: dayCount,
      notional: purchasePrice,
      netCashflow: purchasePrice * sign,
      irDelta: 0,
      discountFactor: 1.0,
      discountedCashflow: purchasePrice * sign,
      cumulativeCashflow: purchasePrice * sign,
      type: 'EXCHANGE',
      description: `Repo Initial Cash Purchase Price Leg (${effective})`,
    },
    {
      periodNumber: 2,
      startDate: effective,
      endDate: maturity,
      paymentDate: maturity,
      resetStartDate: effective,
      resetEndDate: maturity,
      payResetDate: maturity,
      numberOfDays: getNumberOfDays(effective, maturity),
      dayCountFraction: dcf,
      dayCountConvention: dayCount,
      notional: purchasePrice,
      fixedCouponRate: repoRate,
      netCashflow: -repurchasePrice * sign,
      irDelta: Math.round(purchasePrice * dcf * 0.0001),
      discountFactor: 0.999,
      discountedCashflow: Math.round(-repurchasePrice * sign * 0.999),
      cumulativeCashflow: -repoInterest * sign,
      type: 'EXCHANGE',
      description: `Repo Term Repurchase Cash Settlement Leg (${maturity})`,
    },
  ];

  return {
    tradeId: trade.tradeId,
    productType: 'REPO',
    currency: ccy,
    notional: purchasePrice,
    effectiveDate: effective,
    maturityDate: maturity,
    totalFixedCashflow: repoInterest,
    totalFloatingCashflow: 0,
    totalNetCashflow: -repoInterest * sign,
    totalPV: Math.round(-repoInterest * sign * 0.999),
    totalIrDelta: Math.round(purchasePrice * dcf * 0.0001),
    periods,
  };
}

/**
 * Cashflow Schedule Generator for Dual Digital Interest Rate Swap / Option
 */
export function generateDualDigitalCashflowSchedule(trade: IRSwapTrade): CashflowScheduleSummary {
  const details = trade.dualDigitalDetails;
  const ccy = details?.currency || 'USD';
  const notional = details?.notional || trade.notionalUsd || 10000000;
  const payoutAmount = details?.digitalPayoutAmount || 500000;
  const payoutType = details?.payoutType || 'FIXED_AMOUNT';
  const direction = details?.direction || 'RECEIVE_DIGITAL';
  const sign = direction === 'RECEIVE_DIGITAL' ? 1 : -1;
  const dayCount = details?.dayCount || '30/360';
  const effective = trade.effectiveDate || '2026-08-01';
  const maturity = trade.maturityDate || '2031-08-01';

  const rawPayoutUsd = payoutType === 'FIXED_AMOUNT' ? payoutAmount : (payoutAmount / 100) * notional;
  const jointProbPct = 65.5; // Expected bivariate probability %
  const expectedPayoutUsd = Math.round(rawPayoutUsd * (jointProbPct / 100));

  const periods: CashflowPeriod[] = [
    {
      periodNumber: 1,
      startDate: effective,
      endDate: maturity,
      paymentDate: maturity,
      resetStartDate: effective,
      resetEndDate: maturity,
      payResetDate: maturity,
      numberOfDays: getNumberOfDays(effective, maturity),
      dayCountFraction: getDayCountFraction(effective, maturity, dayCount),
      dayCountConvention: dayCount,
      notional,
      fixedCouponRate: (rawPayoutUsd / notional) * 100,
      netCashflow: expectedPayoutUsd * sign,
      irDelta: Math.round(notional * 0.00015 * 0.655),
      discountFactor: 0.85,
      discountedCashflow: Math.round(expectedPayoutUsd * sign * 0.85),
      cumulativeCashflow: expectedPayoutUsd * sign,
      type: 'SETTLEMENT',
      description: `Dual Digital Binary Payout at Maturity (Condition 1: ${details?.index1 || 'SOFR'} ${details?.condition1Operator === 'GREATER_THAN' ? '≥' : '≤'} ${details?.trigger1Rate || 4.0}% AND Condition 2: ${details?.index2 || 'EURIBOR'} ${details?.condition2Operator === 'GREATER_THAN' ? '≥' : '≤'} ${details?.trigger2Rate || 3.5}%)`,
    },
  ];

  return {
    tradeId: trade.tradeId,
    productType: 'DUAL_DIGITAL',
    currency: ccy,
    notional,
    effectiveDate: effective,
    maturityDate: maturity,
    totalFixedCashflow: expectedPayoutUsd * sign,
    totalFloatingCashflow: 0,
    totalNetCashflow: expectedPayoutUsd * sign,
    totalPV: Math.round(expectedPayoutUsd * sign * 0.85),
    totalIrDelta: Math.round(notional * 0.00015 * 0.655),
    periods,
  };
}


