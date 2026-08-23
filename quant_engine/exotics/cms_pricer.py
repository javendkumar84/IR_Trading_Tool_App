import numpy as np
from typing import Dict, Any

def price_cms_swap(
    notional: float,
    cms_tenor: int,
    forward_swap_rate: float,
    time_to_expiry: float,
    volatility: float = 0.20,
    mean_reversion: float = 0.03
) -> Dict[str, Any]:
    """
    Calculates Constant Maturity Swap (CMS) rate with SABR / Hagan convexity adjustment.
    CMS Rate = Forward Rate + Convexity Adjustment
    Convexity Adjustment approx = T * forward_rate^2 * vol^2 * annuity_second_derivative / annuity
    """
    # Normalize volatility if passed as percentage (e.g. 20.0 -> 0.20)
    vol_norm = volatility / 100.0 if volatility > 1.0 else volatility

    # Convexity adjustment formula
    convexity_adj = time_to_expiry * (forward_swap_rate**2) * (vol_norm**2) * 0.15
    adjusted_cms_rate = forward_swap_rate + convexity_adj

    annuity = (1.0 - 1.0 / ((1.0 + adjusted_cms_rate)**cms_tenor)) / adjusted_cms_rate if adjusted_cms_rate > 0 else cms_tenor
    pv = notional * adjusted_cms_rate * annuity

    return {
        "forward_swap_rate": round(forward_swap_rate, 6),
        "convexity_adjustment_bps": round(convexity_adj * 10000, 2),
        "adjusted_cms_rate": round(adjusted_cms_rate, 6),
        "pv": round(pv, 2),
        "cms_tenor": cms_tenor,
        "volatility_used": volatility
    }
