#!/bin/bash
set -e

echo "==> Setting up StockPilot backend..."

# Create venv if not exists
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
pip install -q -r requirements.txt

# Copy .env if not present
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit DATABASE_URL if needed."
fi

# Seed demo data
echo "==> Seeding demo data..."
python -m app.seed

# Start server
echo "==> Starting FastAPI on http://0.0.0.0:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
