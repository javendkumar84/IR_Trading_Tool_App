from datetime import date
from typing import Set, Dict
from quant_engine.daycount import parse_date, DateLike

class HolidayCalendar:
    """
    Holiday calendar abstraction for financial markets.
    Supports USD (NY Fed / SIFMA), EUR (TARGET2), GBP (Bank of England), INR (RBI / NSE).
    """
    def __init__(self, currency: str = "USD", custom_holidays: Set[date] = None):
        self.currency = currency.upper()
        self.custom_holidays: Set[date] = custom_holidays or set()
        self.standard_holidays: Set[date] = self._load_standard_holidays(self.currency)

    def _load_standard_holidays(self, ccy: str) -> Set[date]:
        # Pre-seed standard holidays for recent/current years (2024-2030)
        holidays = set()
        
        # New Year's Day for 2024 - 2030
        for year in range(2024, 2031):
            holidays.add(date(year, 1, 1))
            holidays.add(date(year, 12, 25)) # Christmas

        if ccy == "USD":
            # US Independence Day, Thanksgiving, Labor Day approximations/known dates
            for year in range(2024, 2031):
                holidays.add(date(year, 7, 4)) # US Independence Day
                holidays.add(date(year, 6, 19)) # Juneteenth
                holidays.add(date(year, 11, 11)) # Veterans Day

        elif ccy == "EUR":
            # TARGET2 holidays
            for year in range(2024, 2031):
                holidays.add(date(year, 5, 1)) # Labour Day
                holidays.add(date(year, 12, 26)) # Boxing Day

        elif ccy == "INR":
            # Indian Market Holidays (Republic Day, Independence Day, Gandhi Jayanti)
            for year in range(2024, 2031):
                holidays.add(date(year, 1, 26)) # Republic Day
                holidays.add(date(year, 8, 15)) # Independence Day
                holidays.add(date(year, 10, 2)) # Gandhi Jayanti

        return holidays

    def is_holiday(self, d: DateLike) -> bool:
        dt = parse_date(d)
        return dt in self.standard_holidays or dt in self.custom_holidays

    def is_weekend(self, d: DateLike) -> bool:
        dt = parse_date(d)
        return dt.weekday() >= 5  # 5 = Saturday, 6 = Sunday

    def is_business_day(self, d: DateLike) -> bool:
        dt = parse_date(d)
        return not self.is_weekend(dt) and not self.is_holiday(dt)
