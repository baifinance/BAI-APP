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
| Python 3.12+ | `python3 --version` | Installer, check **Add Python to PATH** |
| Node 22+ | package manager or `brew install node@22` | Installer |
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
DJANGO_SETTINGS_MODULE=config.settings.development \
  uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --reload
```

`config/asgi.py` defaults to production settings, so the explicit
`DJANGO_SETTINGS_MODULE` above is required for local development.

In a second terminal, start the Asana/RQ worker (Redis must be running):

```bash
cd backend
source venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.development \
  python manage.py run_asana_worker
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
npm ci
cp .env.example .env.local   # leave NEXT_PUBLIC_API_BASE_URL empty
npm run dev                  # http://localhost:3000
```

With `NEXT_PUBLIC_API_BASE_URL` empty, the frontend calls the same origin and
Next rewrites `/api` to `http://localhost:8000` in development. Caddy handles
the same path in the Docker/Railway deployment.

---

## Asana webhook (local, via ngrok)

1. Start uvicorn on `:8000`, the RQ worker in a second terminal, and
   `ngrok http 8000`.
2. Set `ASANA_WEBHOOK_HANDSHAKE_ENABLED=True` in `backend/.env` and restart
   uvicorn.
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
npm run build
```

The backend suite uses `DATABASE_URL`; point it at a disposable database and
Redis before running it.

---

## Docker (single service)

The root `Dockerfile` builds one image containing Django, the RQ worker,
Next.js, and Caddy. `start.sh` runs migrations, starts all processes, and exits
the container if any of them dies so Railway can restart it.

```bash
docker build -t bai-app \
  --build-arg NEXT_PUBLIC_API_BASE_URL= \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key> .

docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SECRET_KEY=<64-char-secret> \
  -e ALLOWED_HOSTS=localhost,127.0.0.1 \
  -e CORS_ALLOWED_ORIGINS=http://localhost:8080 \
  -e CSRF_TRUSTED_ORIGINS=http://localhost:8080 \
  -e DATABASE_URL=<postgres-url> \
  -e REDIS_URL=redis://host.docker.internal:6379/0 \
  -e REDIS_CACHE_URL=redis://host.docker.internal:6379/1 \
  -e REDIS_QUEUE_URL=redis://host.docker.internal:6379/2 \
  -e TURNSTILE_ENABLED=False \
  bai-app
```

Open `http://localhost:8080`. The container uses production settings, which
mark auth cookies `Secure`; use the local uvicorn/Next workflow for browser
development, or terminate TLS in front of Docker if you need login testing.
The worker starts automatically and requires Redis.

For a split deployment, set `NEXT_PUBLIC_API_BASE_URL` to the public API
origin at build time. Leave it empty for the same-origin Caddy setup.

---

## Railway deployment

Deploy the repository root as one Docker service. `railway.toml` starts
`bash start.sh`; the image runs Django on `127.0.0.1:8000`, Next on `:3000`,
the RQ worker, and Caddy on Railway's `$PORT` (same origin).

Required Railway variables:

- `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
  `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL` (Supabase)
- `REDIS_URL`, `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`
- `EMAIL_*`, `ASANA_*`, `GROQ_API_KEY`, `JINA_API_KEY`, `CHROMA_*`
- `TURNSTILE_ENABLED=True` plus a build-time
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_API_BASE_URL` empty (same origin) and passed as a Docker build
  arg; the frontend bundle reads public variables at build time

Optional maintenance jobs can run as separate Railway cron services rooted at
`backend`:

| Job | Command | Schedule |
|-----|---------|----------|
| Daily sync | `python manage.py backfill_loan_applications --since-hours 25` | `0 3 * * *` UTC |
| Weekly full sync | `python manage.py backfill_loan_applications --full` | `0 4 * * 0` UTC |

Register webhooks against the Railway service domain:
```bash
ASANA_WEBHOOK_HANDSHAKE_ENABLED=True python manage.py register_asana_webhook \
  --hook railway \
  --target https://<service>.up.railway.app/api/asana/webhook \
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
