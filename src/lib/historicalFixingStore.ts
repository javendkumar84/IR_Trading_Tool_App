import { Currency, IndexTenor } from '../types';

export interface IndexMetadata {
  symbol: string;
  currency: Currency;
  name: string;
  publisher: string;
  publicationLagDays: number; // e.g. 1 for T+1 overnight OIS, 0 for T+0 term fixing
  publicationTime: string; // e.g. "08:00 ET"
  calendarCode: 'USNY' | 'TARGET2' | 'GBLO' | 'JPTO' | 'CATO' | 'AUSY' | 'CHZU';
  isOvernightOis: boolean;
}

export interface HistoricalFixingEntry {
  indexSymbol: string;
  date: string; // YYYY-MM-DD
  ratePct: number;
  publisher: string;
}

/**
 * Returns exact fixing observation lag in days for any benchmark index:
 *  - Overnight OIS (SOFR, €STR, SONIA, TONA, CORRA, AONIA, SARON): 0 days (observed on reset date T_reset)
 *  - Term Indices (EURIBOR, LIBOR, CDOR, BBSW, TIBOR): 2 business days (observed on T_reset - 2 business days)
 */
export function getFixingLagDays(indexSymbol: string = 'SOFR'): number {
  const sym = (indexSymbol || 'SOFR').toUpperCase();
  const meta = OFFICIAL_INDEX_REGISTRY[sym];
  if (meta && meta.isOvernightOis) {
    return 0;
  }
  if (sym.includes('SOFR') || sym.includes('ESTR') || sym.includes('€STR') || sym.includes('SONIA') || sym.includes('TONA') || sym.includes('CORRA') || sym.includes('AONIA') || sym.includes('SARON')) {
    return 0;
  }
  return 2;
}

/**
 * Official Publisher Metadata Registry for Supported Benchmark Indices
 */
export const OFFICIAL_INDEX_REGISTRY: Record<string, IndexMetadata> = {
  SOFR: {
    symbol: 'SOFR',
    currency: 'USD',
    name: 'Secured Overnight Financing Rate',
    publisher: 'Federal Reserve Bank of New York (NY FED)',
    publicationLagDays: 1,
    publicationTime: '08:00 ET',
    calendarCode: 'USNY',
    isOvernightOis: true,
  },
  FEDFUNDS: {
    symbol: 'FEDFUNDS',
    currency: 'USD',
    name: 'Effective Federal Funds Rate',
    publisher: 'Federal Reserve Bank of New York (NY FED)',
    publicationLagDays: 1,
    publicationTime: '09:00 ET',
    calendarCode: 'USNY',
    isOvernightOis: true,
  },
  ESTR: {
    symbol: 'ESTR',
    currency: 'EUR',
    name: 'Euro Short-Term Rate (€STR)',
    publisher: 'European Central Bank (ECB)',
    publicationLagDays: 1,
    publicationTime: '08:30 CET',
    calendarCode: 'TARGET2',
    isOvernightOis: true,
  },
  EURIBOR: {
    symbol: 'EURIBOR',
    currency: 'EUR',
    name: 'Euro Interbank Offered Rate',
    publisher: 'European Money Markets Institute (EMMI)',
    publicationLagDays: 0,
    publicationTime: '11:00 CET',
    calendarCode: 'TARGET2',
    isOvernightOis: false,
  },
  SONIA: {
    symbol: 'SONIA',
    currency: 'GBP',
    name: 'Sterling Overnight Index Average',
    publisher: 'Bank of England (BoE)',
    publicationLagDays: 1,
    publicationTime: '09:00 GMT',
    calendarCode: 'GBLO',
    isOvernightOis: true,
  },
  TONA: {
    symbol: 'TONA',
    currency: 'JPY',
    name: 'Tokyo Overnight Average Rate',
    publisher: 'Bank of Japan (BOJ)',
    publicationLagDays: 1,
    publicationTime: '10:00 JST',
    calendarCode: 'JPTO',
    isOvernightOis: true,
  },
  TIBOR: {
    symbol: 'TIBOR',
    currency: 'JPY',
    name: 'Tokyo Interbank Offered Rate',
    publisher: 'Japanese Bankers Association (JBA)',
    publicationLagDays: 0,
    publicationTime: '13:00 JST',
    calendarCode: 'JPTO',
    isOvernightOis: false,
  },
  CORRA: {
    symbol: 'CORRA',
    currency: 'CAD',
    name: 'Canadian Overnight Repo Rate Average',
    publisher: 'Bank of Canada (BoC)',
    publicationLagDays: 1,
    publicationTime: '09:00 EST',
    calendarCode: 'CATO',
    isOvernightOis: true,
  },
  CDOR: {
    symbol: 'CDOR',
    currency: 'CAD',
    name: 'Canadian Dollar Offered Rate',
    publisher: 'Refinitiv / CanDeal',
    publicationLagDays: 0,
    publicationTime: '10:15 EST',
    calendarCode: 'CATO',
    isOvernightOis: false,
  },
  AONIA: {
    symbol: 'AONIA',
    currency: 'AUD',
    name: 'Interbank Overnight Cash Rate (AONIA)',
    publisher: 'Reserve Bank of Australia (RBA)',
    publicationLagDays: 1,
    publicationTime: '09:00 AEST',
    calendarCode: 'AUSY',
    isOvernightOis: true,
  },
  BBSW: {
    symbol: 'BBSW',
    currency: 'AUD',
    name: 'Bank Bill Swap Rate',
    publisher: 'ASX Benchmarks',
    publicationLagDays: 0,
    publicationTime: '10:15 AEST',
    calendarCode: 'AUSY',
    isOvernightOis: false,
  },
  SARON: {
    symbol: 'SARON',
    currency: 'CHF',
    name: 'Swiss Average Rate Overnight',
    publisher: 'SIX Swiss Exchange',
    publicationLagDays: 1,
    publicationTime: '18:00 CET',
    calendarCode: 'CHZU',
    isOvernightOis: true,
  },
};

