from datetime import date, timedelta
from typing import List, Dict, Any
from ..daycount.daycount import year_fraction, parse_date, DateLike
from ..calendars.holiday_calendar import HolidayCalendar

def calculate_compounded_sofr_rate(
    start_date: DateLike,
    end_date: DateLike,
    daily_fixings: Dict[str, float],
    fallback_rate: float = 0.05,
    calendar: HolidayCalendar = None
) -> float:
    """
    Calculates exact daily compounded SOFR index rate over an accrual period:
    R = [ \prod_{i=1}^{N} (1 + SOFR_i * \frac{d_i}{360}) - 1 ] * \frac{360}{d}
    """
    dt_start = parse_date(start_date)
    dt_end = parse_date(end_date)
    if calendar is None:
        calendar = HolidayCalendar("USD")

    curr = dt_start
    compounded_factor = 1.0
    total_days = (dt_end - dt_start).days

    if total_days <= 0:
        return fallback_rate

    while curr < dt_end:
        next_day = curr + timedelta(days=1)
        # di is number of days this fixing applies (e.g. over weekend 3 days)
        d_i = 1
        while not calendar.is_business_day(next_day) and next_day < dt_end:
            d_i += 1
            next_day += timedelta(days=1)

        date_str = curr.strftime("%Y-%m-%d")
        daily_rate = daily_fixings.get(date_str, fallback_rate)
        
        compounded_factor *= (1.0 + daily_rate * (d_i / 360.0))
        curr = next_day

    compounded_rate = (compounded_factor - 1.0) * (360.0 / total_days)
    return float(compounded_rate)
