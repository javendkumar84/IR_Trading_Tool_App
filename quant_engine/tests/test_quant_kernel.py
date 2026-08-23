import pytest
from datetime import date
from quant_engine.daycount import year_fraction
from quant_engine.calendars import HolidayCalendar, adjust_date
from quant_engine.schedules import generate_schedule
from quant_engine.curves import bootstrap_curve, ForwardCurve
from quant_engine.pricing import price_interest_rate_swap
from quant_engine.risk import calculate_dv01
from quant_engine.pnl import calculate_pnl_attribution

def test_daycount_conventions():
    d1 = date(2026, 1, 1)
    d2 = date(2026, 7, 1)
    
    # ACT/360: 181 days / 360
    assert abs(year_fraction(d1, d2, "ACT/360") - (181.0 / 360.0)) < 1e-6
    # ACT/365: 181 days / 365
    assert abs(year_fraction(d1, d2, "ACT/365") - (181.0 / 365.0)) < 1e-6
    # 30/360: (0*360 + 6*30 + 0)/360 = 0.5
    assert abs(year_fraction(d1, d2, "30/360") - 0.5) < 1e-6

def test_calendar_roll():
    cal = HolidayCalendar("USD")
    # Saturday 2026-08-22 rolls to Monday 2026-08-24 under FOLLOWING
    sat = date(2026, 8, 22)
    adj = adjust_date(sat, "FOLLOWING", cal)
    assert adj == date(2026, 8, 24)

def test_schedule_generation():
    sched = generate_schedule(
        start_date="2026-08-23",
        end_date="2028-08-23",
        frequency="6M",
        roll_convention="UNADJUSTED",
        day_count="30/360",
        notional=1_000_000,
        rate=0.05
    )
    assert len(sched) == 4
    for period in sched:
        assert period.accrual_factor == 0.5
        assert period.cashflow == 25000.0

def test_curve_bootstrapping_and_pricing():
    quotes = {
        "ON": 0.053,
        "1M": 0.0528,
        "3M": 0.0525,
        "6M": 0.0520,
        "1Y": 0.0510,
        "2Y": 0.0485,
        "5Y": 0.0440
    }
    curve = bootstrap_curve("2026-08-23", quotes, "USD", "SOFR")
    assert curve.get_discount_factor("2026-08-23") == 1.0
    assert 0.8 < curve.get_discount_factor("2028-08-23") < 1.0

    # Price 2Y IRS @ 4.85% (matches par rate quote)
    res = price_interest_rate_swap(
        trade_id="TEST-IRS-001",
        valuation_date="2026-08-23",
        discount_curve=curve,
        notional=10_000_000,
        fixed_rate=0.0485,
        start_date="2026-08-23",
        end_date="2028-08-23"
    )
    assert res.fixed_pv > 0
    assert res.floating_pv > 0
    assert abs(res.net_pv) < 50000.0  # Near par

def test_risk_and_pnl():
    quotes = {"ON": 0.05, "1Y": 0.05, "2Y": 0.05}
    curve = bootstrap_curve("2026-08-23", quotes, "USD", "SOFR")

    risk = calculate_dv01(
        trade_id="TEST-IRS-002",
        valuation_date="2026-08-23",
        discount_curve=curve,
        trade_kwargs={
            "notional": 1_000_000,
            "fixed_rate": 0.05,
            "start_date": "2026-08-23",
            "end_date": "2028-08-23"
        }
    )
    assert risk["dv01"] > 0

    pnl_res = calculate_pnl_attribution(
        trade_id="TEST-IRS-002",
        previous_pv=10000.0,
        current_pv=12500.0,
        rate_movement_bp=2.5,
        dv01=1000.0
    )
    assert pnl_res.total_pnl == 2500.0
    assert pnl_res.reconciliation_pass is True
