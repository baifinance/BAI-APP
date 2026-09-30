# BAI-APP Setup Guide

Local development setup for the **BAI Backend Loan Pipeline** application:
Django REST backend + Next.js frontend + Redis-powered live notifications, with
Asana as the loan-status source of truth.

> **No real credentials in this file.** Copy `.env.example` and fill in your own
> secrets — `.env` is gitignored and must never be committed.

---

## Architecture overview

| Layer      | Tech                                              | Runs on                    |
| ---------- | ------------------------------------------------- | -------------------------- |
| Backend    | Django 4.2, Django REST Framework                 | `http://127.0.0.1:8000`    |
| Frontend   | Next.js (App Router), React, Tailwind             | `http://localhost:3000`    |
| Cache/SSE  | Redis (`pub/sub` → live notification stream)      | `localhost:6379`           |
| Database   | Postgres on **Supabase** (remote, via `DATABASE_URL`) | —                      |
| AI         | **Cloud-only**: Groq (LLM chat), Jina (embeddings), Chroma Cloud (vector store) | — |
| Webhook    | Asana events → `ngrok` tunnel → Django receiver   | `https://<id>.ngrok-free.dev/api/asana/webhook` |

Notification flow: Asana task moved to a pipeline section → webhook (or broker
save) creates a `loan_status` notification → Redis publishes to the client's SSE
channel → the client portal shows an in-app toast **and** a desktop notification
when the tab is unfocused.

---

## Prerequisites

### Linux / macOS

- **Python 3.10+** (`python3 --version`)
- **Node.js 18+** (`node --version`) — recommended 22 LTS
- **Redis** — install and start:
  ```bash
  # Debian/Ubuntu
  sudo apt install redis-server
  sudo systemctl enable --now redis-server
  redis-cli ping        # → PONG
  ```
- **ngrok** (only needed for Asana webhooks): `https://ngrok.com/download`,
  then
  ```bash
  ngrok config add-authtoken <YOUR_TOKEN>
  ```

### Windows

- **WSL2 + Ubuntu** (for Redis):
  ```powershell
  wsl --install
  ```
  Then inside Ubuntu:
  ```bash
  sudo apt update && sudo apt install -y redis-server
  sudo service redis-server start
  redis-cli ping        # → PONG
  ```
  WSL2 forwards `localhost:6379` to Windows automatically — no extra config.
- **Node.js 18+** (Windows installer) — https://nodejs.org
- **Python 3.10+** (Windows installer) — check **"Add Python to PATH"**
- **ngrok for Windows**: download the zip, extract `ngrok.exe`, add its folder
  to your PATH, then `ngrok config add-authtoken <YOUR_TOKEN>`.

---

## 1. Backend setup

```bash
cd backend
python -m venv venv            # create virtualenv
venv/bin/python -m pip install --upgrade pip
venv/bin/python -m pip install -r requirements.txt
cp .env.example .env           # then fill in real values (see below)
venv/bin/python manage.py migrate
venv/bin/python manage.py check
venv/bin/python manage.py runserver
```

**Windows:** skip the manual venv work — double-click `backend_start.bat`
(creates `.venv`, installs deps, migrates, starts the server).

### Environment variables (`.env`)

Minimum required for a working app:

| Variable          | What it's for                                     |
| ----------------- | ------------------------------------------------- |
| `SECRET_KEY`      | Django secret — 64 random chars (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) |
| `DEBUG`           | `True` for local dev                              |
| `ALLOWED_HOSTS`   | `localhost,127.0.0.1` + your current ngrok domain |
| `DATABASE_URL`    | Supabase Postgres pooler URL                       |
| `EMAIL_*`         | Gmail SMTP app-password for OTP emails            |
| `GROQ_API_KEY`    | LLM chat (loan-flow assistant)                     |
| `JINA_API_KEY`    | **Required** — RAG embeddings are cloud-only      |
| `CHROMA_*`        | Chroma Cloud tenant/database/API key              |
| `REDIS_URL`       | `redis://localhost:6379/0` by default              |
| `ASANA_ACCESS_TOKEN`, `ASANA_PROJECT_GID` | Asana connection                   |

### Optional Redis via Docker

```bash
docker run -d --name bai-redis -p 6379:6379 redis:7-alpine
```

---

## 2. Frontend setup

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The client portal is at
`/client/login` → `/client/loan-status`, the broker app at `/broker`.

---

## 3. Asana webhook + ngrok

The live loan-status path is: **move a task in Asana → webhook → notification**.

1. Start the Django server on `:8000`.
2. Start a tunnel:
   ```bash
   ngrok http 8000          # URL looks like https://<id>.ngrok-free.dev
   ```
