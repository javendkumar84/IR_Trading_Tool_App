import numpy as np
from typing import List, Tuple

def linear_interpolate(x_nodes: List[float], y_nodes: List[float], target_x: float) -> float:
    """Standard 1D linear interpolation with flat boundary extrapolation."""
    if target_x <= x_nodes[0]:
        return y_nodes[0]
    if target_x >= x_nodes[-1]:
        return y_nodes[-1]
    return float(np.interp(target_x, x_nodes, y_nodes))

def log_linear_df_interpolate(t_nodes: List[float], df_nodes: List[float], target_t: float) -> float:
    """
    Log-linear discount factor interpolation:
    DF(t) = exp( ln(DF_1) + (ln(DF_2) - ln(DF_1)) * (t - t1)/(t2 - t1) )
    """
    if target_t <= 0.0:
        return 1.0
    if target_t <= t_nodes[0]:
        # Extrapolate using first node zero rate
        r0 = -np.log(df_nodes[0]) / t_nodes[0] if t_nodes[0] > 0 else 0.05
        return float(np.exp(-r0 * target_t))
    if target_t >= t_nodes[-1]:
        # Extrapolate using last node zero rate
        r_last = -np.log(df_nodes[-1]) / t_nodes[-1]
        return float(np.exp(-r_last * target_t))

    log_dfs = [np.log(df) for df in df_nodes]
    interp_log_df = float(np.interp(target_t, t_nodes, log_dfs))
    return float(np.exp(interp_log_df))
