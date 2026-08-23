from fastapi import APIRouter
from typing import Dict, Any, List
from quant_engine.validation import audit_logger

router = APIRouter(prefix="/reports", tags=["Reporting & Audit Engine"])

@router.get("/summary")
def get_reports_summary():
    return {
        "success": True,
        "data": {
            "trade_summary": [
                {"product": "Interest Rate Swap", "count": 14, "notional": 125000000.0, "pv": 32665.27, "currency": "USD"},
                {"product": "Cap / Floor Option", "count": 6, "notional": 45000000.0, "pv": 18400.00, "currency": "USD"},
                {"product": "Swaption", "count": 4, "notional": 30000000.0, "pv": -5200.00, "currency": "EUR"},
                {"product": "Range Accrual", "count": 3, "notional": 20000000.0, "pv": 14200.00, "currency": "USD"},
                {"product": "FX Forward", "count": 5, "notional": 15000000.0, "pv": 8900.00, "currency": "USD"}
            ],
            "risk_summary": {
                "total_dv01": 11439.75,
                "usd_dv01": 9439.75,
                "inr_dv01": 2000.00
            },
            "pnl_summary": {
                "mtd_pnl": 45200.00,
                "ytd_pnl": 182400.00,
                "unrealized_pnl": 32665.27,
                "realized_pnl": 12534.73
            }
        }
    }

@router.get("/audit")
def get_audit_logs():
    return {
        "success": True,
        "data": audit_logger.get_logs()
    }