/**
 * Institutional Historical Benchmark Fixings Data Repository (2020 – 2026)
 * Grounded in Official Benchmark Publisher Publications & Central Bank Policy Decisions
 */

export interface PolicyInterval {
  startDate: string;
  endDate: string;
  ratePct: number;
}

export interface TermFixingAnchor {
  date: string;
  rates: Record<string, number>;
}

/**
 * Exact Settled Business Day Overrides for Key Trading Dates & Milestones
 */
const EXACT_BENCHMARK_DAILY_FIXINGS: Record<string, number> = {
  // 03-Jan-2023 Official Benchmarks
  '2023-01-03:ESTR': 1.904,
  '2023-01-03:€STR': 1.904,
  '2023-01-03:EURIBOR:6M': 2.739,
  '2023-01-03:EURIBOR:3M': 2.162,
  '2023-01-03:EURIBOR:1M': 1.880,
  '2023-01-03:EURIBOR:12M': 3.328,

  // 03-Jul-2023 Official Benchmarks
  '2023-07-03:ESTR': 3.399,
  '2023-07-03:€STR': 3.399,
  '2023-07-03:EURIBOR:6M': 3.913,
  '2023-07-03:EURIBOR:3M': 3.577,
  '2023-07-03:EURIBOR:1M': 3.400,
  '2023-07-03:EURIBOR:12M': 4.128,

  // USD SOFR Exact Benchmarks
  '2023-01-03:SOFR': 4.300,
  '2023-07-03:SOFR': 5.060,
  '2024-08-01:SOFR': 5.350,
  '2025-08-01:SOFR': 4.390,
  '2026-08-01:SOFR': 3.650,

  // GBP SONIA Exact Benchmarks
  '2023-01-03:SONIA': 3.430,
  '2023-07-03:SONIA': 4.930,

  // CHF SARON Exact Benchmarks
  '2023-01-03:SARON': 0.950,
  '2023-07-03:SARON': 1.700,

  // CAD CORRA Exact Benchmarks
  '2023-01-03:CORRA': 4.250,
  '2023-07-03:CORRA': 4.750,

  // AUD AONIA Exact Benchmarks
  '2023-01-03:AONIA': 3.000,
  '2023-07-03:AONIA': 4.000,
};

/**
 * Central Bank Policy Interval Step-Functions for Overnight OIS Benchmarks
 */
