import warnings
from fastapi.testclient import TestClient
from backend.main import app

warnings.filterwarnings("ignore", category=DeprecationWarning, module="fastapi.testclient")
client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"

def test_pricing_endpoint():
    payload = {
        "trade_id": "TEST-SWAP-101",
        "valuation_date": "2026-08-23",
        "notional": 1_000_000,
        "fixed_rate": 0.05,
        "currency": "USD"
    }
    response = client.post("/api/v1/pricing/swap", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "net_pv" in res["data"]
    assert "par_rate" in res["data"]

def test_curve_bootstrap_endpoint():
    payload = {
        "valuation_date": "2026-08-23",
        "currency": "USD",
        "index_name": "SOFR",
        "quotes": {"ON": 0.053, "1Y": 0.051, "5Y": 0.044}
    }
    response = client.post("/api/v1/curves/bootstrap", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert len(res["data"]["points"]) == 3

def test_risk_endpoint():
    payload = {
        "trade_id": "TEST-SWAP-101",
        "valuation_date": "2026-08-23",
        "notional": 1_000_000,
        "fixed_rate": 0.05
    }
    response = client.post("/api/v1/risk/dv01", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "parallel" in res["data"]
    assert "bucketed" in res["data"]

def test_pnl_endpoint():
    payload = {
        "trade_id": "TEST-SWAP-101",
        "previous_pv": 10000.0,
        "current_pv": 12500.0,
        "rate_movement_bp": 2.5,
        "dv01": 1000.0
    }
    response = client.post("/api/v1/pnl/attribution", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["reconciliation_pass"] is True
