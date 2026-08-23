from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from quant_engine.curves import bootstrap_curve, DiscountCurve
from quant_engine.pricing import price_interest_rate_swap

router = APIRouter(prefix="/pricing", tags=["Pricing Engine"])

class PricingRequest(BaseModel):
    trade_id: str = Field(default="IRS-USD-101")
    valuation_date: str = Field(default="2026-08-23")
    notional: float = Field(default=1_000_000.0)
    fixed_rate: float = Field(default=0.05)
    floating_spread: float = Field(default=0.0)
    pay_receive: str = Field(default="PAYER")
    start_date: str = Field(default="2026-08-23")
    end_date: str = Field(default="2028-08-23")
    fixed_frequency: str = Field(default="6M")
    floating_frequency: str = Field(default="6M")
    fixed_day_count: str = Field(default="30/360")
    floating_day_count: str = Field(default="ACT/360")
    currency: str = Field(default="USD")
    market_quotes: Optional[Dict[str, float]] = Field(default_factory=lambda: {
        "ON": 0.053,
        "1M": 0.0528,
        "3M": 0.0525,
        "6M": 0.0520,
        "1Y": 0.0510,
        "2Y": 0.0485,
        "5Y": 0.0440
    })

@router.post("/swap")
def price_swap(req: PricingRequest):
    try:
        # 1. Bootstrap Discount Curve from market quotes
        curve = bootstrap_curve(
            valuation_date=req.valuation_date,
            quotes=req.market_quotes,
            currency=req.currency,
            index_name="SOFR" if req.currency == "USD" else "OIS"
        )

        # 2. Run Quant Swap Pricer
        res = price_interest_rate_swap(
            trade_id=req.trade_id,
            valuation_date=req.valuation_date,
            discount_curve=curve,
            notional=req.notional,
            fixed_rate=req.fixed_rate,
            floating_spread=req.floating_spread,
            pay_receive=req.pay_receive,
            start_date=req.start_date,
            end_date=req.end_date,
            fixed_frequency=req.fixed_frequency,
            floating_frequency=req.floating_frequency,
            fixed_day_count=req.fixed_day_count,
            floating_day_count=req.floating_day_count,
            currency=req.currency
        )
        return {
            "success": True,
            "data": res.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
