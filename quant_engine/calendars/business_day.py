from datetime import date, timedelta
from typing import Optional
from .holiday_calendar import HolidayCalendar
from quant_engine.daycount import parse_date, DateLike

def adjust_date(
    d: DateLike,
    roll_convention: str = "MODIFIED_FOLLOWING",
    calendar: Optional[HolidayCalendar] = None
) -> date:
    """
    Adjust date based on roll convention and holiday calendar.

    Supported Roll Conventions:
    - FOLLOWING
    - MODIFIED_FOLLOWING (MODFOLLOWING)
    - PRECEDING
    - MODIFIED_PRECEDING (MODPRECEDING)
    - UNADJUSTED (NONE)
    """
    dt = parse_date(d)
    if calendar is None:
        calendar = HolidayCalendar("USD")

    conv = roll_convention.upper().replace(" ", "").replace("_", "")

    if conv in ["UNADJUSTED", "NONE"]:
        return dt

    if calendar.is_business_day(dt):
        return dt

    if conv in ["FOLLOWING", "FOLLOW"]:
        cur = dt + timedelta(days=1)
        while not calendar.is_business_day(cur):
            cur += timedelta(days=1)
        return cur

    elif conv in ["MODIFIEDFOLLOWING", "MODFOLLOWING"]:
        cur = dt + timedelta(days=1)
        while not calendar.is_business_day(cur):
            cur += timedelta(days=1)
        # If adjusted date crosses into next month, roll backwards instead
        if cur.month != dt.month:
            cur = dt - timedelta(days=1)
            while not calendar.is_business_day(cur):
                cur -= timedelta(days=1)
        return cur

    elif conv in ["PRECEDING", "PRECEDE"]:
        cur = dt - timedelta(days=1)
        while not calendar.is_business_day(cur):
            cur -= timedelta(days=1)
        return cur

    elif conv in ["MODIFIEDPRECEDING", "MODPRECEDING"]:
        cur = dt - timedelta(days=1)
        while not calendar.is_business_day(cur):
            cur -= timedelta(days=1)
        # If adjusted date crosses into previous month, roll forwards instead
        if cur.month != dt.month:
            cur = dt + timedelta(days=1)
            while not calendar.is_business_day(cur):
                cur += timedelta(days=1)
        return cur

    return dt

def add_business_days(
    d: DateLike,
    n_days: int,
    calendar: Optional[HolidayCalendar] = None
) -> date:
    dt = parse_date(d)
    if calendar is None:
        calendar = HolidayCalendar("USD")

    step = 1 if n_days >= 0 else -1
    remaining = abs(n_days)
    cur = dt

    while remaining > 0:
        cur += timedelta(days=step)
        if calendar.is_business_day(cur):
            remaining -= 1

    return cur
