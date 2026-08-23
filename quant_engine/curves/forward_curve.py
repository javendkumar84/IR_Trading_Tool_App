from datetime import date
from typing import Union
from .discount_curve import DiscountCurve
from quant_engine.daycount import year_fraction, parse_date, DateLike

class ForwardCurve:
    """
    Forward Curve object for projecting forward benchmark rates (e.g. SOFR 1D / 3M).
    F(t1, t2) = (DF(t1) / DF(t2) - 1) / year_fraction(t1, t2)
    """
    def __init__(self, discount_curve: DiscountCurve):
        self.discount_curve = discount_curve
        self.valuation_date = discount_curve.valuation_date

    def get_forward_rate(
        self,
        start_date: DateLike,
        end_date: DateLike,
        day_count: str = "ACT/360"
    ) -> float:
        d1 = parse_date(start_date)
        d2 = parse_date(end_date)

        if d1 >= d2:
            return 0.0

        df1 = self.discount_curve.get_discount_factor(d1)
        df2 = self.discount_curve.get_discount_factor(d2)

        yf = year_fraction(d1, d2, day_count)
        if yf <= 0.0:
            return 0.0

        forward_rate = (df1 / df2 - 1.0) / yf
        return float(forward_rate)
