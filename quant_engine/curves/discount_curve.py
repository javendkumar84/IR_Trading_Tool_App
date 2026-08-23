from datetime import date
from typing import List, Dict, Union
import numpy as np
from quant_engine.daycount import year_fraction, parse_date, DateLike
from .interpolation import log_linear_df_interpolate, linear_interpolate

class DiscountCurve:
    """
    Discount Curve object representing the yield term structure.
    """
    def __init__(
        self,
        valuation_date: DateLike,
        tenors: List[str],
        times: List[float],
        discount_factors: List[float],
        currency: str = "USD",
        index_name: str = "SOFR"
    ):
        self.valuation_date = parse_date(valuation_date)
        self.tenors = tenors
        self.times = times
        self.discount_factors = discount_factors
        self.currency = currency.upper()
        self.index_name = index_name.upper()

        # Compute zero rates continuously compounded
        self.zero_rates = []
        for t, df in zip(times, discount_factors):
            if t > 0.0:
                r = -np.log(df) / t
            else:
                r = 0.0
            self.zero_rates.append(float(r))

    def get_discount_factor(self, target: Union[float, DateLike]) -> float:
        if isinstance(target, (date, str)):
            dt = parse_date(target)
            t = year_fraction(self.valuation_date, dt, "ACT/365F")
        else:
            t = float(target)

        if t <= 0.0:
            return 1.0

        return log_linear_df_interpolate(self.times, self.discount_factors, t)

    def get_zero_rate(self, target: Union[float, DateLike]) -> float:
        df = self.get_discount_factor(target)
        if isinstance(target, (date, str)):
            t = year_fraction(self.valuation_date, parse_date(target), "ACT/365F")
        else:
            t = float(target)

        if t <= 0.0:
            return self.zero_rates[0] if len(self.zero_rates) > 0 else 0.05
        return float(-np.log(df) / t)

    def to_dict(self) -> Dict:
        return {
            "valuation_date": self.valuation_date.strftime("%Y-%m-%d"),
            "currency": self.currency,
            "index_name": self.index_name,
            "points": [
                {
                    "tenor": tenor,
                    "time": t,
                    "discount_factor": round(df, 8),
                    "zero_rate": round(zr, 6)
                }
                for tenor, t, df, zr in zip(self.tenors, self.times, self.discount_factors, self.zero_rates)
            ]
        }
