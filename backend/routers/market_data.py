from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from quant_engine.marketdata.quotes import DEFAULT_USD_SOFR_QUOTES, DEFAULT_INR_OIS_QUOTES

router = APIRouter(prefix="/market-data", tags=["Market Data Engine"])

# In-memory quote store pre-seeded with USD & INR curves
CURRENT_MARKET_QUOTES: List[Dict[str, Any]] = DEFAULT_USD_SOFR_QUOTES + DEFAULT_INR_OIS_QUOTES

class UpdateQuoteRequest(BaseModel):
    currency: str
    tenor: str
    mid: float
    bid: float = None
    ask: float = None

@router.get("/")
def get_market_quotes(currency: str = "USD"):
    filtered = [q for q in CURRENT_MARKET_QUOTES if q["currency"].upper() == currency.upper()]
    return {
        "success": True,
        "data": filtered if filtered else CURRENT_MARKET_QUOTES
    }

@router.post("/update")
def update_market_quote(req: UpdateQuoteRequest):
    global CURRENT_MARKET_QUOTES
    found = False
    for q in CURRENT_MARKET_QUOTES:
        if q["currency"].upper() == req.currency.upper() and q["tenor"].upper() == req.tenor.upper():
            q["mid"] = req.mid
            q["bid"] = req.bid if req.bid is not None else round(req.mid - 0.0001, 6)
            q["ask"] = req.ask if req.ask is not None else round(req.mid + 0.0001, 6)
            found = True
            break
    if not found:
        # Append new quote
        CURRENT_MARKET_QUOTES.append({
            "currency": req.currency.upper(),
            "index_name": "SOFR" if req.currency.upper() == "USD" else "OIS",
            "instrument": "SWAP",
            "tenor": req.tenor.upper(),
            "bid": req.bid if req.bid is not None else round(req.mid - 0.0001, 6),
            "mid": req.mid,
            "ask": req.ask if req.ask is not None else round(req.mid + 0.0001, 6),
            "previous": req.mid,
            "change_bps": 0.0,
            "source": "MANUAL_INPUT",
            "timestamp": "2026-08-23T10:00:00Z"
        })

    return {
        "success": True,
        "message": f"Updated market quote for {req.currency} {req.tenor} to {req.mid}"
    }
