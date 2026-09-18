#!/bin/sh
set -e

if [ "${SEED_DB:-false}" = "true" ]; then
    echo "Running admin database seed (SEED_DB=true)..."
    python -m app.seed
else
    echo "Skipping admin seed (set SEED_DB=true to seed demo data)."
fi

echo "Starting StockPilot Admin API on :8001..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8001
