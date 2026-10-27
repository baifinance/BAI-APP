#!/usr/bin/env bash
# BAI-APP single-service start script (Railway Option A: same origin)
# Runs Django backend on localhost:8000 + Next.js frontend on $PORT.
# Next.js rewrites proxy /api/* and /healthz to Django, preserving
# host-only JWT cookies on the Railway public domain.
set -euo pipefail

echo "[1/5] Installing Python dependencies..."
cd backend
python -m venv venv
./venv/bin/pip install --upgrade pip -q
./venv/bin/pip install -r requirements.txt -q

echo "[2/5] Running Django migrations..."
DJANGO_SETTINGS_MODULE=config.settings.production ./venv/bin/python manage.py migrate

echo "[3/5] Starting Django on localhost:8000..."
DJANGO_SETTINGS_MODULE=config.settings.production ./venv/bin/python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!
cd ..

echo "[4/5] Installing Node dependencies and building Next.js..."
cd Frontend
npm ci --ignore-scripts
npm run build

echo "[5/5] Starting Next.js on \$PORT..."
PORT="${PORT:-3000}" npm run start &
NEXT_PID=$!
cd ..

echo "BAI-APP single service ready (Django:8000, Next.js:\$PORT)"

# Wait for any process to exit
wait -n
