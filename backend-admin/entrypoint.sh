#!/bin/sh
set -e

echo "Running admin database seed (skipped if already seeded)..."
python -m app.seed

echo "Starting StockPilot Admin API on :8001..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8001
