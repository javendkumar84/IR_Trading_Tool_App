from datetime import date, datetime
from typing import Union
import calendar

DateLike = Union[date, datetime, str]

def parse_date(d: DateLike) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d[:10], "%Y-%m-%d").date()
    raise ValueError(f"Cannot parse date: {d}")

def is_leap_year(year: int) -> bool:
    return calendar.isleap(year)

def year_fraction(start_date: DateLike, end_date: DateLike, convention: str = "ACT/360") -> float:
    """
    Calculate the year fraction between start_date and end_date using specified convention.

    Conventions supported:
    - ACT/360
    - ACT/365
    - ACT/365F
    - 30/360, 30/360_BOND
    - 30E/360, 30/360_ISMA
    """
    d1 = parse_date(start_date)
    d2 = parse_date(end_date)

    if d1 == d2:
        return 0.0

    conv = convention.upper().replace(" ", "").replace("-", "").replace("/", "")

    if conv in ["ACT360", "ACTUAL360"]:
        days = (d2 - d1).days
        return days / 360.0

    elif conv in ["ACT365", "ACT365F", "ACTUAL365", "ACTUAL365FIXED"]:
        days = (d2 - d1).days
        return days / 365.0

    elif conv in ["ACTACT", "ACTUALACTUAL", "ACTACTISDA"]:
        # ISDA actual/actual algorithm
        y1, y2 = d1.year, d2.year
        if y1 == y2:
            days_in_year = 366.0 if is_leap_year(y1) else 365.0
            return (d2 - d1).days / days_in_year
        else:
            first_year_days = (date(y1 + 1, 1, 1) - d1).days
            first_year_total = 366.0 if is_leap_year(y1) else 365.0
            yf1 = first_year_days / first_year_total

            last_year_days = (d2 - date(y2, 1, 1)).days
            last_year_total = 366.0 if is_leap_year(y2) else 365.0
            yf2 = last_year_days / last_year_total

            middle_years = float(y2 - y1 - 1)
            return yf1 + middle_years + yf2

    elif conv in ["30360", "30360BOND", "THIRTY360", "30/360"]:
        # 30/360 US / Bond Basis
        day1, month1, year1 = d1.day, d1.month, d1.year
        day2, month2, year2 = d2.day, d2.month, d2.year

        if day1 == 31:
            day1 = 30
        if day2 == 31 and day1 >= 30:
            day2 = 30

        return ((year2 - year1) * 360 + (month2 - month1) * 30 + (day2 - day1)) / 360.0

    elif conv in ["30E360", "30360ISMA", "30E/360", "EUROPEAN30360"]:
        # 30E/360 Eurobond basis
        day1, month1, year1 = d1.day, d1.month, d1.year
        day2, month2, year2 = d2.day, d2.month, d2.year

        if day1 == 31:
            day1 = 30
        if day2 == 31:
            day2 = 30

        return ((year2 - year1) * 360 + (month2 - month1) * 30 + (day2 - day1)) / 360.0

    else:
        # Default fallback to ACT/360
        days = (d2 - d1).days
        return days / 360.0