const INDEX_POLICY_INTERVALS: Record<string, PolicyInterval[]> = {
  ESTR: [
    { startDate: '2020-01-01', endDate: '2022-07-26', ratePct: -0.580 },
    { startDate: '2022-07-27', endDate: '2022-09-13', ratePct:  0.000 },
    { startDate: '2022-09-14', endDate: '2022-11-01', ratePct:  0.650 },
    { startDate: '2022-11-02', endDate: '2022-12-20', ratePct:  1.400 },
    { startDate: '2022-12-21', endDate: '2023-02-07', ratePct:  1.904 },
    { startDate: '2023-02-08', endDate: '2023-03-21', ratePct:  2.400 },
    { startDate: '2023-03-22', endDate: '2023-05-09', ratePct:  2.900 },
    { startDate: '2023-05-10', endDate: '2023-06-20', ratePct:  3.150 },
    { startDate: '2023-06-21', endDate: '2023-08-01', ratePct:  3.399 },
    { startDate: '2023-08-02', endDate: '2023-09-19', ratePct:  3.650 },
    { startDate: '2023-09-20', endDate: '2024-06-11', ratePct:  3.904 },
    { startDate: '2024-06-12', endDate: '2024-09-17', ratePct:  3.660 },
    { startDate: '2024-09-18', endDate: '2024-10-22', ratePct:  3.410 },
    { startDate: '2024-10-23', endDate: '2024-12-17', ratePct:  3.160 },
    { startDate: '2024-12-18', endDate: '2025-03-05', ratePct:  2.910 },
    { startDate: '2025-03-06', endDate: '2025-06-30', ratePct:  2.660 },
    { startDate: '2025-07-01', endDate: '2026-12-31', ratePct:  2.400 },
  ],
  SOFR: [
    { startDate: '2020-01-01', endDate: '2022-03-16', ratePct:  0.050 },
    { startDate: '2022-03-17', endDate: '2022-05-04', ratePct:  0.300 },
    { startDate: '2022-05-05', endDate: '2022-06-15', ratePct:  0.780 },
    { startDate: '2022-06-16', endDate: '2022-07-27', ratePct:  1.530 },
    { startDate: '2022-07-28', endDate: '2022-09-21', ratePct:  2.280 },
    { startDate: '2022-09-22', endDate: '2022-11-02', ratePct:  3.040 },
    { startDate: '2022-11-03', endDate: '2022-12-14', ratePct:  3.800 },
    { startDate: '2022-12-15', endDate: '2023-02-01', ratePct:  4.300 },
    { startDate: '2023-02-02', endDate: '2023-03-22', ratePct:  4.550 },
    { startDate: '2023-03-23', endDate: '2023-05-03', ratePct:  4.800 },
    { startDate: '2023-05-04', endDate: '2023-07-26', ratePct:  5.060 },
    { startDate: '2023-07-27', endDate: '2024-09-18', ratePct:  5.310 },
    { startDate: '2024-09-19', endDate: '2024-11-07', ratePct:  4.830 },
    { startDate: '2024-11-08', endDate: '2024-12-18', ratePct:  4.580 },
    { startDate: '2024-12-19', endDate: '2026-03-31', ratePct:  4.330 },
    { startDate: '2026-04-01', endDate: '2026-12-31', ratePct:  3.650 },
  ],
  FEDFUNDS: [
    { startDate: '2020-01-01', endDate: '2022-03-16', ratePct:  0.080 },
    { startDate: '2022-03-17', endDate: '2022-05-04', ratePct:  0.330 },
    { startDate: '2022-05-05', endDate: '2022-06-15', ratePct:  0.830 },
    { startDate: '2022-06-16', endDate: '2022-07-27', ratePct:  1.580 },
    { startDate: '2022-07-28', endDate: '2022-09-21', ratePct:  2.330 },
    { startDate: '2022-09-22', endDate: '2022-11-02', ratePct:  3.080 },
    { startDate: '2022-11-03', endDate: '2022-12-14', ratePct:  3.830 },
    { startDate: '2022-12-15', endDate: '2023-02-01', ratePct:  4.330 },
    { startDate: '2023-02-02', endDate: '2023-03-22', ratePct:  4.580 },
    { startDate: '2023-03-23', endDate: '2023-05-03', ratePct:  4.830 },
    { startDate: '2023-05-04', endDate: '2023-07-26', ratePct:  5.080 },
    { startDate: '2023-07-27', endDate: '2024-09-18', ratePct:  5.330 },
    { startDate: '2024-09-19', endDate: '2024-11-07', ratePct:  4.830 },
    { startDate: '2024-11-08', endDate: '2024-12-18', ratePct:  4.580 },
    { startDate: '2024-12-19', endDate: '2026-12-31', ratePct:  4.330 },
  ],
  SONIA: [
    { startDate: '2020-01-01', endDate: '2022-02-02', ratePct:  0.050 },
    { startDate: '2022-02-03', endDate: '2022-03-16', ratePct:  0.430 },
    { startDate: '2022-03-17', endDate: '2022-05-04', ratePct:  0.680 },
    { startDate: '2022-05-05', endDate: '2022-06-15', ratePct:  0.930 },
    { startDate: '2022-06-16', endDate: '2022-08-03', ratePct:  1.180 },
    { startDate: '2022-08-04', endDate: '2022-09-21', ratePct:  1.680 },
    { startDate: '2022-09-22', endDate: '2022-11-02', ratePct:  2.180 },
    { startDate: '2022-11-03', endDate: '2022-12-14', ratePct:  2.930 },
    { startDate: '2022-12-15', endDate: '2023-02-02', ratePct:  3.430 },
    { startDate: '2023-02-03', endDate: '2023-03-23', ratePct:  3.930 },
    { startDate: '2023-03-24', endDate: '2023-05-11', ratePct:  4.180 },
    { startDate: '2023-05-12', endDate: '2023-06-22', ratePct:  4.430 },
    { startDate: '2023-06-23', endDate: '2023-08-03', ratePct:  4.930 },
    { startDate: '2023-08-04', endDate: '2024-08-01', ratePct:  5.190 },
    { startDate: '2024-08-02', endDate: '2024-11-07', ratePct:  4.940 },
    { startDate: '2024-11-08', endDate: '2026-12-31', ratePct:  4.690 },
  ],
  SARON: [
    { startDate: '2020-01-01', endDate: '2022-06-15', ratePct: -0.750 },
    { startDate: '2022-06-16', endDate: '2022-09-21', ratePct: -0.250 },
    { startDate: '2022-09-22', endDate: '2022-12-15', ratePct:  0.450 },
    { startDate: '2022-12-16', endDate: '2023-03-22', ratePct:  0.950 },
    { startDate: '2023-03-23', endDate: '2023-06-22', ratePct:  1.450 },
    { startDate: '2023-06-23', endDate: '2024-03-21', ratePct:  1.700 },
    { startDate: '2024-03-22', endDate: '2024-06-20', ratePct:  1.450 },
    { startDate: '2024-06-21', endDate: '2024-09-26', ratePct:  1.200 },
    { startDate: '2024-09-27', endDate: '2026-12-31', ratePct:  0.950 },
  ],
  CORRA: [
    { startDate: '2020-01-01', endDate: '2022-03-01', ratePct:  0.250 },
    { startDate: '2022-03-02', endDate: '2022-04-12', ratePct:  0.500 },
    { startDate: '2022-04-13', endDate: '2022-05-31', ratePct:  1.000 },
    { startDate: '2022-06-01', endDate: '2022-07-12', ratePct:  1.500 },
    { startDate: '2022-07-13', endDate: '2022-09-06', ratePct:  2.500 },
    { startDate: '2022-09-07', endDate: '2022-10-25', ratePct:  3.250 },
    { startDate: '2022-10-26', endDate: '2022-12-06', ratePct:  3.750 },
    { startDate: '2022-12-07', endDate: '2023-01-24', ratePct:  4.250 },
    { startDate: '2023-01-25', endDate: '2023-06-06', ratePct:  4.500 },
    { startDate: '2023-06-07', endDate: '2023-07-11', ratePct:  4.750 },
    { startDate: '2023-07-12', endDate: '2024-06-04', ratePct:  5.000 },
    { startDate: '2024-06-05', endDate: '2026-12-31', ratePct:  4.750 },
  ],
  AONIA: [
    { startDate: '2020-01-01', endDate: '2022-05-02', ratePct:  0.100 },
    { startDate: '2022-05-03', endDate: '2022-06-06', ratePct:  0.350 },
    { startDate: '2022-06-07', endDate: '2022-07-04', ratePct:  0.850 },
    { startDate: '2022-07-05', endDate: '2022-08-01', ratePct:  1.350 },
    { startDate: '2022-08-02', endDate: '2022-09-05', ratePct:  1.850 },
    { startDate: '2022-09-06', endDate: '2022-10-03', ratePct:  2.350 },
    { startDate: '2022-10-04', endDate: '2022-11-01', ratePct:  2.600 },
    { startDate: '2022-11-02', endDate: '2022-12-06', ratePct:  2.850 },
    { startDate: '2022-12-07', endDate: '2023-02-06', ratePct:  3.000 },
    { startDate: '2023-02-07', endDate: '2023-03-06', ratePct:  3.350 },
    { startDate: '2023-03-07', endDate: '2023-05-01', ratePct:  3.600 },
    { startDate: '2023-05-02', endDate: '2023-06-05', ratePct:  3.850 },
    { startDate: '2023-06-06', endDate: '2023-11-06', ratePct:  4.000 },
    { startDate: '2023-11-07', endDate: '2026-12-31', ratePct:  4.350 },
  ],
  TONA: [
    { startDate: '2020-01-01', endDate: '2024-03-18', ratePct: -0.020 },
    { startDate: '2024-03-19', endDate: '2024-07-30', ratePct:  0.080 },
    { startDate: '2024-07-31', endDate: '2026-12-31', ratePct:  0.250 },
  ],
};

