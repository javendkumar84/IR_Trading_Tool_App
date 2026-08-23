from datetime import date
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from dateutil.relativedelta import relativedelta
from quant_engine.daycount import year_fraction, parse_date, DateLike
from quant_engine.calendars import HolidayCalendar, adjust_date

@dataclass
class CashflowPeriod:
    period_index: int
    period_start: str
    period_end: str
    adjusted_start: str
    adjusted_end: str
    payment_date: str
    fixing_date: str
    notional: float
    rate: float
    accrual_factor: float
    cashflow: float
    discount_factor: Optional[float] = None
    pv: Optional[float] = None

def get_months_for_frequency(freq: str) -> int:
    f = freq.upper()
    if f in ["1M", "MONTHLY"]:
        return 1
    elif f in ["3M", "QUARTERLY"]:
        return 3
    elif f in ["6M", "SEMI-ANNUAL", "SEMIANNUAL"]:
        return 6
    elif f in ["1Y", "12M", "ANNUAL"]:
        return 12
    return 6 # Default Semi-Annual

def generate_schedule(
    start_date: DateLike,
    end_date: DateLike,
    frequency: str = "6M",
    roll_convention: str = "MODIFIED_FOLLOWING",
    day_count: str = "30/360",
    notional: float = 1_000_000.0,
    rate: float = 0.05,
    currency: str = "USD",
    calendar: Optional[HolidayCalendar] = None,
    stub_convention: str = "SHORT_FRONT"
) -> List[CashflowPeriod]:
    """
    Generic cashflow schedule generator supporting fixed and floating rate legs.
    """
    dt_start = parse_date(start_date)
    dt_end = parse_date(end_date)
    if calendar is None:
        calendar = HolidayCalendar(currency)

    months = get_months_for_frequency(frequency)

    # Build unadjusted date schedule backwards or forwards
    unadjusted_dates = []
    curr = dt_start
    while curr < dt_end:
        unadjusted_dates.append(curr)
        curr = curr + relativedelta(months=months)

    if unadjusted_dates[-1] != dt_end:
        unadjusted_dates.append(dt_end)

    schedule: List[CashflowPeriod] = []

    for i in range(len(unadjusted_dates) - 1):
        p_start = unadjusted_dates[i]
        p_end = unadjusted_dates[i + 1]

        adj_start = adjust_date(p_start, roll_convention, calendar)
        adj_end = adjust_date(p_end, roll_convention, calendar)
        pay_date = adj_end  # Standard payment lag = 0
        fix_date = adjust_date(p_start, "PRECEDING", calendar)  # Standard fixing T-2 or T-0

        yf = year_fraction(adj_start, adj_end, day_count)
        cf = notional * rate * yf

        period = CashflowPeriod(
            period_index=i + 1,
            period_start=p_start.strftime("%Y-%m-%d"),
            period_end=p_end.strftime("%Y-%m-%d"),
            adjusted_start=adj_start.strftime("%Y-%m-%d"),
            adjusted_end=adj_end.strftime("%Y-%m-%d"),
            payment_date=pay_date.strftime("%Y-%m-%d"),
            fixing_date=fix_date.strftime("%Y-%m-%d"),
            notional=notional,
            rate=rate,
            accrual_factor=round(yf, 8),
            cashflow=round(cf, 4)
        )
        schedule.append(period)

    return schedule
