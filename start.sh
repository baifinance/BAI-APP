#!/bin/bash
set -euo pipefail

cleanup() {
    kill $(jobs -p) 2>/dev/null || true
}
trap 'cleanup; exit 0' TERM INT
trap cleanup EXIT

# Django on 127.0.0.1:8000 (internal only)
cd /app/backend
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.production \
    uvicorn config.asgi:application --host 127.0.0.1 --port 8000 &
DJANGO_SETTINGS_MODULE=config.settings.production \
    python manage.py run_asana_worker &

# Next.js on 127.0.0.1:3000 (internal only)
cd /app/Frontend
PORT=3000 npm run start &

# Caddy reverse proxy on Railway's $PORT (public)
cd /app
caddy run --config /app/Caddyfile --adapter caddyfile &

# If any process exits, stop the container so Railway can restart it.
wait -n
