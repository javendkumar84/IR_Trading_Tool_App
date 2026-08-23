from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class PnLAttributionResult:
    trade_id: str
    previous_pv: float
    current_pv: float
    total_pnl: float
    rate_delta_pnl: float
    time_decay_theta_pnl: float
    fx_pnl: float
    spread_pnl: float
    residual_pnl: float
    reconciliation_pass: bool
    reconciliation_error: float

def calculate_pnl_attribution(
    trade_id: str,
    previous_pv: float,
    current_pv: float,
    rate_movement_bp: float = 0.0,
    dv01: float = 0.0,
    days_elapsed: int = 1,
    daily_theta: float = 0.0,
    fx_rate_change: float = 0.0,
    spread_change_bp: float = 0.0,
    tolerance: float = 10.0
) -> PnLAttributionResult:
    """
    Decomposes total P&L into deterministic attribution components:
    Total PnL = Current PV - Previous PV
    Total PnL = Rate Delta PnL + Theta PnL + FX PnL + Spread PnL + Residual PnL
    """
    total_pnl = current_pv - previous_pv

    rate_delta_pnl = rate_movement_bp * dv01
    time_decay_pnl = days_elapsed * daily_theta
    fx_pnl = previous_pv * fx_rate_change
    spread_pnl = spread_change_bp * dv01 * 0.5

    explained_pnl = rate_delta_pnl + time_decay_pnl + fx_pnl + spread_pnl
    residual_pnl = total_pnl - explained_pnl

    reconciliation_error = abs(residual_pnl)
    reconciliation_pass = reconciliation_error <= tolerance

    return PnLAttributionResult(
        trade_id=trade_id,
        previous_pv=round(previous_pv, 2),
        current_pv=round(current_pv, 2),
        total_pnl=round(total_pnl, 2),
        rate_delta_pnl=round(rate_delta_pnl, 2),
        time_decay_theta_pnl=round(time_decay_pnl, 2),
        fx_pnl=round(fx_pnl, 2),
        spread_pnl=round(spread_pnl, 2),
        residual_pnl=round(residual_pnl, 2),
        reconciliation_pass=reconciliation_pass,
        reconciliation_error=round(reconciliation_error, 2)
    )
