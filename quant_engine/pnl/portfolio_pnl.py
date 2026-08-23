from typing import List, Dict, Any
from dataclasses import dataclass
from .attribution import calculate_pnl_attribution, PnLAttributionResult

@dataclass
class PortfolioPnLResult:
    total_previous_pv: float
    total_current_pv: float
    total_pnl: float
    total_rate_pnl: float
    total_theta_pnl: float
    total_fx_pnl: float
    total_spread_pnl: float
    total_residual_pnl: float
    reconciliation_pass: bool
    reconciliation_error: float
    trade_attributions: List[Dict[str, Any]]
    pnl_by_book: Dict[str, float]
    pnl_by_trader: Dict[str, float]
    pnl_by_currency: Dict[str, float]

def calculate_portfolio_pnl(
    trades: List[Dict[str, Any]],
    tolerance: float = 100.0
) -> PortfolioPnLResult:
    """
    Computes portfolio-wide P&L attribution waterfall and book/trader aggregations.
    """
    tot_prev_pv = 0.0
    tot_curr_pv = 0.0
    tot_pnl = 0.0
    tot_rate = 0.0
    tot_theta = 0.0
    tot_fx = 0.0
    tot_spread = 0.0
    tot_residual = 0.0

    trade_attributions: List[Dict[str, Any]] = []
    pnl_by_book: Dict[str, float] = {}
    pnl_by_trader: Dict[str, float] = {}
    pnl_by_currency: Dict[str, float] = {}

    for t in trades:
        trade_id = t.get("trade_id", "TRD-001")
        prev_pv = float(t.get("previous_pv", 10000.0))
        curr_pv = float(t.get("current_pv", 12500.0))
        rate_bp = float(t.get("rate_movement_bp", 2.5))
        dv01 = float(t.get("dv01", 1000.0))
        days = int(t.get("days_elapsed", 1))
        theta = float(t.get("daily_theta", 10.0))
        book = t.get("book", "RATES_USD")
        trader = t.get("trader", "J. Doe")
        ccy = t.get("currency", "USD").upper()

        res = calculate_pnl_attribution(
            trade_id=trade_id,
            previous_pv=prev_pv,
            current_pv=curr_pv,
            rate_movement_bp=rate_bp,
            dv01=dv01,
            days_elapsed=days,
            daily_theta=theta,
            tolerance=tolerance
        )

        tot_prev_pv += res.previous_pv
        tot_curr_pv += res.current_pv
        tot_pnl += res.total_pnl
        tot_rate += res.rate_delta_pnl
        tot_theta += res.time_decay_theta_pnl
        tot_fx += res.fx_pnl
        tot_spread += res.spread_pnl
        tot_residual += res.residual_pnl

        pnl_by_book[book] = pnl_by_book.get(book, 0.0) + res.total_pnl
        pnl_by_trader[trader] = pnl_by_trader.get(trader, 0.0) + res.total_pnl
        pnl_by_currency[ccy] = pnl_by_currency.get(ccy, 0.0) + res.total_pnl

        trade_attributions.append({
            **res.__dict__,
            "book": book,
            "trader": trader,
            "currency": ccy
        })

    reconciliation_error = abs(tot_residual)
    reconciliation_pass = reconciliation_error <= tolerance

    return PortfolioPnLResult(
        total_previous_pv=round(tot_prev_pv, 2),
        total_current_pv=round(tot_curr_pv, 2),
        total_pnl=round(tot_pnl, 2),
        total_rate_pnl=round(tot_rate, 2),
        total_theta_pnl=round(tot_theta, 2),
        total_fx_pnl=round(tot_fx, 2),
        total_spread_pnl=round(tot_spread, 2),
        total_residual_pnl=round(tot_residual, 2),
        reconciliation_pass=reconciliation_pass,
        reconciliation_error=round(reconciliation_error, 2),
        trade_attributions=trade_attributions,
        pnl_by_book={k: round(v, 2) for k, v in pnl_by_book.items()},
        pnl_by_trader={k: round(v, 2) for k, v in pnl_by_trader.items()},
        pnl_by_currency={k: round(v, 2) for k, v in pnl_by_currency.items()}
    )
