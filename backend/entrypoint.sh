#!/bin/sh
set -e

echo "Running database seed (skipped if already seeded)..."
python -m app.seed

echo "Starting StockPilot API on :8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
