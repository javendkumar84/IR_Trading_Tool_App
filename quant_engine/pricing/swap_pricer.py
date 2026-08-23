from datetime import date
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from quant_engine.daycount import year_fraction, parse_date, DateLike
from quant_engine.schedules import generate_schedule, CashflowPeriod
from quant_engine.curves import DiscountCurve, ForwardCurve

@dataclass
class SwapValuationResult:
    trade_id: str
    valuation_date: str
    fixed_pv: float
    floating_pv: float
    net_pv: float
    par_rate: float
    annuity: float
    dv01: float
    pay_receive: str
    currency: str
    notional: float
    fixed_cashflows: List[Dict[str, Any]]
    floating_cashflows: List[Dict[str, Any]]

def price_interest_rate_swap(
    trade_id: str,
    valuation_date: DateLike,
    discount_curve: DiscountCurve,
    forward_curve: Optional[ForwardCurve] = None,
    notional: float = 1_000_000.0,
    fixed_rate: float = 0.05,
    floating_spread: float = 0.0,
    pay_receive: str = "PAYER", # PAYER = Pay Fixed, Receive Float
    start_date: DateLike = "2026-08-23",
    end_date: DateLike = "2028-08-23",
    fixed_frequency: str = "6M",
    floating_frequency: str = "6M",
    fixed_day_count: str = "30/360",
    floating_day_count: str = "ACT/360",
    currency: str = "USD"
) -> SwapValuationResult:
    """
    Prices a Fixed vs Floating Interest Rate Swap.
    
    PAYER semantics:
    Net PV = Floating Leg PV - Fixed Leg PV
    RECEIVER semantics:
    Net PV = Fixed Leg PV - Floating Leg PV
    """
    val_date = parse_date(valuation_date)
    if forward_curve is None:
        forward_curve = ForwardCurve(discount_curve)

    # 1. Generate Leg Schedules
    fixed_schedule = generate_schedule(
        start_date=start_date,
        end_date=end_date,
        frequency=fixed_frequency,
        day_count=fixed_day_count,
        notional=notional,
        rate=fixed_rate,
        currency=currency
    )

    floating_schedule = generate_schedule(
        start_date=start_date,
        end_date=end_date,
        frequency=floating_frequency,
        day_count=floating_day_count,
        notional=notional,
        rate=0.0, # Rate will be projected via forward curve
        currency=currency
    )

    # 2. Price Fixed Leg
    fixed_pv = 0.0
    annuity = 0.0
    fixed_cf_details = []

    for cf in fixed_schedule:
        adj_end = parse_date(cf.adjusted_end)
        df = discount_curve.get_discount_factor(adj_end)
        pv = cf.cashflow * df
        fixed_pv += pv
        annuity += cf.accrual_factor * df

        fixed_cf_details.append({
            **cf.__dict__,
            "discount_factor": round(df, 8),
            "pv": round(pv, 2)
        })

    # 3. Price Floating Leg
    floating_pv = 0.0
    floating_cf_details = []

    for cf in floating_schedule:
        adj_start = parse_date(cf.adjusted_start)
        adj_end = parse_date(cf.adjusted_end)
        
        # Project forward rate F(t1, t2)
        fwd_rate = forward_curve.get_forward_rate(adj_start, adj_end, floating_day_count)
        effective_rate = fwd_rate + floating_spread
        cf_amount = notional * effective_rate * cf.accrual_factor
        
        df = discount_curve.get_discount_factor(adj_end)
        pv = cf_amount * df
        floating_pv += pv

        floating_cf_details.append({
            **cf.__dict__,
            "rate": round(effective_rate, 6),
            "cashflow": round(cf_amount, 2),
            "discount_factor": round(df, 8),
            "pv": round(pv, 2)
        })

    # 4. Compute Par Rate and Net PV
    par_rate = (floating_pv / notional) / annuity if annuity > 0 else fixed_rate

    direction = pay_receive.upper()
    if direction in ["PAYER", "PAY_FIXED"]:
        net_pv = floating_pv - fixed_pv
    else: # RECEIVER
        net_pv = fixed_pv - floating_pv

    # 5. Approximate DV01 (PV difference for 1bp shift in fixed rate)
    dv01 = abs(annuity * notional * 0.0001)

    return SwapValuationResult(
        trade_id=trade_id,
        valuation_date=val_date.strftime("%Y-%m-%d"),
        fixed_pv=round(fixed_pv, 2),
        floating_pv=round(floating_pv, 2),
        net_pv=round(net_pv, 2),
        par_rate=round(par_rate, 6),
        annuity=round(annuity, 6),
        dv01=round(dv01, 2),
        pay_receive=direction,
        currency=currency,
        notional=notional,
        fixed_cashflows=fixed_cf_details,
        floating_cashflows=floating_cf_details
    )
