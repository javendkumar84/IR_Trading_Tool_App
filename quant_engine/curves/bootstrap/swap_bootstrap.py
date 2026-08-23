from datetime import date
from typing import Dict, List, Tuple, Optional
from dateutil.relativedelta import relativedelta
from scipy.optimize import root_scalar
import numpy as np

from quant_engine.daycount import year_fraction, parse_date, DateLike
from quant_engine.schedules import generate_schedule
from quant_engine.curves.discount_curve import DiscountCurve
from quant_engine.curves.interpolation import log_linear_df_interpolate

TENOR_YEARS: Dict[str, float] = {
    "ON": 1.0 / 365.0,
    "1W": 7.0 / 365.0,
    "1M": 1.0 / 12.0,
    "3M": 3.0 / 12.0,
    "6M": 6.0 / 12.0,
    "9M": 9.0 / 12.0,
    "1Y": 1.0,
    "2Y": 2.0,
    "3Y": 3.0,
    "4Y": 4.0,
    "5Y": 5.0,
    "7Y": 7.0,
    "10Y": 10.0,
    "15Y": 15.0,
    "20Y": 20.0,
    "30Y": 30.0,
}

def parse_tenor_to_years(tenor: str) -> float:
    t = tenor.upper()
    if t in TENOR_YEARS:
        return TENOR_YEARS[t]
    if t.endswith("Y"):
        return float(t[:-1])
    if t.endswith("M"):
        return float(t[:-1]) / 12.0
    if t.endswith("W"):
        return float(t[:-1]) / 52.0
    if t.endswith("D"):
        return float(t[:-1]) / 365.0
    return 1.0

def bootstrap_curve(
    valuation_date: DateLike,
    quotes: Dict[str, float],
    currency: str = "USD",
    index_name: str = "SOFR"
) -> DiscountCurve:
    """
    Bootstraps a DiscountCurve from raw market quotes (Deposits & IRS par rates).
    
    Quote format example:
    {
      "ON": 0.053,
      "1M": 0.0528,
      "3M": 0.0525,
      "6M": 0.0520,
      "1Y": 0.0510,
      "2Y": 0.0485,
      "3Y": 0.0465,
      "5Y": 0.0440,
      "7Y": 0.0430,
      "10Y": 0.0425,
      "30Y": 0.0410
    }
    """
    val_date = parse_date(valuation_date)
    
    # Sort quotes by tenor time ascending
    sorted_items = sorted(quotes.items(), key=lambda x: parse_tenor_to_years(x[0]))

    tenors: List[str] = []
    times: List[float] = []
    discount_factors: List[float] = []

    for tenor, quote_rate in sorted_items:
        t_years = parse_tenor_to_years(tenor)

        if t_years <= 1.0:
            # Short-term Deposit / Money Market Rate Simple Discount Factoring
            # DF(t) = 1 / (1 + rate * t)
            df = 1.0 / (1.0 + quote_rate * t_years)
        else:
            # Swap Par Rate Bootstrap Solver
            # Solve for DF(t_years) such that Par Rate Annuity equals 1 - DF(t_years)
            # Par Rate = (1 - DF_end) / sum(accrual_i * DF_i)
            # Therefore: (1 - DF_end) - Par Rate * sum(accrual_i * DF_i) = 0

            schedule = generate_schedule(
                start_date=val_date,
                end_date=val_date + relativedelta(years=int(round(t_years))),
                frequency="6M",
                day_count="30/360",
                notional=1.0,
                rate=quote_rate,
                currency=currency
            )

            # Objective function to find missing discount factor at t_years
            def objective(df_test: float) -> float:
                trial_times = times + [t_years]
                trial_dfs = discount_factors + [df_test]

                pv_fixed = 0.0
                for period in schedule:
                    dt_p = parse_date(period.adjusted_end)
                    t_p = year_fraction(val_date, dt_p, "ACT/365F")
                    df_p = log_linear_df_interpolate(trial_times, trial_dfs, t_p)
                    pv_fixed += quote_rate * period.accrual_factor * df_p

                # Floating leg PV for par swap = 1 - DF_end
                pv_float = 1.0 - df_test
                return pv_fixed - pv_float

            # Solve root for df_test in range [0.01, 1.0]
            try:
                res = root_scalar(objective, bracket=[0.01, 1.0], method='brentq')
                df = float(res.root)
            except Exception:
                # Fallback to analytical approximation if solver bounds fail
                approx_r = quote_rate
                df = float(np.exp(-approx_r * t_years))

        tenors.append(tenor)
        times.append(t_years)
        discount_factors.append(df)

    return DiscountCurve(
        valuation_date=val_date,
        tenors=tenors,
        times=times,
        discount_factors=discount_factors,
        currency=currency,
        index_name=index_name
    )
