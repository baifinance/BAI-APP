#!/usr/bin/env bash
# BAI-APP single-service start script (Railway Option A: same origin)
# Runs Django backend on localhost:8000 + Next.js frontend on $PORT.
# Next.js rewrites proxy /api/* and /healthz to Django, preserving
# host-only JWT cookies on the Railway public domain.
set -euo pipefail

cd backend
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!
cd ..

cd Frontend
PORT="${PORT:-3000}" npm run start &
NEXT_PID=$!
cd ..

echo "BAI-APP single service ready (Django:8000, Next.js:$PORT)"

# Wait for any process to exit so the container stays alive
wait -n
