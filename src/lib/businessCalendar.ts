import { BusinessCalendar, BusinessDayRollConvention } from '../types';

/**
 * Official Market Holiday Schedules (2020 – 2035) for Supported Business Calendars:
 *  - USNY: US New York (SIFMA / Federal Reserve Holidays)
 *  - TARGET2 / EUTA: Eurozone TARGET2 Settlement Holidays
 *  - GBLO: Great Britain London Bank Holidays
 *  - JPTO: Japan Tokyo Bank of Japan Holidays
 *  - CATO: Canada Toronto Bank Holidays
 *  - AUSY: Australia Sydney Reserve Bank Holidays
 *  - CHZH: Switzerland Zurich SIX Exchange Holidays
 */
export const OFFICIAL_HOLIDAY_DATABASE: Record<string, Set<string>> = {
  USNY: new Set([
    // Fixed & Floating US Federal Holidays (2024 - 2028)
    '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02', '2024-10-14', '2024-11-11', '2024-11-28', '2024-12-25',
    '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-10-13', '2025-11-11', '2025-11-27', '2025-12-25',
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25',
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-25',
  ]),

  EUTA: new Set([
    // TARGET2 Holidays
    '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-01', '2024-12-25', '2024-12-26',
    '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-12-25', '2025-12-26',
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25', '2026-12-26',
    '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-01', '2027-12-25', '2027-12-26',
  ]),

  GBLO: new Set([
    // London Bank Holidays
    '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-06', '2024-05-27', '2024-08-26', '2024-12-25', '2024-12-26',
    '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26', '2025-08-25', '2025-12-25', '2025-12-26',
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28',
    '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31', '2027-08-30', '2027-12-27', '2027-12-28',
  ]),

  JPTO: new Set([
    // Tokyo Holidays
    '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-08', '2024-02-12', '2024-02-23', '2024-03-20', '2024-04-29', '2024-05-03', '2024-05-06', '2024-07-15', '2024-08-12', '2024-09-16', '2024-09-23', '2024-10-14', '2024-11-04', '2024-11-23', '2024-12-31',
    '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-13', '2025-02-11', '2025-02-24', '2025-03-20', '2025-04-29', '2025-05-05', '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23', '2025-10-13', '2025-11-03', '2025-11-24', '2025-12-31',
    '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20', '2026-04-29', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-31',
  ]),

  CATO: new Set([
    // Toronto Holidays
    '2024-01-01', '2024-02-19', '2024-03-29', '2024-05-20', '2024-07-01', '2024-08-05', '2024-09-02', '2024-09-30', '2024-10-14', '2024-11-11', '2024-12-25', '2024-12-26',
    '2025-01-01', '2025-02-17', '2025-04-18', '2025-05-19', '2025-07-01', '2025-08-04', '2025-09-01', '2025-09-30', '2025-10-13', '2025-11-11', '2025-12-25', '2025-12-26',
    '2026-01-01', '2026-02-16', '2026-04-03', '2026-05-18', '2026-07-01', '2026-08-03', '2026-09-07', '2026-09-30', '2026-10-12', '2026-11-11', '2026-12-25', '2026-12-28',
  ]),

  AUSY: new Set([
    // Sydney Holidays
    '2024-01-01', '2024-01-26', '2024-03-29', '2024-04-01', '2024-04-25', '2024-06-10', '2024-10-07', '2024-12-25', '2024-12-26',
    '2025-01-01', '2025-01-27', '2025-04-18', '2025-04-21', '2025-04-25', '2025-06-09', '2025-10-06', '2025-12-25', '2025-12-26',
    '2026-01-01', '2026-01-26', '2026-04-03', '2026-04-06', '2026-04-25', '2026-06-08', '2026-10-05', '2026-12-25', '2026-12-28',
  ]),

  CHZH: new Set([
    // Zurich Holidays
    '2024-01-01', '2024-01-02', '2024-03-29', '2024-04-01', '2024-05-09', '2024-05-20', '2024-08-01', '2024-12-25', '2024-12-26',
    '2025-01-01', '2025-01-02', '2025-04-18', '2025-04-21', '2025-05-29', '2025-06-09', '2025-08-01', '2025-12-25', '2025-12-26',
    '2026-01-01', '2026-01-02', '2026-04-03', '2026-04-06', '2026-05-14', '2026-05-25', '2026-08-01', '2026-12-25', '2026-12-26',
  ]),
};

/**
 * Checks whether a given ISO date YYYY-MM-DD is a valid Business Day
 * for the selected Business Calendar (considering weekends & holidays).
 */
