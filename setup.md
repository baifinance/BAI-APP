# BAI-APP Setup

Concise local setup for Windows and Linux/macOS. Backend: Django 5.2 + DRF +
Redis + Supabase Postgres. Frontend: Next.js 16. Asana is the loan-status
source of truth.

> Never commit `.env`. Copy `.env.example`, fill real secrets, and add it to
> `.gitignore`.

---

## Prerequisites

| Tool | Linux/macOS | Windows |
|------|-------------|---------|
| Python 3.10+ | `python3 --version` | Installer, check **Add Python to PATH** |
| Node 18+ | package manager or `brew install node` | Installer |
| Redis | `sudo apt install redis-server` (Debian/Ubuntu) | WSL2 Ubuntu: `sudo apt install redis-server && sudo service redis-server start`, or Docker |
| ngrok | `https://ngrok.com/download` | `ngrok.exe` on PATH |

Redis must be reachable at `localhost:6379` (`redis-cli ping` → `PONG`).

Docker Redis alternative:
```bash
docker run -d --name bai-redis -p 6379:6379 redis:7-alpine
```

---

## Backend

```bash
cd backend
python -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows PowerShell:
# venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env   # fill SECRET_KEY, DATABASE_URL, EMAIL_*, ASANA_*, etc.
python manage.py migrate
python manage.py check
python manage.py runserver
```

Key `.env` variables:

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DEBUG` | `True` locally |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` plus your ngrok/Railway host |
| `DATABASE_URL` | Supabase pooler URL |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `REDIS_QUEUE_URL` | `redis://localhost:6379/2` for RQ |
| `ASANA_ACCESS_TOKEN`, `ASANA_PROJECT_GIDS` | Asana source of truth |
| `ASANA_WEBHOOK_SECRET`, `ASANA_SECRET_ENC_KEY` | 32-byte hex values |
| `EMAIL_*` | Gmail SMTP app password for OTP |
| `GROQ_API_KEY`, `JINA_API_KEY`, `CHROMA_*` | Cloud AI (required for RAG/chat) |

---

## Frontend

```bash
cd Frontend
npm install
npm run dev   # http://localhost:3000
```

---

## Asana webhook (local, via ngrok)

1. Start Django on `:8000` and `ngrok http 8000`.
2. Temporarily enable the handshake:
   ```bash
   ASANA_WEBHOOK_HANDSHAKE_ENABLED=True python manage.py runserver
   ```
3. Register one webhook per project with a unique environment label:
   ```bash
   ASANA_WEBHOOK_HANDSHAKE_ENABLED=True python manage.py register_asana_webhook \
     --hook linux \
     --target https://<ngrok-id>.ngrok-free.dev/api/asana/webhook
   ```
   Then disable `ASANA_WEBHOOK_HANDSHAKE_ENABLED` and restart.
4. New ngrok sessions get new URLs; re-register. List/clear with
   `register_asana_webhook --list` / `--delete <WEBHOOK_GID>`.

---

## Tests

```bash
cd backend
python manage.py test loans asana_integration authentication otp --verbosity 1 --keepdb
cd ../Frontend
npx tsc --noEmit
npm run lint
```

---

## Railway deployment

Use Railway services (Config as Code is deprecated for new services; configure
via the Railway dashboard or `.railway/railway.ts`):

| Service | Root | Start command | Notes |
|---------|------|---------------|-------|
| API | `/backend` | Pre-deploy: `python manage.py migrate --noinput`; Start: `uvicorn config.asgi:application --host 0.0.0.0 --port $PORT` | Health `/healthz` |
| Asana worker | `/backend` | `python manage.py run_asana_worker` | Always-on RQ worker |
| Sync daily | `/backend` | `python manage.py backfill_loan_applications --since-hours 25` | Cron `0 3 * * *` UTC |
| Sync weekly | `/backend` | `python manage.py backfill_loan_applications --full` | Cron `0 4 * * 0` UTC |
| Frontend | `/Frontend` | `npm run build` then `npm run start -- -p $PORT` | Separate service |

Add a Railway Redis service and set `REDIS_URL`, `REDIS_CACHE_URL`, and
`REDIS_QUEUE_URL` (use Redis DB indexes 0/1/2). Set production
`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and
`DJANGO_SETTINGS_MODULE=config.settings.production`.

Register webhooks against the Railway API domain:
```bash
ASANA_WEBHOOK_HANDSHAKE_ENABLED=True python manage.py register_asana_webhook \
  --hook railway \
  --target https://<api>.up.railway.app/api/asana/webhook \
  --project <gid>
```
Turn `ASANA_WEBHOOK_HANDSHAKE_ENABLED` back off after registration.

---

## Architecture notes

- Email is the client identity. Same name + different email = separate accounts.
- Joint Asana tasks with different applicant emails create one application per
  matched active client; task status is shared across those applications.
- Unlabeled email matching is audited but disabled by default.
- Removed Asana tasks are logged and retained, not deleted.
- Webhooks are acknowledged immediately and processed by RQ workers; login
  sync for zero-application clients is best-effort and non-blocking.