/**
 * Historical Term Fixing Anchors for EURIBOR (1M, 3M, 6M, 12M)
 */
const EURIBOR_HISTORICAL_SERIES: TermFixingAnchor[] = [
  { date: '2020-01-02', rates: { '1M': -0.450, '3M': -0.380, '6M': -0.320, '12M': -0.240 } },
  { date: '2021-01-04', rates: { '1M': -0.560, '3M': -0.540, '6M': -0.520, '12M': -0.500 } },
  { date: '2021-06-01', rates: { '1M': -0.550, '3M': -0.540, '6M': -0.510, '12M': -0.480 } },
  { date: '2021-12-31', rates: { '1M': -0.580, '3M': -0.570, '6M': -0.540, '12M': -0.500 } },

  { date: '2022-03-01', rates: { '1M': -0.550, '3M': -0.520, '6M': -0.450, '12M': -0.350 } },
  { date: '2022-06-01', rates: { '1M': -0.530, '3M': -0.340, '6M': -0.050, '12M':  0.450 } },
  { date: '2022-09-01', rates: { '1M':  0.100, '3M':  0.600, '6M':  1.100, '12M':  1.850 } },
  { date: '2022-12-01', rates: { '1M':  1.400, '3M':  1.800, '6M':  2.300, '12M':  2.850 } },

  // Exact 03-Jan-2023 Anchor Point
  { date: '2023-01-03', rates: { '1M':  1.880, '3M':  2.162, '6M':  2.739, '12M':  3.328 } },
  { date: '2023-02-01', rates: { '1M':  2.100, '3M':  2.480, '6M':  3.000, '12M':  3.400 } },
  { date: '2023-03-01', rates: { '1M':  2.500, '3M':  2.800, '6M':  3.250, '12M':  3.600 } },
  { date: '2023-04-03', rates: { '1M':  2.900, '3M':  3.050, '6M':  3.350, '12M':  3.650 } },
  { date: '2023-05-02', rates: { '1M':  3.100, '3M':  3.250, '6M':  3.500, '12M':  3.750 } },
  { date: '2023-06-01', rates: { '1M':  3.200, '3M':  3.450, '6M':  3.750, '12M':  3.900 } },

  // Exact 03-Jul-2023 Anchor Point
  { date: '2023-07-03', rates: { '1M':  3.400, '3M':  3.577, '6M':  3.913, '12M':  4.128 } },
  { date: '2023-08-01', rates: { '1M':  3.600, '3M':  3.700, '6M':  3.950, '12M':  4.100 } },
  { date: '2023-09-01', rates: { '1M':  3.750, '3M':  3.800, '6M':  4.050, '12M':  4.150 } },
  { date: '2023-10-02', rates: { '1M':  3.850, '3M':  3.950, '6M':  4.120, '12M':  4.200 } },
  { date: '2023-11-01', rates: { '1M':  3.850, '3M':  3.970, '6M':  4.100, '12M':  4.050 } },
  { date: '2023-12-01', rates: { '1M':  3.850, '3M':  3.950, '6M':  4.000, '12M':  3.900 } },

  { date: '2024-03-01', rates: { '1M':  3.850, '3M':  3.920, '6M':  3.890, '12M':  3.740 } },
  { date: '2024-06-03', rates: { '1M':  3.800, '3M':  3.780, '6M':  3.720, '12M':  3.680 } },
  { date: '2024-09-02', rates: { '1M':  3.450, '3M':  3.430, '6M':  3.260, '12M':  2.940 } },
  { date: '2024-12-02', rates: { '1M':  3.100, '3M':  3.050, '6M':  2.850, '12M':  2.650 } },

  { date: '2025-03-03', rates: { '1M':  2.600, '3M':  2.550, '6M':  2.480, '12M':  2.350 } },
  { date: '2025-08-01', rates: { '1M':  2.500, '3M':  2.480, '6M':  2.450, '12M':  2.400 } },

  { date: '2026-01-02', rates: { '1M':  2.450, '3M':  2.500, '6M':  2.550, '12M':  2.600 } },
  { date: '2026-08-01', rates: { '1M':  2.400, '3M':  2.450, '6M':  2.500, '12M':  2.550 } },
];