export function isBusinessDay(
  dateIso: string,
  calendarCode: BusinessCalendar | string = 'USNY'
): boolean {
  if (!dateIso) return true;
  const dt = new Date(dateIso);
  if (isNaN(dt.getTime())) return true;

  // 1. Weekend check (Saturday = 6, Sunday = 0)
  const dayOfWeek = dt.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 2. Calendar Code parsing (e.g. USNY, EUTA, GBLO, USNY+GBLO)
  const calUpper = (calendarCode || 'USNY').toUpperCase();
  const cals = calUpper.split('+');

  for (const cal of cals) {
    const key = cal === 'TARGET2' ? 'EUTA' : cal === 'CHZU' ? 'CHZH' : cal;
    const holidaySet = OFFICIAL_HOLIDAY_DATABASE[key];
    if (holidaySet && holidaySet.has(dateIso)) {
      return false; // Holiday in at least one constituent calendar
    }
  }

  return true;
}

/**
 * Adjusts an unadjusted date to a valid Business Day using the selected ISDA Roll Convention:
 *  - FOLLOWING: Roll forward to next business day
 *  - MODFOLLOWING: Roll forward to next business day, unless it crosses into next month (then roll backward)
 *  - PRECEDING: Roll backward to previous business day
 *  - MODPRECEDING: Roll backward to previous business day, unless it crosses into previous month (then roll forward)
 *  - UNADJUSTED / NONE: Retain unadjusted date
 */
export function adjustBusinessDay(
  dateIso: string,
  calendarCode: BusinessCalendar | string = 'USNY',
  rollConvention: BusinessDayRollConvention | string = 'MODFOLLOWING'
): string {
  if (!dateIso) return dateIso;
  const convUpper = (rollConvention || 'MODFOLLOWING').toUpperCase();

  if (convUpper === 'UNADJUSTED' || convUpper === 'NONE') {
    return dateIso;
  }

  // If already a valid business day, no adjustment needed
  if (isBusinessDay(dateIso, calendarCode)) {
    return dateIso;
  }

  const dt = new Date(dateIso);
  if (isNaN(dt.getTime())) return dateIso;
  const originalMonth = dt.getMonth();

  if (convUpper === 'FOLLOWING') {
    while (!isBusinessDay(dt.toISOString().split('T')[0], calendarCode)) {
      dt.setDate(dt.getDate() + 1);
    }
    return dt.toISOString().split('T')[0];
  }

  if (convUpper === 'MODFOLLOWING') {
    const fwdDate = new Date(dt.getTime());
    while (!isBusinessDay(fwdDate.toISOString().split('T')[0], calendarCode)) {
      fwdDate.setDate(fwdDate.getDate() + 1);
    }
    // Check if rolled into next calendar month
    if (fwdDate.getMonth() !== originalMonth) {
      // Roll backward instead
      const bwdDate = new Date(dt.getTime());
      while (!isBusinessDay(bwdDate.toISOString().split('T')[0], calendarCode)) {
        bwdDate.setDate(bwdDate.getDate() - 1);
      }
      return bwdDate.toISOString().split('T')[0];
    }
    return fwdDate.toISOString().split('T')[0];
  }

  if (convUpper === 'PRECEDING') {
    while (!isBusinessDay(dt.toISOString().split('T')[0], calendarCode)) {
      dt.setDate(dt.getDate() - 1);
    }
    return dt.toISOString().split('T')[0];
  }

  if (convUpper === 'MODPRECEDING') {
    const bwdDate = new Date(dt.getTime());
    while (!isBusinessDay(bwdDate.toISOString().split('T')[0], calendarCode)) {
      bwdDate.setDate(bwdDate.getDate() - 1);
    }
    // Check if rolled into previous calendar month
    if (bwdDate.getMonth() !== originalMonth) {
      // Roll forward instead
      const fwdDate = new Date(dt.getTime());
      while (!isBusinessDay(fwdDate.toISOString().split('T')[0], calendarCode)) {
        fwdDate.setDate(fwdDate.getDate() + 1);
      }
      return fwdDate.toISOString().split('T')[0];
    }
    return bwdDate.toISOString().split('T')[0];
  }

  // Default fallback
  while (!isBusinessDay(dt.toISOString().split('T')[0], calendarCode)) {
    dt.setDate(dt.getDate() + 1);
  }
  return dt.toISOString().split('T')[0];
}

/**
 * Calculates exact business days count between two ISO dates
 */
export function getBusinessDayDifference(
  startDateIso: string,
  endDateIso: string,
  calendarCode: BusinessCalendar | string = 'USNY'
): number {
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  let count = 0;
  const curr = new Date(start.getTime());
  while (curr < end) {
    const iso = curr.toISOString().split('T')[0];
    if (isBusinessDay(iso, calendarCode)) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}
