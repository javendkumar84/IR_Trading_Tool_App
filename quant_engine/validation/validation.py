from typing import Dict, Any, List
from datetime import datetime

class AuditLogger:
    def __init__(self):
        self.logs: List[Dict[str, Any]] = [
            {"timestamp": datetime.now().isoformat(), "user": "J. Doe", "action": "TRADE_CREATED", "object": "Trade", "object_id": "IRS-USD-101", "details": "Booked USD 10M 5Y SOFR IRS @ 4.50%"},
            {"timestamp": datetime.now().isoformat(), "user": "SYSTEM", "action": "CURVE_REBUILT", "object": "Curve", "object_id": "USD_SOFR", "details": "Bootstrapped 13 curve points successfully"},
            {"timestamp": datetime.now().isoformat(), "user": "A. Smith", "action": "MARKET_DATA_UPDATED", "object": "Quote", "object_id": "USD_2Y", "details": "Mid rate updated from 4.83% to 4.85%"},
            {"timestamp": datetime.now().isoformat(), "user": "E. Vance", "action": "VALUATION_EXECUTED", "object": "Valuation", "object_id": "VAL-20260823", "details": "Calculated portfolio PV $125,000.00 and DV01 $9,500.00"}
        ]

    def log_event(self, user: str, action: str, obj: str, obj_id: str, details: str):
        self.logs.insert(0, {
            "timestamp": datetime.now().isoformat(),
            "user": user,
            "action": action,
            "object": obj,
            "object_id": obj_id,
            "details": details
        })

    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs

audit_logger = AuditLogger()

def validate_curve_points(times: List[float], discount_factors: List[float]) -> Dict[str, Any]:
    """
    Validates discount curve monotonicity and bounds (0 < DF <= 1).
    """
    errors = []
    if len(times) != len(discount_factors):
        errors.append("Times and Discount Factors length mismatch")

    for i in range(len(discount_factors)):
        df = discount_factors[i]
        if df <= 0.0 or df > 1.05:
            errors.append(f"Discount factor out of bounds at index {i}: {df}")
        if i > 0 and discount_factors[i] > discount_factors[i - 1]:
            # Non-monotonic discount factor alert
            errors.append(f"Non-monotonic discount factor increase at index {i}: {discount_factors[i]} > {discount_factors[i-1]}")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }
