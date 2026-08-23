from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from quant_engine.curves import bootstrap_curve
from quant_engine.risk import calculate_dv01, calculate_bucketed_dv01, calculate_portfolio_risk

router = APIRouter(prefix="/risk", tags=["Risk Engine"])

class RiskRequest(BaseModel):
    trade_id: str = Field(default="IRS-USD-101")
    valuation_date: str = Field(default="2026-08-23")
    notional: float = Field(default=1_000_000.0)
    fixed_rate: float = Field(default=0.05)
    pay_receive: str = Field(default="PAYER")
    start_date: str = Field(default="2026-08-23")
    end_date: str = Field(default="2028-08-23")
    currency: str = Field(default="USD")
    quotes: Dict[str, float] = Field(default_factory=lambda: {
        "ON": 0.053,
        "1M": 0.0528,
        "3M": 0.0525,
        "6M": 0.0520,
        "1Y": 0.0510,
        "2Y": 0.0485,
        "5Y": 0.0440
    })

class PortfolioRiskRequest(BaseModel):
    valuation_date: str = Field(default="2026-08-23")
    trades: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"trade_id": "IRS-USD-101", "notional": 10000000, "fixed_rate": 0.045, "currency": "USD", "pay_receive": "PAYER", "start_date": "2026-08-23", "end_date": "2028-08-23"},
        {"trade_id": "IRS-USD-102", "notional": 5000000, "fixed_rate": 0.048, "currency": "USD", "pay_receive": "RECEIVER", "start_date": "2026-08-23", "end_date": "2031-08-23"},
        {"trade_id": "IRS-INR-201", "notional": 50000000, "fixed_rate": 0.065, "currency": "INR", "pay_receive": "PAYER", "start_date": "2026-08-23", "end_date": "2028-08-23"}
    ])
    quotes: Dict[str, float] = Field(default_factory=lambda: {
        "ON": 0.053, "1M": 0.0528, "3M": 0.0525, "1Y": 0.0510, "2Y": 0.0485, "5Y": 0.0440
    })

@router.post("/dv01")
def get_dv01(req: RiskRequest):
    try:
        curve = bootstrap_curve(req.valuation_date, req.quotes, req.currency, "SOFR")
        trade_kwargs = {
            "notional": req.notional,
            "fixed_rate": req.fixed_rate,
            "pay_receive": req.pay_receive,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "currency": req.currency
        }
        parallel_dv01 = calculate_dv01(req.trade_id, req.valuation_date, curve, trade_kwargs)
        bucketed_dv01 = calculate_bucketed_dv01(req.trade_id, req.valuation_date, curve, trade_kwargs)

        return {
            "success": True,
            "data": {
                "parallel": parallel_dv01,
                "bucketed": bucketed_dv01
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/portfolio")
def get_portfolio_risk(req: PortfolioRiskRequest):
    try:
        res = calculate_portfolio_risk(
            trades=req.trades,
            market_quotes=req.quotes,
            valuation_date=req.valuation_date
        )
        return {
            "success": True,
            "data": res.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
