#!/usr/bin/env bash
# One-Command Startup Script for Rates Trading Quant Platform

echo "🚀 Starting Python Quant Engine Microservice on port 8000..."
venv/bin/uvicorn backend.main:app --port 8000 --host 127.0.0.1 &
QUANT_PID=$!

echo "🚀 Starting Node / Express Trading Platform on port 3000..."
npx tsx server.ts &
NODE_PID=$!

trap "kill $QUANT_PID $NODE_PID" EXIT

wait
