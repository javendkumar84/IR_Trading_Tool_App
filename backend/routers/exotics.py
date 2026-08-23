from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from quant_engine.exotics.bermudan_swaption import price_bermudan_swaption_hw
from quant_engine.exotics.cms_pricer import price_cms_swap
from quant_engine.risk.historical_var import calculate_historical_var_es

router = APIRouter(prefix="/exotics", tags=["Exotic Quant & Advanced Risk Engine"])

class BermudanRequest(BaseModel):
    notional: float = 10000000.0
    strike_rate: float = 0.045
    expiry_years: float = 5.0
    tenor_years: float = 5.0
    volatility: float = 0.015

class CMSRequest(BaseModel):
    notional: float = 10000000.0
    cms_tenor: int = 10
    forward_swap_rate: float = 0.0485
    time_to_expiry: float = 1.0

class VaRRequest(BaseModel):
    portfolio_pv: float = 125000.0
    portfolio_dv01: float = 9500.0
    historical_days: int = 500

@router.post("/bermudan")
def price_bermudan(req: BermudanRequest):
    res = price_bermudan_swaption_hw(
        notional=req.notional,
        strike_rate=req.strike_rate,
        expiry_years=req.expiry_years,
        tenor_years=req.tenor_years,
        volatility=req.volatility
    )
    return {"success": True, "data": res}

@router.post("/cms")
def price_cms(req: CMSRequest):
    res = price_cms_swap(
        notional=req.notional,
        cms_tenor=req.cms_tenor,
        forward_swap_rate=req.forward_swap_rate,
        time_to_expiry=req.time_to_expiry
    )
    return {"success": True, "data": res}

@router.post("/historical-var")
def get_historical_var(req: VaRRequest):
    res = calculate_historical_var_es(
        portfolio_pv=req.portfolio_pv,
        portfolio_dv01=req.portfolio_dv01,
        historical_days=req.historical_days
    )
    return {"success": True, "data": res}