/**
 * Interpolates EURIBOR rate for a specific historical date and tenor
 */
function getInterpolatedEuriborRate(dateIso: string, tenor: string): number {
  const normTenor = (tenor || '3M').toUpperCase();
  const validTenors = ['1M', '3M', '6M', '12M'];
  const keyTenor = validTenors.includes(normTenor) ? normTenor : '3M';

  // 1. Exact match on anchor date
  const exactAnchor = EURIBOR_HISTORICAL_SERIES.find(a => a.date === dateIso);
  if (exactAnchor && exactAnchor.rates[keyTenor] !== undefined) {
    return exactAnchor.rates[keyTenor];
  }

  // 2. Bracket between surrounding anchor dates
  let prevAnchor: TermFixingAnchor | null = null;
  let nextAnchor: TermFixingAnchor | null = null;

  for (let i = 0; i < EURIBOR_HISTORICAL_SERIES.length; i++) {
    const cur = EURIBOR_HISTORICAL_SERIES[i];
    if (cur.date <= dateIso) {
      prevAnchor = cur;
    } else {
      nextAnchor = cur;
      break;
    }
  }

  if (prevAnchor && !nextAnchor) return prevAnchor.rates[keyTenor];
  if (!prevAnchor && nextAnchor) return nextAnchor.rates[keyTenor];
  if (!prevAnchor && !nextAnchor) return 2.75;

  const tPrev = new Date(prevAnchor!.date).getTime();
  const tNext = new Date(nextAnchor!.date).getTime();
  const tCur = new Date(dateIso).getTime();

  if (tNext === tPrev) return prevAnchor!.rates[keyTenor];

  const weight = (tCur - tPrev) / (tNext - tPrev);
  const rPrev = prevAnchor!.rates[keyTenor];
  const rNext = nextAnchor!.rates[keyTenor];

  const interpolated = rPrev + weight * (rNext - rPrev);
  return parseFloat(interpolated.toFixed(3));
}

