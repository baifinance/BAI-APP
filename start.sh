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
    python manage.py run_asana_worker --queue ${ASANA_QUEUE_NAME:-asana} &
# Worker 2: login-sync / backfill / reconciliation (kept off the event queue).
DJANGO_SETTINGS_MODULE=config.settings.production \
    python manage.py run_asana_worker --queue ${ASANA_QUEUE_NAME:-asana}_sync &
# Email outbox drain: delivers queued notification emails without blocking SSE/push.
(
    while true; do
        DJANGO_SETTINGS_MODULE=config.settings.production \
            python manage.py send_notification_emails --limit 50
        sleep 30
    done
) &

# Auto-sync reconciliation: every hour, scans all configured Asana projects for
# recently modified tasks and creates/updates LoanApplication rows. The command
# internally rate-limits to ~once per 25h via Redis (asana:reconcile:last_run)
# and a 1h lock (asana:reconcile:lock), so this loop is safe to run hourly.
(
    while true; do
        DJANGO_SETTINGS_MODULE=config.settings.production \
            python manage.py backfill_loan_applications --reconcile
        sleep 3600
    done
) &

# Next.js on 127.0.0.1:3000 (internal only)
cd /app/Frontend
PORT=3000 npm run start &

# Caddy reverse proxy on Railway's $PORT (public)
cd /app
caddy run --config /app/Caddyfile --adapter caddyfile &

# If any process exits, stop the container so Railway can restart it.
wait -n
