from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class MarketQuote:
    currency: str
    index_name: str
    instrument: str
    tenor: str
    bid: float
    mid: float
    ask: float
    previous: float
    change_bps: float
    source: str
    timestamp: str

DEFAULT_USD_SOFR_QUOTES: List[Dict[str, Any]] = [
    {"currency": "USD", "index_name": "SOFR", "instrument": "DEPOSIT", "tenor": "ON", "bid": 0.0531, "mid": 0.0532, "ask": 0.0533, "previous": 0.0530, "change_bps": 2.0, "source": "NY FED", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "DEPOSIT", "tenor": "1W", "bid": 0.0529, "mid": 0.0530, "ask": 0.0531, "previous": 0.0528, "change_bps": 2.0, "source": "SIFMA", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "DEPOSIT", "tenor": "1M", "bid": 0.0527, "mid": 0.0528, "ask": 0.0529, "previous": 0.0526, "change_bps": 2.0, "source": "SIFMA", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "DEPOSIT", "tenor": "3M", "bid": 0.0524, "mid": 0.0525, "ask": 0.0526, "previous": 0.0523, "change_bps": 2.0, "source": "SIFMA", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "FRA", "tenor": "6M", "bid": 0.0519, "mid": 0.0520, "ask": 0.0521, "previous": 0.0518, "change_bps": 2.0, "source": "CME", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "FUTURES", "tenor": "9M", "bid": 0.0514, "mid": 0.0515, "ask": 0.0516, "previous": 0.0513, "change_bps": 2.0, "source": "CME", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "1Y", "bid": 0.0509, "mid": 0.0510, "ask": 0.0511, "previous": 0.0508, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "2Y", "bid": 0.0484, "mid": 0.0485, "ask": 0.0486, "previous": 0.0483, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "3Y", "bid": 0.0464, "mid": 0.0465, "ask": 0.0466, "previous": 0.0463, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "5Y", "bid": 0.0439, "mid": 0.0440, "ask": 0.0441, "previous": 0.0438, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "7Y", "bid": 0.0429, "mid": 0.0430, "ask": 0.0431, "previous": 0.0428, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "10Y", "bid": 0.0424, "mid": 0.0425, "ask": 0.0426, "previous": 0.0423, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "USD", "index_name": "SOFR", "instrument": "SWAP", "tenor": "30Y", "bid": 0.0409, "mid": 0.0410, "ask": 0.0411, "previous": 0.0408, "change_bps": 2.0, "source": "BROKER", "timestamp": "2026-08-23T10:00:00Z"},
]

DEFAULT_INR_OIS_QUOTES: List[Dict[str, Any]] = [
    {"currency": "INR", "index_name": "MIBOR", "instrument": "DEPOSIT", "tenor": "ON", "bid": 0.0674, "mid": 0.0675, "ask": 0.0676, "previous": 0.0672, "change_bps": 3.0, "source": "FBIL", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "DEPOSIT", "tenor": "1M", "bid": 0.0669, "mid": 0.0670, "ask": 0.0671, "previous": 0.0668, "change_bps": 2.0, "source": "FBIL", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "OIS", "tenor": "3M", "bid": 0.0664, "mid": 0.0665, "ask": 0.0666, "previous": 0.0663, "change_bps": 2.0, "source": "NSE", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "OIS", "tenor": "6M", "bid": 0.0659, "mid": 0.0660, "ask": 0.0661, "previous": 0.0658, "change_bps": 2.0, "source": "NSE", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "OIS", "tenor": "1Y", "bid": 0.0649, "mid": 0.0650, "ask": 0.0651, "previous": 0.0648, "change_bps": 2.0, "source": "NSE", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "OIS", "tenor": "2Y", "bid": 0.0634, "mid": 0.0635, "ask": 0.0636, "previous": 0.0633, "change_bps": 2.0, "source": "CCIL", "timestamp": "2026-08-23T10:00:00Z"},
    {"currency": "INR", "index_name": "MIBOR", "instrument": "OIS", "tenor": "5Y", "bid": 0.0619, "mid": 0.0620, "ask": 0.0621, "previous": 0.0618, "change_bps": 2.0, "source": "CCIL", "timestamp": "2026-08-23T10:00:00Z"},
]
