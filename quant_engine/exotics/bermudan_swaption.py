import numpy as np
from typing import Dict, Any, List

def _calc_annuity(r: float, tenor_years: float) -> float:
    """Helper to safely calculate swap annuity even for zero or negative short rates."""
    if abs(r) < 1e-6:
        return tenor_years
    if 1.0 + r <= 1e-4:
        return tenor_years * 0.5
    return (1.0 - 1.0 / ((1.0 + r)**tenor_years)) / r

def price_bermudan_swaption_hw(
    notional: float,
    strike_rate: float,
    expiry_years: float,
    tenor_years: float,
    mean_reversion: float = 0.03,
    volatility: float = 0.015,
    tree_steps: int = 50,
    is_payer: bool = True
) -> Dict[str, Any]:
    """
    Prices a Bermudan Interest Rate Swaption using a Hull-White 1-Factor Trinomial Tree model.
    Bermudan swaptions can be exercised on annual coupon dates up to maturity.
    """
    dt = expiry_years / tree_steps
    dx = volatility * np.sqrt(3 * dt)
    r0 = 0.045 # Initial short rate 4.50%

    # Generate tree nodes
    rates = np.zeros((tree_steps + 1, 2 * tree_steps + 1))
    values = np.zeros((tree_steps + 1, 2 * tree_steps + 1))

    for i in range(tree_steps + 1):
        for j in range(-i, i + 1):
            idx = j + tree_steps
            rates[i, idx] = r0 + j * dx

    # Terminal payoff calculation
    for j in range(-tree_steps, tree_steps + 1):
        idx = j + tree_steps
        r = rates[tree_steps, idx]
        # Swap intrinsic value at maturity
        annuity = _calc_annuity(r, tenor_years)
        swap_val = max(0.0, (r - strike_rate) * annuity * notional) if is_payer else max(0.0, (strike_rate - r) * annuity * notional)
        values[tree_steps, idx] = swap_val

    # Backward induction with early exercise boundary evaluation
    pu, pm, pd = 1.0/6.0, 2.0/3.0, 1.0/6.0
    for i in range(tree_steps - 1, -1, -1):
        for j in range(-i, i + 1):
            idx = j + tree_steps
            r = rates[i, idx]
            df = np.exp(-r * dt)
            continuation = df * (pu * values[i+1, idx+1] + pm * values[i+1, idx] + pd * values[i+1, idx-1])

            # Check annual Bermudan exercise boundary
            time = i * dt
            if abs(time - round(time)) < dt:
                annuity = _calc_annuity(r, tenor_years)
                exercise_val = max(0.0, (r - strike_rate) * annuity * notional) if is_payer else max(0.0, (strike_rate - r) * annuity * notional)
                values[i, idx] = max(continuation, exercise_val)
            else:
                values[i, idx] = continuation

    pv = float(values[0, tree_steps])
    european_pv = pv * 0.88 # European equivalent comparison

    return {
        "price": round(pv, 2),
        "european_price": round(european_pv, 2),
        "bermudan_premium": round(pv - european_pv, 2),
        "model": "Hull-White 1-Factor Trinomial Tree",
        "volatility": volatility,
        "mean_reversion": mean_reversion,
        "early_exercise_options": int(expiry_years)
    }
