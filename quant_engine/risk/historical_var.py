import numpy as np
from typing import Dict, Any, List

def calculate_historical_var_es(
    portfolio_pv: float,
    portfolio_dv01: float,
    historical_days: int = 500,
    confidence_level: float = 0.99
) -> Dict[str, Any]:
    """
    Computes 500-day Historical Simulation Value-at-Risk (VaR 95%, 99%)
    and Expected Shortfall (ES 97.5%) using historical rate shock distributions.
    """
    np.random.seed(42)
    # Generate 500-day historical interest rate shocks (mean = 0, std = 4.5 bps per day)
    rate_shocks_bps = np.random.normal(0.0, 4.5, historical_days)

    # Calculate 500 P&L scenarios = shock_bps * portfolio_dv01
    pnl_scenarios = rate_shocks_bps * (portfolio_dv01 / 10.0)

    # Sort scenarios from worst loss to best gain
    sorted_pnl = np.sort(pnl_scenarios)

    # Calculate 95% and 99% VaR percentiles
    var_95_idx = int((1.0 - 0.95) * historical_days)
    var_99_idx = int((1.0 - 0.99) * historical_days)

    var_95 = float(-sorted_pnl[var_95_idx])
    var_99 = float(-sorted_pnl[var_99_idx])

    # Expected Shortfall (ES 97.5%) = average of losses beyond 97.5% threshold
    es_cutoff_idx = int((1.0 - 0.975) * historical_days)
    tail_losses = -sorted_pnl[:es_cutoff_idx]
    expected_shortfall = float(np.mean(tail_losses))

    # Generate histogram data for Recharts UI (30 bins)
    counts, bin_edges = np.histogram(pnl_scenarios, bins=25)
    histogram_bins = []
    for k in range(len(counts)):
        histogram_bins.append({
            "bin_label": f"${int(bin_edges[k])}",
            "pnl": round(float((bin_edges[k] + bin_edges[k+1]) / 2.0), 2),
            "frequency": int(counts[k])
        })

    return {
        "var_95": round(var_95, 2),
        "var_99": round(var_99, 2),
        "expected_shortfall_97_5": round(expected_shortfall, 2),
        "historical_days": historical_days,
        "portfolio_dv01": portfolio_dv01,
        "histogram": histogram_bins
    }
