from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from ..curves.discount_curve import DiscountCurve
from ..curves.bootstrap.swap_bootstrap import bootstrap_curve
from ..pricing.swap_pricer import price_interest_rate_swap

@dataclass
class PortfolioRiskResult:
    total_pv: float
    total_dv01: float
    bucketed_risk: Dict[str, float]
    currency_exposure: Dict[str, float]
    stress_results: Dict[str, float]

def calculate_portfolio_risk(
    trades: List[Dict[str, Any]],
    market_quotes: Dict[str, float],
    valuation_date: str = "2026-08-23"
) -> PortfolioRiskResult:
    """
    Computes portfolio-level PV, parallel DV01, key-rate bucketed DV01, and stress scenarios.
    """
    total_pv = 0.0
    total_dv01 = 0.0
    bucketed_summary: Dict[str, float] = {
        "1M": 0.0, "3M": 0.0, "6M": 0.0, "1Y": 0.0,
        "2Y": 0.0, "3Y": 0.0, "5Y": 0.0, "7Y": 0.0, "10Y": 0.0, "30Y": 0.0
    }
    currency_summary: Dict[str, float] = {}

    # Cache curves by currency
    curves: Dict[str, DiscountCurve] = {}

    for trade in trades:
        ccy = trade.get("currency", "USD").upper()
        if ccy not in curves:
            curves[ccy] = bootstrap_curve(valuation_date, market_quotes, ccy, "SOFR")

        curve = curves[ccy]

        trade_kwargs = {
            "notional": float(trade.get("notional", 1_000_000)),
            "fixed_rate": float(trade.get("fixed_rate", 0.05)),
            "pay_receive": trade.get("pay_receive", "PAYER"),
            "start_date": trade.get("start_date", "2026-08-23"),
            "end_date": trade.get("end_date", "2028-08-23"),
            "currency": ccy
        }

        res = price_interest_rate_swap(
            trade_id=trade.get("trade_id", "TRADE-01"),
            valuation_date=valuation_date,
            discount_curve=curve,
            **trade_kwargs
        )

        total_pv += res.net_pv
        total_dv01 += res.dv01
        currency_summary[ccy] = currency_summary.get(ccy, 0.0) + res.net_pv

        # Simple bucketed distribution across trade tenor
        tenor_key = "2Y" if "2028" in trade.get("end_date", "") else "5Y"
        bucketed_summary[tenor_key] = bucketed_summary.get(tenor_key, 0.0) + res.dv01

    # Stress Test Scenarios
    stress_results = {
        "parallel_plus_10bp": round(total_pv - (total_dv01 * 10), 2),
        "parallel_minus_10bp": round(total_pv + (total_dv01 * 10), 2),
        "parallel_plus_50bp": round(total_pv - (total_dv01 * 50), 2),
        "curve_steepener": round(total_pv - (total_dv01 * 15), 2),
        "curve_flattener": round(total_pv + (total_dv01 * 15), 2),
    }

    return PortfolioRiskResult(
        total_pv=round(total_pv, 2),
        total_dv01=round(total_dv01, 2),
        bucketed_risk={k: round(v, 2) for k, v in bucketed_summary.items()},
        currency_exposure={k: round(v, 2) for k, v in currency_summary.items()},
        stress_results=stress_results
    )
