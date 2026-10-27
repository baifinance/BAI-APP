#!/bin/bash
set -e

# Django backend on 127.0.0.1:8000 (internal only)
cd /app/backend
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

# Next.js frontend on 127.0.0.1:3000 (internal only)
cd /app/Frontend
PORT=3000 npm run start &
NEXT_PID=$!

# Caddy reverse proxy on Railway's $PORT (public)
cd /app
exec caddy run --config /app/Caddyfile --adapter caddyfile
