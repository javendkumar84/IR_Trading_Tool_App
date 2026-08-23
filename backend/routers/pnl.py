from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from quant_engine.pnl import calculate_pnl_attribution, calculate_portfolio_pnl

router = APIRouter(prefix="/pnl", tags=["P&L Engine"])

class PnLAttributionRequest(BaseModel):
    trade_id: str = Field(default="IRS-USD-101")
    previous_pv: float = Field(default=10000.0)
    current_pv: float = Field(default=12500.0)
    rate_movement_bp: float = Field(default=2.5)
    dv01: float = Field(default=1000.0)
    days_elapsed: int = Field(default=1)
    daily_theta: float = Field(default=10.0)
    fx_rate_change: float = Field(default=0.0)
    spread_change_bp: float = Field(default=0.0)
    tolerance: float = Field(default=50.0)

class PortfolioPnLRequest(BaseModel):
    tolerance: float = Field(default=100.0)
    trades: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"trade_id": "IRS-USD-101", "previous_pv": 100000.0, "current_pv": 125000.0, "rate_movement_bp": 2.5, "dv01": 9500.0, "days_elapsed": 1, "daily_theta": 500.0, "book": "RATES_USD", "trader": "J. Doe", "currency": "USD"},
        {"trade_id": "IRS-USD-102", "previous_pv": 50000.0, "current_pv": 48000.0, "rate_movement_bp": -1.0, "dv01": 2000.0, "days_elapsed": 1, "daily_theta": 100.0, "book": "RATES_USD", "trader": "A. Smith", "currency": "USD"},
        {"trade_id": "IRS-INR-201", "previous_pv": 200000.0, "current_pv": 215000.0, "rate_movement_bp": 3.0, "dv01": 4500.0, "days_elapsed": 1, "daily_theta": 300.0, "book": "RATES_INR", "trader": "E. Vance", "currency": "INR"}
    ])

@router.post("/attribution")
def get_pnl_attribution(req: PnLAttributionRequest):
    try:
        res = calculate_pnl_attribution(
            trade_id=req.trade_id,
            previous_pv=req.previous_pv,
            current_pv=req.current_pv,
            rate_movement_bp=req.rate_movement_bp,
            dv01=req.dv01,
            days_elapsed=req.days_elapsed,
            daily_theta=req.daily_theta,
            fx_rate_change=req.fx_rate_change,
            spread_change_bp=req.spread_change_bp,
            tolerance=req.tolerance
        )
        return {
            "success": True,
            "data": res.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/portfolio")
def get_portfolio_pnl(req: PortfolioPnLRequest):
    try:
        res = calculate_portfolio_pnl(
            trades=req.trades,
            tolerance=req.tolerance
        )
        return {
            "success": True,
            "data": res.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