3. Register the webhook with Asana:
   ```bash
   cd backend
   venv/bin/python manage.py register_asana_webhook \
     --target https://<id>.ngrok-free.dev/api/asana/webhook
   ```
   The endpoint accepts both `/api/asana/webhook` and `/api/asana/webhook/`
   (Asana sends the URL without a trailing slash).

4. **Verify the handshake** before moving tasks:
   ```bash
   curl -s -D - -o /dev/null -X POST https://<id>.ngrok-free.dev/api/asana/webhook \
     -H 'X-Hook-Secret: test-secret'
   # expect: HTTP 200 + X-Hook-Secret echoed back
   ```

5. **Every new ngrok session = a new URL** → re-register. If Asana reports the
   webhook already exists, delete it first:
   ```bash
   venv/bin/python manage.py register_asana_webhook --delete <WEBHOOK_GID>
   ```

> `ASANA_WEBHOOK_ENABLED=True` must stay set in `.env`.

---

## 4. Smoke checks

| Check | Command | Expect |
| ----- | ------- | ------ |
| Python deps consistent | `venv/bin/python -m pip check` | `No broken requirements found.` |
| Django config | `venv/bin/python manage.py check` | `0 silenced` |
| Asana logic tests | `venv/bin/python test_section.py` | `Ran 14 tests … OK` |
| Webhook event trace | `tail -f /tmp/asana_events.log` (Linux) | new `RAW EVENT` + `Asana event processed …` lines after a board move |
| Frontend types | `cd Frontend && npx tsc --noEmit` | exits 0 |
| Frontend lint (audited files) | `cd Frontend && npx eslint src/app/client/notifications/page.tsx src/app/client/ClientContext.tsx src/lib/api.ts` | 3 pre-existing `react-hooks/set-state-in-effect` errors + 1 warning, nothing else |
| Live notification | Move a task in Asana to a pipeline section | toast in client portal; desktop pop-up when tab unfocused (after clicking **Enable** on `/client/notifications`) |

> `npx eslint src` over the whole repo also reports pre-existing issues in
> broker/compliance pages that predate this setup — don't treat them as
> regressions from these changes.

---

## 5. Troubleshooting

| Problem | Fix |
| ------- | --- |
| Webhook registration returns **400 / "incorrect status code: 500"** | Old trailing-slash regression — use the no-slash URL `/api/asana/webhook` (route exists); reload Django if you just edited `urls.py`. |
| Handshake curl returns non-200 | Tunnel down (`ngrok` died) or the server isn't on `:8000`. Check `curl http://127.0.0.1:8000/api/asana/webhook` locally first. |
| No events after a board move | Check `/tmp/asana_events.log`; confirm webhook was re-registered for the **current** ngrok URL; move the task to a section that exists in the 16-stage pipeline. |
| Duplicate notifications on one move | Asana keeps old webhooks alive even after their ngrok URL dies. Prune stale ones: list with the SDK (`get_webhooks(workspace_gid, ...)` — project's workspace in `get_project`), then `venv/bin/python manage.py register_asana_webhook --delete <WEBHOOK_GID>` for every target that isn't your current tunnel. |
| Client never gets toasts | Redis down → `redis-cli ping`; the frontend falls back to a 30s poll, so streams reconnect but live updates stop. |
| Live updates work but no **desktop** pop-up | Click **Enable** on `/client/notifications`; permission must be `granted`; the pop-up only fires while that tab is **unfocused** and is deduped for 5s. |
| OTP emails not arriving | SMTP keys in `.env` (Gmail app password, not your login password) and `EMAIL_BACKEND` set. |
| Port 8000/3000 busy | `ss -ltnp \| rg ':8000|:3000'` to find the holder; stop it or change ports. |
| `JINA_API_KEY` missing errors on RAG | Set it — `get_embeddings_batch` raises by design; there is no local embedding fallback anymore (torch/transformers were removed). |
| Windows: Redis not reachable | In Ubuntu: `sudo service redis-server start`; confirm `redis-cli ping` inside WSL, then retry from Windows. |

---

## Notes

- **AI is cloud-only.** `requirements.txt` intentionally excludes
  `torch`/`transformers`/`sentence-transformers`/CUDA. Groq = chat, Jina =
  embeddings, Chroma Cloud = vector store; each needs its API key in `.env`.
- Backend runs against **remote Supabase Postgres** — no local Postgres needed.
- `frontend/.env` is not required; the Next app talks to the Django API on
  `localhost:8000` and the dev proxy handles the rest.