from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict
from quant_engine.curves import bootstrap_curve

router = APIRouter(prefix="/curves", tags=["Curve Engine"])

class CurveBootstrapRequest(BaseModel):
    valuation_date: str = Field(default="2026-08-23")
    currency: str = Field(default="USD")
    index_name: str = Field(default="SOFR")
    quotes: Dict[str, float] = Field(default_factory=lambda: {
        "ON": 0.053,
        "1M": 0.0528,
        "3M": 0.0525,
        "6M": 0.0520,
        "1Y": 0.0510,
        "2Y": 0.0485,
        "5Y": 0.0440,
        "10Y": 0.0425,
        "30Y": 0.0410
    })

@router.post("/bootstrap")
def bootstrap_discount_curve(req: CurveBootstrapRequest):
    try:
        curve = bootstrap_curve(
            valuation_date=req.valuation_date,
            quotes=req.quotes,
            currency=req.currency,
            index_name=req.index_name
        )
        return {
            "success": True,
            "data": curve.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
