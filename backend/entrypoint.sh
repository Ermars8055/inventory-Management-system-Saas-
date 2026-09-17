#!/bin/sh
set -e

echo "Running database migrations..."
python -m app.migrate

if [ "${SEED_DB:-false}" = "true" ]; then
    echo "Running database seed (SEED_DB=true)..."
    python -m app.seed
else
    echo "Skipping seed (set SEED_DB=true to seed demo data)."
fi

echo "Starting StockPilot API on :8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
