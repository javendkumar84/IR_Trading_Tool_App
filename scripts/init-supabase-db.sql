-- Supabase / PostgreSQL Schema DDL Script
-- Execute this script in your Supabase SQL Editor (https://supabase.com)

-- 1. Trades Table
CREATE TABLE IF NOT EXISTS trades (
    trade_id VARCHAR(50) PRIMARY KEY,
    book VARCHAR(50) NOT NULL,
    trader VARCHAR(100) NOT NULL,
    counterparty_lei VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    notional NUMERIC(15, 2) NOT NULL,
    fixed_rate NUMERIC(8, 6) NOT NULL,
    float_index VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Market Data Quotes Table
CREATE TABLE IF NOT EXISTS market_quotes (
    id SERIAL PRIMARY KEY,
    quote_key VARCHAR(50) UNIQUE NOT NULL,
    currency VARCHAR(10) NOT NULL,
    tenor VARCHAR(10) NOT NULL,
    bid_rate NUMERIC(8, 6) NOT NULL,
    mid_rate NUMERIC(8, 6) NOT NULL,
    ask_rate NUMERIC(8, 6) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    object_type VARCHAR(50) NOT NULL,
    object_id VARCHAR(50) NOT NULL,
    details TEXT
);

-- Insert Default Seed Market Quotes
INSERT INTO market_quotes (quote_key, currency, tenor, bid_rate, mid_rate, ask_rate)
VALUES 
    ('USD_ON', 'USD', 'ON', 0.0529, 0.0530, 0.0531),
    ('USD_1M', 'USD', '1M', 0.0524, 0.0525, 0.0526),
    ('USD_3M', 'USD', '3M', 0.0514, 0.0515, 0.0516),
    ('USD_6M', 'USD', '6M', 0.0494, 0.0495, 0.0496),
    ('USD_1Y', 'USD', '1Y', 0.0474, 0.0475, 0.0476),
    ('USD_2Y', 'USD', '2Y', 0.0449, 0.0450, 0.0451),
    ('USD_5Y', 'USD', '5Y', 0.0419, 0.0420, 0.0421),
    ('USD_10Y', 'USD', '10Y', 0.0409, 0.0410, 0.0411),
    ('USD_30Y', 'USD', '30Y', 0.0404, 0.0405, 0.0406)
ON CONFLICT (quote_key) DO NOTHING;