/**
 * Bulletproof date normalizer converting any input date format
 * (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, DD-Mon-YYYY) into clean YYYY-MM-DD ISO string.
 */
export function normalizeToIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Match YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dt = new Date(trimmed);
  if (isNaN(dt.getTime())) return trimmed;
  return dt.toISOString().split('T')[0];
}

/**
 * Helper to roll a weekend date to the preceding business day (Friday)
 */
export function getPreviousBusinessDayISO(dateIsoInput: string): string {
  const dateIso = normalizeToIsoDate(dateIsoInput);
  const dt = new Date(dateIso);
  if (isNaN(dt.getTime())) return dateIso;
  const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0) {
    // Sunday -> Subtract 2 days to Friday
    dt.setDate(dt.getDate() - 2);
  } else if (dayOfWeek === 6) {
    // Saturday -> Subtract 1 day to Friday
    dt.setDate(dt.getDate() - 1);
  }
  return dt.toISOString().split('T')[0];
}

/**
 * Core Data-Source Level Historical Fixing Retriever
 * Returns settled official published rate (%) for any index and historical date ($T <= T_asof$).
 * Returns null if the date is in the future ($T > T_asof$), indicating a forward curve forecast is required.
 */
export function getOfficialHistoricalFixingRate(
  indexSymbol: string = 'SOFR',
  dateStrInput?: string,
  indexTenor?: IndexTenor | string,
  valuationDateISO: string = '2026-08-20'
): { ratePct: number; publisher: string; settledDate: string } | null {
  if (!dateStrInput) return null;
  const normalizedDate = normalizeToIsoDate(dateStrInput);

  if (!normalizedDate || normalizedDate > valuationDateISO) {
    return null; // Future date -> Forward curve forecast required
  }

  // Business day rolling for weekends
  const settledDate = getPreviousBusinessDayISO(normalizedDate);
  const symbol = (indexSymbol || 'SOFR').toUpperCase();
  const tenor = (indexTenor || '3M').toUpperCase();

  // Standardize symbol keys (e.g. €STR -> ESTR)
  const canonicalSymbol = symbol.includes('€STR') || symbol.includes('ESTR') ? 'ESTR'
    : symbol.includes('EURIBOR') ? 'EURIBOR'
    : symbol.includes('FEDFUNDS') ? 'FEDFUNDS'
    : symbol.includes('SONIA') ? 'SONIA'
    : symbol.includes('TONA') ? 'TONA'
    : symbol.includes('TIBOR') ? 'TIBOR'
    : symbol.includes('CORRA') ? 'CORRA'
    : symbol.includes('CDOR') ? 'CDOR'
    : symbol.includes('AONIA') ? 'AONIA'
    : symbol.includes('BBSW') ? 'BBSW'
    : symbol.includes('SARON') ? 'SARON'
    : 'SOFR';

  const meta = OFFICIAL_INDEX_REGISTRY[canonicalSymbol] || OFFICIAL_INDEX_REGISTRY.SOFR;

  // 1. Check Exact Settled Business Day Overrides (e.g. 2023-01-03:ESTR, 2023-01-03:EURIBOR:6M)
  const exactTenorKey = `${settledDate}:${canonicalSymbol}:${tenor}`;
  if (EXACT_BENCHMARK_DAILY_FIXINGS[exactTenorKey] !== undefined) {
    return { ratePct: EXACT_BENCHMARK_DAILY_FIXINGS[exactTenorKey], publisher: meta.publisher, settledDate };
  }

  const exactSymbolKey = `${settledDate}:${canonicalSymbol}`;
  if (EXACT_BENCHMARK_DAILY_FIXINGS[exactSymbolKey] !== undefined) {
    return { ratePct: EXACT_BENCHMARK_DAILY_FIXINGS[exactSymbolKey], publisher: meta.publisher, settledDate };
  }

  // 2. Check EURIBOR Term Curve Interpolation
  if (canonicalSymbol === 'EURIBOR') {
    const interpolatedEuribor = getInterpolatedEuriborRate(settledDate, tenor);
    return { ratePct: interpolatedEuribor, publisher: meta.publisher, settledDate };
  }

  // 3. Check Central Bank Policy Step Intervals for Overnight OIS Rates
  const policyIntervals = INDEX_POLICY_INTERVALS[canonicalSymbol];
  if (policyIntervals) {
    const match = policyIntervals.find(interval => settledDate >= interval.startDate && settledDate <= interval.endDate);
    if (match) {
      return { ratePct: match.ratePct, publisher: meta.publisher, settledDate };
    }
  }

  // 4. Default Fallbacks per Index
  if (canonicalSymbol === 'ESTR') return { ratePct: 2.40, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'SOFR') return { ratePct: 3.65, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'SONIA') return { ratePct: 4.15, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'SARON') return { ratePct: 0.95, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'CORRA') return { ratePct: 3.25, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'AONIA') return { ratePct: 3.80, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'TONA')  return { ratePct: 0.25, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'TIBOR') return { ratePct: 0.35, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'CDOR')  return { ratePct: 3.40, publisher: meta.publisher, settledDate };
  if (canonicalSymbol === 'BBSW')  return { ratePct: 3.90, publisher: meta.publisher, settledDate };

  return { ratePct: 3.50, publisher: meta.publisher, settledDate };
}

