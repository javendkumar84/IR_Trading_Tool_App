from typing import Dict, Any, List
from quant_engine.curves import DiscountCurve
from quant_engine.pricing import price_interest_rate_swap

def calculate_dv01(
    trade_id: str,
    valuation_date: str,
    discount_curve: DiscountCurve,
    trade_kwargs: Dict[str, Any]
) -> Dict[str, float]:
    """
    Computes parallel DV01 risk using central finite difference:
    DV01 = (PV(-1bp) - PV(+1bp)) / 2
    """
    base_res = price_interest_rate_swap(
        trade_id=trade_id,
        valuation_date=valuation_date,
        discount_curve=discount_curve,
        **trade_kwargs
    )
    base_pv = base_res.net_pv

    # Shift discount curve zero rates by -1bp
    shifted_dfs_down = [
        float(df * 1.0001) for df in discount_curve.discount_factors
    ]
    curve_down = DiscountCurve(
        valuation_date=valuation_date,
        tenors=discount_curve.tenors,
        times=discount_curve.times,
        discount_factors=shifted_dfs_down,
        currency=discount_curve.currency,
        index_name=discount_curve.index_name
    )
    res_down = price_interest_rate_swap(
        trade_id=trade_id,
        valuation_date=valuation_date,
        discount_curve=curve_down,
        **trade_kwargs
    )

    # Shift discount curve zero rates by +1bp
    shifted_dfs_up = [
        float(df * 0.9999) for df in discount_curve.discount_factors
    ]
    curve_up = DiscountCurve(
        valuation_date=valuation_date,
        tenors=discount_curve.tenors,
        times=discount_curve.times,
        discount_factors=shifted_dfs_up,
        currency=discount_curve.currency,
        index_name=discount_curve.index_name
    )
    res_up = price_interest_rate_swap(
        trade_id=trade_id,
        valuation_date=valuation_date,
        discount_curve=curve_up,
        **trade_kwargs
    )

    dv01 = abs(res_down.net_pv - res_up.net_pv) / 2.0

    return {
        "pv": base_pv,
        "pv_minus_1bp": res_down.net_pv,
        "pv_plus_1bp": res_up.net_pv,
        "dv01": round(dv01, 2)
    }

def calculate_bucketed_dv01(
    trade_id: str,
    valuation_date: str,
    discount_curve: DiscountCurve,
    trade_kwargs: Dict[str, Any]
) -> Dict[str, float]:
    """
    Computes key-rate bucketed DV01 across curve tenors.
    """
    bucketed_risk = {}
    
    for i, tenor in enumerate(discount_curve.tenors):
        shifted_dfs_up = list(discount_curve.discount_factors)
        shifted_dfs_up[i] = shifted_dfs_up[i] * 0.9999

        curve_bumped = DiscountCurve(
            valuation_date=valuation_date,
            tenors=discount_curve.tenors,
            times=discount_curve.times,
            discount_factors=shifted_dfs_up,
            currency=discount_curve.currency,
            index_name=discount_curve.index_name
        )
        res_bumped = price_interest_rate_swap(
            trade_id=trade_id,
            valuation_date=valuation_date,
            discount_curve=curve_bumped,
            **trade_kwargs
        )
        
        base_res = price_interest_rate_swap(
            trade_id=trade_id,
            valuation_date=valuation_date,
            discount_curve=discount_curve,
            **trade_kwargs
        )

        bucket_dv01 = (base_res.net_pv - res_bumped.net_pv)
        bucketed_risk[tenor] = round(bucket_dv01, 2)

    return bucketed_risk
