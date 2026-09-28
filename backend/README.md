# BAI-APP — Backend

> Mortgage & brokerage platform backend — Django REST API for loan applications, client/broker workflows, document management, appointment scheduling, and real-time notifications.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.2-092E20?style=flat&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.17-004C99?style=flat&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-8.x-DC382D?style=flat&logo=redis&logoColor=white)

---

## Table of Contents

- [Overview](#overview)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Folder Structure](#folder-structure)
- [Database & Migrations](#database--migrations)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Integrations](#integrations)
- [Management Commands](#management-commands)
- [Preseeded Accounts](#preseeded-accounts)
- [Current Status](#current-status)
- [Known Issues](#known-issues)
- [Development & Testing](#development--testing)
- [License](#license)

---

## Overview

BAI-APP is a Django REST Framework backend for a mortgage brokerage platform. It covers the full journey from account provisioning to loan status tracking:

| Subsystem | App | Purpose |
| --- | --- | --- |
| **Identity** | `users` | Custom `User` (UUID PK, email login) with `ClientProfile` / `BrokerProfile` role extensions |
| **Access control** | `authentication` | Invitation lifecycle, loan-processing staff accounts, custom permissions, audit writes |
| **Multi-factor** | `otp` | Redis-backed one-time passwords for login 2FA, password reset, and MFA enrolment |
| **Loans** | `loans` | `LoanApplication` lifecycle — status is read from and written to Asana, not the database |
| **Scheduling** | `bookings` | Broker-published `AvailableSlot` inventory, client `Booking` claims, no double-booking |
| **Documents** | `document_center` | Document metadata per loan application (storage layer not yet wired) |
| **Messaging log** | `communications` | Email / SMS / in-app `CommunicationLog` (model only, no endpoints yet) |
| **Audit** | `audit` | System-wide `AuditLog` of privileged actions |
| **Real-time** | `notifications` | Persistent `Notification` rows + a Redis-pubsub **SSE** stream pushed to the browser |
| **AI** | `ai_assistant` | RAG chat — ChromaDB vector retrieval + Groq generation over a BAI knowledge base |
| **PM integration** | `asana_integration` | Reads loan status from Asana; receives `task.changed` webhooks to drive notifications |
| **Health** | `health` | Unauthenticated `GET /healthz` liveness probe |

### User roles

`UserRole` is a three-value `TextChoices` enum (`apps/users/choices.py`). There is **no** `admin` or `compliance` role.

| Value | Label | Notes |
| --- | --- | --- |
| `client` | Client | Borrower; gets a `ClientProfile`; can book, read own loans, chat with the AI |
| `broker` | Broker | Licensed advisor; gets a `BrokerProfile` + `license_no`; publishes slots |
| `loan_processing` | Loan Processing | Back-office staff. Gated by `IsLoanProcessingTeam`. Replaces the old `compliance` role — see [Preseeded Accounts](#preseeded-accounts) |

Django's built-in `is_staff` / `is_superuser` still control access to `/admin/`.

---

## Architecture at a Glance

### App imports are top-level, not `apps.`-prefixed

`config/settings/base.py:18` does:

```python
sys.path.insert(0, str(BASE_DIR / "apps"))
```

so `apps/` is injected onto `sys.path` and apps import each other as `from users.models import User` — **not** `from apps.users.models import User`. This is why `INSTALLED_APPS` lists bare `"users"`, `"loans"`, etc., and why `config/urls.py` inconsistently prefixes two imports (`from apps.bookings.views import BrokerListView`, `from apps.health.views import HealthView`), which only resolves via PEP 420 namespace packages. Match the top-level style when adding imports.

### Authentication: HttpOnly JWT cookies

`dj-rest-auth` + `djangorestframework-simplejwt`. Login writes `jwt-access-token` and `jwt-refresh-token` as `HttpOnly`, `SameSite=Lax` cookies (production overrides to `SameSite=Strict` + `Secure`). `LoginView` pops `refresh` from the response body always, and pops `access` too unless `DEBUG` — so in development the access token is readable by JS for debugging, and in production it never leaves the cookie jar.

```
POST /api/auth/login/          → sets cookies, returns {user, …}
GET  /api/bookings/            → JWTCookieAuthentication reads jwt-access-token
POST /api/auth/token/refresh/  → rotates refresh cookie
```

Access tokens live 15 minutes, refresh tokens 7 days, with rotation and blacklisting enabled.

### MFA: Redis, not the database

`otp` has no models. All OTP state lives in Redis (`apps/otp/utils.py`):

| Key | TTL | Purpose |
| --- | --- | --- |
| `otp:{purpose}:{email}` | `OTP_TTL` (180s) or `OTP_LOGIN_EXPIRY` (120s for `login_2fa`) | The code itself, `setex` |
| `otp_verified:{user_id}` | `OTP_VERIFIED_FLAG_TTL` (4h) | "Already passed 2FA" flag set by `mark_otp_verified()` |
| `notify:{user_id}` | — | Pub/sub channel backing the SSE stream |
| `asana_task:{gid}` / `asana_section:{gid}` | 24h | Memoised Asana lookups |

`IsOtpVerified` is a permission class, not middleware: it passes when `user.mfa_enabled` is `False`, otherwise it requires the Redis flag. It guards all of `bookings`, `notifications`, and `users.profile`. A wrong code costs a strike; three strikes lock the key.

`redis` is imported at module load, so **Redis must be running or the app will not boot** — this is not an optional dependency.

### Notifications: DB rows + SSE

Every notification is written twice: a durable `Notification` row (so history and unread counts work) and a JSON payload published to Redis `notify:{user_id>`, which `NotificationStreamView` relays to the browser as Server-Sent Events. Producers are the MFA views, `loans.LoanStatusUpdateView`, and `asana_integration.handle_task_moved_event`.

SSE rather than WebSockets keeps this a single long-lived `GET` with no extra server. The stream emits an `event: snapshot` on connect, `event: notification` per message, and `: keepalive` comments every 25s, with `X-Accel-Buffering: no` to defeat proxy buffering.

### Loan status lives in Asana, not Postgres

This is the most surprising design decision in the codebase. `loans` exposes only two endpoints and neither writes to the database:

- `GET /api/loans/current-status/` — reads the client's current section from Asana live (client role only).
- `PATCH /api/loans/status/` — moves the Asana task between sections, then fires a notification.

`LoanApplication.status` exists in the schema and is indexed, but the Asana integration is the source of truth for status. `ASANA_PROFILE_LOOKUP_ENABLED` gates the lookups and defaults to `False`.

### No async task queue

There is no Celery, no `tasks.py`, and no `signals.py` anywhere. All `AuditLog` writes are explicit calls in `apps/authentication/views.py`. The only background work is the `ai_assistant` management command and the SSE keepalive loop.

---

## Tech Stack

`requirements.txt` is a **fully pinned 138-line lockfile** (`pip freeze` output), so it pulls in transitive ML and infrastructure packages that this project does not use directly. The table below separates what the code actually imports from what arrives as a dependency.

### Core

| Technology | Version | Purpose |
| --- | --- | --- |
| Python | 3.12.x | Runtime (venv is 3.12.3) |
| Django | 4.2.30 | Web framework |
| djangorestframework | 3.17.2 | REST toolkit |
| dj-rest-auth | 7.2.0 | Auth views, JWT cookie plumbing |
| djangorestframework-simplejwt | 5.5.1 | Token issue / rotate / verify |
| PyJWT | 2.13.0 | Token signing |
| psycopg | 3.3.4 | PostgreSQL adapter (3.x, async-capable) |
| dj-database-url | 3.1.2 | Parses `DATABASE_URL` |
| django-environ | 0.14.0 | Typed env-var access |
| django-cors-headers | 4.9.0 | CORS for the frontend |
| PostgreSQL | — | Database, hosted on Supabase |

> [!NOTE]
> `python-decouple==3.8` is pinned in `requirements.txt` but no module imports it. Settings use `django-environ` plus plain `os.getenv`.

### Real-time & infrastructure

| Technology | Version | Purpose |
| --- | --- | --- |
| redis (py) | 8.1.0 | OTP store, pub/sub for SSE, Asana lookup cache |
| uvicorn | 0.52.4 | ASGI server (optional; `runserver` is the dev path) |
| kubernetes | 36.0.3 | Client lib — not imported by any app |
| opentelemetry-* | 1.44.0 | SDK/exporter packages — **no instrumentation configured** |

### AI / RAG

| Technology | Version | Purpose |
| --- | --- | --- |
| chromadb | 1.5.9 | Vector store (Cloud, or embedded `PersistentClient`) |
| groq | 1.7.0 | Chat completion for RAG answers |
| sentence-transformers | 6.0.1 | Local embedding fallback (`all-mpnet-base-v2`, 768-d) |
| torch / transformers / tokenizers | 2.14.0 / 5.16.1 / 0.23.2 | Local embedding runtime |
| onnxruntime | 1.29.0 | CPU inference accelerator for embeddings |
| numpy / scipy / scikit-learn | 2.5.2 / 1.18.1 / 1.9.0 | Vector maths |

> [!WARNING]
> The AI stack alone accounts for 31 of the 138 pinned packages. `requirements-ai.txt` does not exist yet — splitting it out would cut install time and image size substantially.

### Integrations

| Technology | Version | Purpose |
| --- | --- | --- |
| asana | 5.3.0 | Official Asana API client |
| requests | 2.34.2 | Jina embeddings HTTP call, `Retry` adapter |

---

## Prerequisites

**Required:**

- **Python 3.12+** — [Download](https://www.python.org/downloads/) (3.11 also works in practice; `requirements.txt` is not 3.13/3.14-pinned)
- **PostgreSQL 12+** — local install or a [Supabase](https://supabase.com) project
- **Redis 6+** — via `redis-server` or Docker. **Not optional** — `apps/otp/utils.py` connects at import time.
- **Git** — [Download](https://git-scm.com/)

**Optional** (only for the features named):

- **Groq API key** — enables `POST /api/ai/chat/`
- **Chroma Cloud credentials** *or* ~1 GB disk — enables the AI assistant. Without keys, Chroma falls back to an embedded store at `backend/data/chromadb/`.
- **Jina API key** — improves embeddings. Unset → local `sentence-transformers` model, which is much slower and pulls ~2 GB of weights.
- **Asana access token + project GID** — enables `/api/loans/*` and `/api/asana/webhook/`
- **SMTP credentials** — invitation and OTP emails. Without them, both fail (`fail_silently=False`).

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/BAI-APP.git
cd BAI-APP/backend
```

### 2. Start PostgreSQL and Redis

Any local install works. For a throwaway Redis via Docker:

```bash
docker run -d --name bai-redis -p 6379:6379 redis:7-alpine
```

Confirm both are reachable before continuing — `redis-cli ping` should print `PONG`.

### 3. Create your `.env` file

```bash
cp .env.example .env        # macOS / Linux / Git Bash
copy .env.example .env      # Windows CMD
```

### 4. Create and activate a virtual environment

```bash
python -m venv venv
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```bash
venv\Scripts\activate.bat
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

> [!TIP]
> The pinned ML stack (torch, transformers, chromadb) is large. If you are not working on the AI assistant, `pip install -r <(grep -viE '^(torch|triton|nvidia-|transformers|tokenizers|onnxruntime|chromadb|sentence-transformers)' requirements.txt)` gives you a working API in a fraction of the time — but `/api/ai/chat/` will not work.

### 6. Configure `.env`

At minimum set these four, or the app will not start:

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=<64+ random chars — python -c "import secrets; print(secrets.token_urlsafe(64))">
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://postgres.your-ref:YOUR_PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

See [Environment Variables](#environment-variables) for the full set. `.env` is git-ignored — never commit it.

### 7. Run database migrations

```bash
python manage.py migrate
```

This creates all tables and seeds the default **loan-processing administrator** — see [Preseeded Accounts](#preseeded-accounts).

### 8. (Optional) Seed the AI knowledge base

Only if you configured Groq/Chroma and want `/api/ai/chat/` to return real answers:

```bash
python manage.py ingest_rag
```

### 9. Create a superuser (optional)

```bash
python manage.py createsuperuser
```

The custom `User` model requires `username` in addition to `email`.

### 10. Start the development server

```bash
python manage.py runserver
```

The API is at `http://127.0.0.1:8000`, the admin at `http://127.0.0.1:8000/admin/`.

> **Windows shortcut:** `backend_start.bat` automates steps 4–10 (venv, install, migrate, runserver). There is no Linux/macOS equivalent.

---

## Environment Variables

Read from `backend/.env` by `django-environ` and `os.getenv`. Grouped by feature; optional variables list their code-level default.

### Core

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | ✅ | Which settings module to load | `config.settings.development` |
| `SECRET_KEY` | ✅ | Cryptographic signing key; also the JWT `SIGNING_KEY` | — (no default, raises) |
| `DEBUG` | ✅ | Debug mode | `False` |
| `ALLOWED_HOSTS` | ✅ | Comma-separated allowed hosts | `localhost,127.0.0.1,testserver` |
| `DATABASE_URL` | ✅ | PostgreSQL URL, parsed by `dj-database-url` | — (raises) |
| `FRONTEND_BASE_URL` | | Base URL in invitation activation links | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | | Comma-separated CORS origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `REDIS_URL` | | Redis connection string | `redis://localhost:6379/0` |

> [!IMPORTANT]
> `CORS_ALLOWED_ORIGINS` is read by `config/settings/base.py:50` but is **absent from `.env.example`**. Add it manually if your frontend is not on port 3000 — otherwise every browser request fails CORS.

### Email

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `EMAIL_HOST` | ✅¹ | SMTP host | — |
| `EMAIL_PORT` | ✅¹ | SMTP port | `587` |
| `EMAIL_USE_TLS` | ✅¹ | Enable STARTTLS | `True` |
| `EMAIL_HOST_USER` | ✅¹ | SMTP username | — |
| `EMAIL_HOST_PASSWORD` | ✅¹ | SMTP app password | — |
| `DEFAULT_FROM_EMAIL` | | Sender shown in emails | `BAI Finance <no-reply@baifinance.com>` |
| `SERVER_EMAIL` | | Server error sender | mirrors `DEFAULT_FROM_EMAIL` |

¹ Required to actually send mail. See [Known Issues #2](#known-issues) — the `EMAIL_BACKEND` variable is not honoured, so there is no console-backend escape hatch.

### OTP / MFA

| Variable | Description | Default |
| :--- | :--- | :--- |
| `OTP_SIZE` | Digit count of generated codes | `6` |
| `OTP_TTL` | Code lifetime, seconds (non-login purposes) | `180` |
| `OTP_LOGIN_EXPIRY` | Code lifetime for `login_2fa`, seconds | `120` |
| `OTP_VERIFIED_FLAG_TTL` | How long the "2FA passed" flag lives, seconds | `14400` (4h) |

### Asana

| Variable | Description | Default |
| :--- | :--- | :--- |
| `ASANA_PROFILE_LOOKUP_ENABLED` | Master switch for Asana profile lookup | `False` |
| `ASANA_ACCESS_TOKEN` | Personal access token / service-account token | `""` |
| `ASANA_PROJECT_GID` | Project containing the loan tasks | `""` |
| `ASANA_WEBHOOK_ENABLED` | Required by `manage.py register_asana_webhook` | `False` |

> [!NOTE]
> `ASANA_REQUEST_TIMEOUT` appears in `.env.example` but is **never read by any code**. It is safe to delete.

### AI / RAG

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq API key; unset → `/api/ai/chat/` returns 500 | — |
| `GROQ_MODEL` | Generation model | code default `llama3-8b-8192`; `.env.example` sets `openai/gpt-oss-120b` |
| `CHROMA_API_KEY` | Chroma Cloud key; unset → embedded store | — |
| `CHROMA_TENANT` | Chroma Cloud tenant | — |
| `CHROMA_DATABASE` | Chroma Cloud database | — |
| `JINA_API_KEY` | Jina embeddings key; unset → local model fallback | — |

All three Chroma vars must be set together to use Chroma Cloud; otherwise `chromadb.PersistentClient` writes to `backend/data/chromadb/`.

---

## Folder Structure

```
BAI-APP/
├── backend/
│   ├── manage.py                     # Django entry point
│   ├── requirements.txt              # Fully pinned deps (138)
│   ├── backend_start.bat             # Windows-only one-click startup
│   ├── .env                          # Local config — git-ignored
│   ├── .env.example                  # Template (32 vars)
│   ├── endpoints.md                  # Detailed auth endpoint reference
│   ├── sbom.json                     # CycloneDX SBOM, 137 components
│   ├── test_section.py               # Standalone Asana service tests (not in suite)
│   │
│   ├── config/
│   │   ├── urls.py                   # Root router — 10 include() entries
│   │   ├── wsgi.py / asgi.py
│   │   └── settings/
│   │       ├── base.py               # All shared config (252 lines)
│   │       ├── development.py        # DEBUG=True, dev LOGGING
│   │       └── production.py         # DEBUG=False, SSL/HSTS, secure cookies
│   │
│   ├── common/                       # Empty — __init__.py only
│   │
│   └── apps/                         # NOT a package; on sys.path (see Architecture)
│       ├── users/                    # User, ClientProfile, BrokerProfile
│       │   ├── models/{user,profiles}.py
│       │   ├── choices.py            # UserRole, UserStatus, VerificationStatus
│       │   ├── serializers.py, views.py, urls.py, admin.py
│       │   └── migrations/           # 0001–0005
│       │
│       ├── authentication/            # Invitations + LP staff accounts
│       │   ├── models/invitation.py
│       │   ├── choices.py            # InviteStatus
│       │   ├── permissions.py        # IsLoanProcessingTeam, IsOtpVerified, …
│       │   ├── views.py              # LoginView, SendInviteView, accept/validate
│       │   ├── urls.py, auth_urls.py # auth_urls.py is DEAD — never included
│       │   ├── templates/send_invite.html
│       │   └── migrations/           # 0001–0003
│       │
│       ├── otp/                      # Redis-backed OTP — no models
│       │   ├── utils.py              # redis_client, generate/verify, strike lockout
│       │   ├── services.py           # HTML email via templates/send_otp.html
│       │   ├── serializers.py, views.py, urls.py
│       │   ├── templates/send_otp.html
│       │   └── migrations/           # Empty
│       │
│       ├── bookings/                 # AvailableSlot, Booking
│       │   ├── models/{booking,available_slot}.py
│       │   ├── choices.py            # BookingStatus
│       │   ├── serializers.py, views.py, urls.py, admin.py
│       │   └── migrations/           # 0001–0004
│       │
│       ├── loans/                    # LoanApplication
│       │   ├── models/loan_application.py
│       │   ├── choices.py            # ApplicationStatus
│       │   ├── views.py              # Asana-backed status read/move
│       │   ├── urls.py               # No serializers.py — inline in views
│       │   └── migrations/           # 0001–0002
│       │
│       ├── notifications/            # Notification + SSE stream
│       │   ├── models/notification.py
│       │   ├── choices.py            # NotificationType
│       │   ├── services.py           # create + publish to Redis
│       │   ├── serializers.py, views.py, urls.py
│       │   └── migrations/           # 0001
│       │
│       ├── ai_assistant/             # RAG chat — no models
│       │   ├── services/rag_service.py   # Chroma + Jina/local + Groq
│       │   ├── management/commands/ingest_rag.py
│       │   ├── serializers.py, views.py, urls.py
│       │   └── migrations/           # Absent
│       │
│       ├── asana_integration/        # Asana read + webhook — no models
│       │   ├── services/asana.py     # 526 lines — profile, sections, webhook
│       │   ├── management/commands/register_asana_webhook.py
│       │   ├── views.py, urls.py
│       │   └── migrations/           # Absent
│       │
│       ├── document_center/          # Document — models only
│       │   ├── models/document.py
│       │   ├── views.py              # Stub (render import)
│       │   └── migrations/           # 0001–0003
│       │
│       ├── communications/           # CommunicationLog — models only
│       │   ├── models/communication_log.py
│       │   ├── choices.py            # CommunicationsChannel
│       │   ├── views.py              # Stub
│       │   └── migrations/           # 0001–0003
│       │
│       ├── audit/                    # AuditLog — models + admin only
│       │   ├── models/audit_log.py
│       │   ├── admin.py
│       │   ├── views.py              # Stub
│       │   └── migrations/           # 0001–0002
│       │
│       └── health/                   # HealthView — not in INSTALLED_APPS
│           ├── models.py             # Stub
│           ├── views.py              # HealthView
│           └── migrations/           # Empty
```

---

## Database & Migrations

### Connection

PostgreSQL via `psycopg` 3.x, URL parsed from `DATABASE_URL` by `dj-database-url`. `CONN_MAX_AGE=0` (new connection per request, right for Supabase's pooler) with `CONN_HEALTH_CHECKS=True`.

### Migration inventory

**23 migrations across 8 apps.** The project root (`backend/`) has no migrations.

| App | Migrations | Count |
| :--- | :--- | ---: |
| `users` | `0001_initial`, `0002_auto_20260824_1151`, `0003_alter_user_role`, `0004_fix_compliance_to_loan_processing`, `0005_auto_20260909_0000` | 5 |
| `bookings` | `0001_initial`, `0002_initial`, `0003_booking_consultation_type_…`, `0004_availableslot_and_more` | 4 |
| `authentication` | `0001_initial`, `0002_initial`, `0003_alter_invitation_options_and_more` | 3 |
| `communications` | `0001_initial`, `0002_initial`, `0003_initial` | 3 |
| `document_center` | `0001_initial`, `0002_initial`, `0003_initial` | 3 |
| `loans` | `0001_initial`, `0002_initial` | 2 |
| `audit` | `0001_initial`, `0002_initial` | 2 |
| `notifications` | `0001_initial` | 1 |

Tables created, in dependency order:

`users`, `client_profiles`, `broker_profiles` → `invitations` → `loan_applications` → `bookings`, `available_slots` → `communication_logs` → `documents` → `audit_logs` → `notifications`

### Command reference

| Command | Description |
| :--- | :--- |
| `python manage.py migrate` | Apply all pending migrations |
| `python manage.py migrate <app>` | Apply one app's migrations |
| `python manage.py makemigrations <app>` | Generate migrations after a model change |
| `python manage.py showmigrations` | List migrations and their state |
| `python manage.py sqlmigrate <app> <n>` | Print the SQL for one migration |
| `python manage.py migrate <app> <target>` | Roll back (e.g. `migrate bookings 0002` to undo `0003`/`0004`) |
| `python manage.py makemigrations --check --dry-run` | CI guard: exit non-zero if models drifted |

---

## Database Schema

10 models across 8 apps. All primary keys are `UUIDField(default=uuid.uuid4)`.

### `users.User` → `users`

`AbstractUser` subclass, `USERNAME_FIELD = "email"`, `REQUIRED_FIELDS = ["username"]`.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | `editable=False` |
| `email` | EmailField | **unique**, login identifier |
| `username` | CharField(150) | unique; inherited from `AbstractUser` |
| `password` | CharField(128) | inherited, hashed |
| `first_name` / `last_name` | CharField(150) | optional |
| `role` | CharField(20) | `UserRole` — **no default**, required |
| `status` | CharField(20) | `UserStatus`, default `active` |
| `mfa_enabled` | BooleanField | default `False`; gates `IsOtpVerified` |
| `invited_by` | FK → User | `null`, `SET_NULL`, `related_name="invited_users"` |
| `is_staff` / `is_superuser` / `is_active` | BooleanField | inherited; control `/admin/` |
| `last_login` / `date_joined` | DateTimeField | inherited |
| `created_at` / `updated_at` | DateTimeField | `auto_now_add` / `auto_now` |

Inherited M2M: `groups`, `user_permissions`.

### `users.ClientProfile` → `client_profiles`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `user` | OneToOne → User | **is the PK**, `CASCADE`, `related_name="client_profile"` |
| `verification_status` | CharField(20) | `VerificationStatus`, default `pending` |
| `verified_by` | FK → User | `null`, `SET_NULL`, `related_name="verified_clients"` |
| `verified_at` | DateTimeField | `null` |

### `users.BrokerProfile` → `broker_profiles`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `user` | OneToOne → User | **is the PK**, `CASCADE`, `related_name="broker_profile"` |
| `license_no` | CharField(100) | **unique** |
| `approved_by` | FK → User | `null`, `SET_NULL`, `related_name="approved_brokers"` |
| `approved_at` | DateTimeField | `null` |

### `authentication.Invitation` → `invitations`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `user` | FK → User | `CASCADE`, `related_name="invitations"`, `db_column="user_id"` |
| `sent_by` | FK → User | `null`, `SET_NULL`, `related_name="sent_invitations"` |
| `token` | CharField(64) | **unique**, `editable=False`; `save()` sets `secrets.token_urlsafe(32)` |
| `expires_at` | DateTimeField | `save()` sets `now() + 7 days` |
| `status` | CharField(20) | `InviteStatus`, default `pending` |
| `created_at` | DateTimeField | `auto_now_add` |

`is_valid()` returns `status == PENDING and expires_at > timezone.now()`. No default ordering; a `status` index from `0002` was dropped in `0003`.

### `loans.LoanApplication` → `loan_applications`

`ordering = ["-created_at"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `client` | FK → ClientProfile | `PROTECT`, `related_name="loan_applications"` |
| `broker` | FK → BrokerProfile | `null`, `SET_NULL`, `related_name="assigned_applications"` |
| `amount` | Decimal(12,2) | `MinValueValidator(0.01)` |
| `lender` | CharField(255) | optional |
| `status` | CharField(20) | `ApplicationStatus`, default `draft` — **not** the live source of truth; see [Architecture](#architecture-at-a-glance) |
| `created_by` | FK → User | `PROTECT`, `related_name="created_applications"` |
| `created_at` / `updated_at` | DateTimeField | `auto_now_add` / `auto_now` |

**Indexes:** `(client, status)`, `(broker, status)`, `(created_at)`

### `bookings.AvailableSlot` → `available_slots`

`ordering = ["slot_time"]` — broker-published inventory that clients claim.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `broker` | FK → BrokerProfile | `PROTECT`, `related_name="available_slots"` |
| `slot_time` | DateTimeField | |
| `consultation_type` | CharField(100) | default `"Initial Strategy Consultation"` |
| `meeting_platform` | CharField(50) | default `"Google Meet"` |
| `created_at` | DateTimeField | `auto_now_add` |

**Constraint:** `unique_broker_available_slot_time` on `(broker, slot_time)`. Only model registered in `bookings/admin.py`.

### `bookings.Booking` → `bookings`

`ordering = ["slot_time"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `broker` | FK → BrokerProfile | `PROTECT`, `related_name="bookings"` |
| `client` | FK → ClientProfile | `PROTECT`, `related_name="bookings"` |
| `slot_time` | DateTimeField | |
| `consultation_type` | CharField(100) | default `"Initial Strategy Consultation"` |
| `meeting_platform` | CharField(50) | default `"Google Meet"` |
| `notes` | TextField | optional |
| `status` | CharField(20) | `BookingStatus`, default `scheduled` |
| `created_at` / `updated_at` | DateTimeField | `auto_now_add` / `auto_now` |

**Constraint:** `unique_broker_booking_slot` on `(broker, slot_time)` — prevents double-booking.

### `notifications.Notification` → `notifications`

`ordering = ["-created_at"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `recipient` | FK → User | `CASCADE`, `related_name="notifications"` |
| `notification_type` | CharField(30) | `NotificationType` — **no default** |
| `title` | CharField(255) | |
| `message` | TextField | |
| `related_object_type` | CharField(100) | optional; set from `instance._meta.label` |
| `related_object_id` | CharField(100) | optional; set from `instance.pk` |
| `is_read` | BooleanField | default `False` |
| `created_at` | DateTimeField | `auto_now_add` |
| `read_at` | DateTimeField | `null`; set on mark-read |

**Indexes:** `(recipient, is_read)`, `(recipient, created_at)`, `(notification_type, created_at)`

### `document_center.Document` → `documents`

`ordering = ["-uploaded_at"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `application` | FK → LoanApplication | `CASCADE`, `related_name="documents"` |
| `storage_path` | CharField(500) | **unique** — a path string, not a `FileField` |
| `doc_type` | CharField(100) | free-text label, no enum |
| `uploaded_by` | FK → User | `null`, `SET_NULL`, `related_name="uploaded_documents"` |
| `requested_by` | FK → User | `null`, `SET_NULL`, `related_name="requested_documents"` |
| `uploaded_at` | DateTimeField | `auto_now_add` |

**Index:** `(application, doc_type)`. No `urls.py` or `serializers.py` — nothing writes to this table yet.

### `communications.CommunicationLog` → `communication_logs`

`ordering = ["-sent_at"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `application` | FK → LoanApplication | `null`, `SET_NULL`, `related_name="communications"` |
| `sender` | FK → User | `null`, `SET_NULL`, `related_name="sent_messages"` |
| `recipient` | FK → User | `null`, `SET_NULL`, `related_name="received_messages"` |
| `channel` | CharField(20) | `CommunicationsChannel` — **no default** |
| `subject` | CharField(255) | optional |
| `sent_at` | DateTimeField | `auto_now_add` |

**Indexes:** `(application, sent_at)`, `(recipient, sent_at)`. No endpoints; the model is currently unwritten.

### `audit.AuditLog` → `audit_logs`

`ordering = ["-occurred_at"]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `actor` | FK → User | `null`, `SET_NULL`, `related_name="audit_actions"` |
| `action` | CharField(100) | currently only `LOAN_PROCESSING_ACCOUNT_CREATED`, `INVITATION_RESENT`, `INVITATION_REVOKED` |
| `entity_type` | CharField(100) | e.g. `"User"`, `"Invitation"` |
| `entity_id` | UUIDField | `null` |
| `occurred_at` | DateTimeField | `auto_now_add` |
| `ip_address` | GenericIPAddressField | `null` |

**Indexes:** `(entity_type, entity_id)`, `(occurred_at)`

### Enum reference

All enums are `models.TextChoices`; there are no `IntegerChoices`.

| Enum | App | Values |
| :--- | :--- | :--- |
| `UserRole` | users | `client`, `broker`, `loan_processing` |
| `UserStatus` | users | `active`, `inactive`, `suspended` |
| `VerificationStatus` | users | `pending`, `verified`, `rejected` |
| `InviteStatus` | authentication | `pending`, `accepted`, `expired`, `revoked` |
| `BookingStatus` | bookings | `scheduled`, `confirmed`, `cancelled`, `completed` |
| `ApplicationStatus` | loans | `draft`, `submitted`, `in_review`, `approved`, `rejected` |
| `CommunicationsChannel` | communications | `email`, `sms`, `in_app` |
| `NotificationType` | notifications | `loan_status`, `communication`, `mfa`, `system` |

---

## API Endpoints

Full request/response payloads for the auth flow are in **[`endpoints.md`](endpoints.md)**.

**Permission legend** — `Auth` = `IsAuthenticated`; `LP` = `IsLoanProcessingTeam` (superuser **or** `role == loan_processing`); `OTP` = `IsOtpVerified` (passes when `mfa_enabled` is false).

### System

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | `health.views.HealthView` | `{"status":"ok","service":"BAI-APP"}` — no trailing slash | Public |
| — | `/admin/` | `django.contrib.admin` | Django admin | `is_staff` |

### Session (dj-rest-auth)

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | `authentication.views.LoginView` | Sets both JWT cookies. Returns `otp_required` + `otp_expires_in` when `mfa_enabled`; adds `asana_profile` for clients | Public |
| `POST` | `/api/auth/logout/` | `dj_rest_auth.views.LogoutView` | Clears JWT cookies | Public |
| `POST` | `/api/auth/token/refresh/` | dj-rest-auth refresh view | Rotates `jwt-refresh-token` | Cookie |
| `POST` | `/api/auth/token/verify/` | `TokenVerifyView` | Validate a token | Public |
| `GET` `PUT` `PATCH` | `/api/auth/user/` | `UserDetailsView` | Current user; uses `users.serializers.UserSerializer` | Auth |
| `POST` | `/api/auth/password/change/` | `PasswordChangeView` | Change own password | Auth |
| `POST` | `/api/auth/password/reset/` | `PasswordResetView` | Request reset email | Public |
| `POST` | `/api/auth/password/reset/confirm/` | `PasswordResetConfirmView` | Confirm with token | Public |

> The custom `LoginView` is registered **before** `include("dj_rest_auth.urls")` in `config/urls.py:11` precisely so it shadows dj-rest-auth's own.

### Invitations & staff accounts

> Every route below is mounted **twice** — at `/api/auth/…` and `/api/auth/accounts/…`. See [Known Issues #3](#known-issues).

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/loan-processing/` | `LoanProcessingAccountCreateView` | Create inactive `loan_processing` user + invitation, audit, email → `201` | LP |
| `POST` | `/api/auth/invitations/send/` | `SendInviteView` | Create/reuse an inactive broker or client, revoke prior pending invites, email link → `201` | LP + `user` throttle |
| `GET` | `/api/auth/invitations/validate/` | `InvitationValidateView` | `?token=` → `{valid, email, role}`; `400` if absent | Public |
| `POST` | `/api/auth/invitations/accept/` | `InvitationAcceptView` | Set password, activate, create the role profile, mark invite `ACCEPTED` | Public |
| `POST` | `/api/auth/invitations/<uuid:pk>/resend/` | `InvitationResendView` | Push `expires_at` +7d, audit, resend. **`GET` → 405** | LP |
| `POST` | `/api/auth/invitations/<uuid:pk>/revoke/` | `InvitationRevokeView` | Mark `REVOKED` + audit. **`GET` → 405** | LP |

### Profile & MFA

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET` `PUT` `PATCH` | `/api/users/profile/` | `users.views.ProfileView` | Own profile; `PATCH` updates first/last name | Auth + OTP |
| `POST` | `/api/users/profile/mfa/enable/send/` | `MfaEnableSendView` | Generate + email an OTP (`OTP_TTL`) | Auth + `mfa_send` throttle |
| `POST` | `/api/users/profile/mfa/enable/verify/` | `MfaEnableView` | Verify code → `mfa_enabled=True`, `mark_otp_verified`, MFA notification | Auth + `mfa_send` throttle |
| `POST` | `/api/users/profile/mfa/disable/` | `MfaDisableView` | Requires password; clears `mfa_enabled`, notifies | Auth (unthrottled) |

### OTP

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/otp/send/` | `otp.views.OtpSendView` | `login_2fa` uses `OTP_LOGIN_EXPIRY` (120s), other purposes `OTP_TTL` (180s) | Public + `otp` throttle (5/hr) |
| `POST` | `/api/otp/verify/` | `otp.views.OtpVerifyView` | On `login_2fa` success calls `mark_otp_verified()` | Public + `otp_verify` throttle (10/hr) |

Serializer `purpose` choices: `login`, `reset_password`, `login_2fa`, `invite_verify`. The MFA views bypass this serializer and call `generate_otp`/`store_otp` directly.

### Bookings & brokers

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET` `POST` | `/api/bookings/` | `BookingListCreateView` | `GET` is role-scoped (broker/client own only, `loan_processing` all). `POST` claims via `slot_id` or a direct `slot_time` | Auth + OTP |
| `GET` | `/api/bookings/available-slots/` | `AvailableSlotsView` | Needs `?date=YYYY-MM-DD`. Resolves broker via param → loan app → inviter → first active. Returns `{date, broker_id, broker_name, available_slots: ["HH:MM"]}` | Auth + OTP |
| `GET` `POST` | `/api/bookings/slots/` | `SlotListCreateView` | List or publish `AvailableSlot`s; create is broker-only | Auth + OTP |
| `DELETE` | `/api/bookings/slots/<uuid:pk>/` | `SlotDeleteView` | Broker removes own slot | Auth + OTP |
| `GET` `PUT` `PATCH` | `/api/bookings/<uuid:pk>/` | `BookingDetailView` | Retrieve or update status / `slot_time` / notes | Auth + OTP |
| `GET` | `/api/bookings/brokers/` | `BrokerListView` | Active brokers for a picker | Auth + OTP |
| `GET` | `/api/brokers/` | `bookings.views.BrokerListView` | Same view, mounted at the root level | Auth + OTP |

### Loans (Asana-backed)

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/loans/current-status/` | `CurrentLoanStatusView` | Reads `loan_status` **live from Asana**. `role == "client"` only; `503` on `AsanaProfileError`; non-clients get `200 {"loan_status": null, …}` | Auth |
| `PATCH` | `/api/loans/status/` | `LoanStatusUpdateView` | Body `{email, loan_status}`. Moves the Asana task between sections — **no DB write** — then notifies. `400` on `ValueError`, `502` on `AsanaProfileError` | LP |

### Notifications

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications/` | `NotificationListView` | Own notifications; `?unread=true` | Auth + OTP |
| `GET` | `/api/notifications/stream/` | `NotificationStreamView` | **SSE** on Redis `notify:<user_id>`. Emits `event: snapshot` on connect, `event: notification` per message, `: keepalive` every 25s, `retry: 3000` | Auth + OTP |
| `POST` | `/api/notifications/mark-all-read/` | `NotificationMarkAllReadView` | Bulk update → `{"updated_count": n}` | Auth + OTP |
| `PATCH` | `/api/notifications/<uuid:pk>/read/` | `NotificationMarkReadView` | Scoped to own; sets `is_read` + `read_at` | Auth + OTP |

### AI assistant

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chat/` | `RAGChatView` | Body `{question, domain_filter?, top_k?}` → Chroma retrieval + Groq → `{answer, sources}`. Returns a generic `500` on any exception | Public + `ai` throttle (30/hr) |

> `/api/ai/chat/` is **`AllowAny`** — it is the only data-returning endpoint with no auth. See [Known Issues #6](#known-issues).

### Asana webhook

| Method | Path | View | Description | Permission |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/asana/webhook/` | `AsanaWebhookReceiver` | On registration, echoes the `X-Hook-Secret` handshake header. Otherwise iterates `payload["events"]` → `handle_task_moved_event`. Always a bare `200` | Public, **throttling disabled** so webhook bursts are never 429'd |

### Throttle scopes

| Scope | Rate | Applied to |
| :--- | :--- | :--- |
| `anon` | 100/hour | Global `AnonRateThrottle` |
| `user` | 1000/hour | Global `UserRateThrottle`; also `SendInviteView.InviteThrottle` |
| `login` | 20/hour | **Defined but never applied** — see [Known Issues #4](#known-issues) |
| `otp` | 5/hour | `OtpSendThrottle` |
| `otp_verify` | 10/hour | `OtpVerifyThrottle` |
| `ai` | 30/hour | `AiAnonThrottle` + `AiUserThrottle` |
| `mfa_send` | 10/hour | `MfaSendThrottle` |

### Custom permissions

`apps/authentication/permissions.py`:

| Class | Rule | Used by |
| :--- | :--- | :--- |
| `IsLoanProcessingTeam` | `is_superuser` **or** `role == UserRole.LOAN_PROCESSING` | 5 views — 4 invitation routes in `authentication`, plus `loans.LoanStatusUpdateView` |
| `IsOtpVerified` | Passes if `not mfa_enabled`, else requires the Redis `otp_verified:<id>` flag | 11 views (bookings, notifications, profile) |
| `IsLoanProcessingOrSelf` | LP gets everything; others only `retrieve`/`update`/`partial_update` on their own object | **Never used** |

---

## Integrations

### Asana — loan status source of truth

`apps/asana_integration/services/asana.py` (525 lines).

- **Profile lookup** — `find_profile_by_email()` resolves an Asana user from an email address. `parse_description()` extracts 12 fields from the task description with regex; `to_public_profile()` returns a 13-field whitelist (so internal Asana fields are not leaked).
- **Status moves** — `move_task_to_status()` walks the 15 names in `LOAN_STATUSES` and relocates the task between project sections.
- **Caching** — section names and task emails are memoised in Redis for 24h plus an in-process dict.
- **Webhooks** — `handle_task_moved_event()` fires a `NotificationType.LOAN_STATUS` notification and publishes to the SSE stream. It never raises, so a malformed event cannot break the webhook response.

Gated by `ASANA_PROFILE_LOOKUP_ENABLED` (default `False`). When it is off, `/api/loans/current-status/` returns `loan_status: null` and `PATCH /api/loans/status/` returns `502`.

> The webhooks currently mutate notifications only — `handle_task_moved_event` does not write `LoanApplication.status` back to Postgres, so the DB column can drift permanently out of sync with Asana.

### AI assistant — RAG

`apps/ai_assistant/services/rag_service.py`.

| Stage | Implementation |
| :--- | :--- |
| Vector store | `chromadb.CloudClient` if all 3 Chroma vars set, else `PersistentClient(backend/data/chromadb/)`. Collection `bai_finance_knowledge_base` |
| Embeddings | Jina `POST https://api.jina.ai/v1/embeddings`, model `jina-embeddings-v2-base-en`, chunk size 100, `timeout=30`, `Retry(total=3, backoff_factor=0.5)` on a mounted session |
| Embedding fallback | `SentenceTransformer("all-mpnet-base-v2")` (768-d). The code comments warn that MiniLM's 384 dimensions crash ChromaDB |
| Generation | Groq, `temperature=0.1`. System prompt bans HTML, mandates Markdown, and returns a fixed sentence for out-of-scope questions |
| Ingest | SHA256-derived deterministic IDs, batches of 500, `collection.upsert` |

`query()` raises `ValueError` if `GROQ_API_KEY` is unset, which `RAGChatView` collapses into a bare `500`.

---

## Management Commands

| Command | Description |
| :--- | :--- |
| `python manage.py ingest_rag [--reset]` | Embeds 8 hardcoded Bai Finance knowledge chunks into ChromaDB as `bai_doc_01`–`bai_doc_08`. `--reset` clears the collection first |
| `python manage.py register_asana_webhook --target <url>` | Creates an Asana webhook on `ASANA_PROJECT_GID` with filters for `task/changed`, `task/added`, `task/removed`. Raises `CommandError` unless `ASANA_ACCESS_TOKEN`, `ASANA_PROJECT_GID`, and `ASANA_WEBHOOK_ENABLED=True` are all set |
| `python manage.py register_asana_webhook --delete <gid>` | Deletes a registered webhook |

---

## Preseeded Accounts

Data migration `users/migrations/0002_auto_20260824_1151.py` creates a default back-office administrator on first `migrate`.

| Field | Value |
| :--- | :--- |
| **Email** | `compliance@bai.finance` |
| **Password** | `SuperSecretPassword123!` |
| **Role** | `loan_processing` (migrated from the original `compliance` by `0004_fix_compliance_to_loan_processing`) |
| **Status** | `active` |
| **Permissions** | `is_staff=True`, `is_superuser=True` |

> [!WARNING]
> The username and password are hardcoded in a committed migration and were printed in earlier versions of this README. **Rotate the password before any shared or public deployment**, and note that the email address can no longer be changed by a migration alone — edit the row directly or create a fresh superuser.

Migration history worth knowing:

- `0003_alter_user_role` replaced the `compliance` role value with `loan_processing`.
- `0004_fix_compliance_to_loan_processing` rewrote existing rows to match.
- `0005_auto_20260909_0000` is a **deliberate no-op** — an earlier version wrongly collapsed the `broker` role into `loan_processing`, and this migration exists only to document that it was reverted.

### Re-seeding

If the account is deleted or altered and you need to reset it:

```bash
python manage.py migrate users 0001
python manage.py migrate users 0002
```

---

## Current Status

### Done ✅

- 12 apps; 10 models with 23 migrations across the 8 apps that have a `migrations/` package
- Custom `User` (UUID PK, email login) with `ClientProfile` / `BrokerProfile`
- JWT cookie auth via `dj-rest-auth` + SimpleJWT, shadowed custom `LoginView`
- Invitation lifecycle — 32-byte `secrets` tokens, 7-day expiry, HTML email dispatch
- Public activation flow with role validation and profile creation
- Redis-backed OTP: login 2FA, password reset, MFA enrolment, 3-strike lockout
- `IsOtpVerified` permission gating 11 endpoints
- MFA enable/disable with password confirmation
- Broker slot publishing and client booking claims with double-booking protection
- Asana-backed loan status read and section moves
- Asana webhook receiver with Redis-cached lookups
- `Notification` rows + Redis-pubsub **SSE** stream
- RAG assistant over ChromaDB + Groq, with a local embedding fallback
- Audit trail for privileged invitation and account actions
- Security headers, HSTS, 12-char minimum password, 6 scoped throttles
- PostgreSQL via Supabase pooler; settings split base/development/production

### Partial ⚠️

- **Documents** and **communications** — models and migrations exist, but no `urls.py`, no `serializers.py`, no views. Nothing writes to `documents` or `communication_logs`.
- **Tests** — 13 test methods across 9 files, mostly smoke tests. `authentication.LoginOtpFlowTest` and `notifications.NotificationApiTests` are the only meaningful ones; the other seven files each contain a single placeholder-style test.
- **`test_section.py`** — 15 unit tests for the Asana service at the project root. Written for `unittest`, not picked up by `manage.py test`.

### Pending 🔲

- **Domain CRUD endpoints** for `document_center` and `communications`
- **Loan application write endpoints** — `loans` is read-only and Asana-sourced
- **Writes to `AuditLog` outside authentication** — loan and booking actions are unaudited
- **Test coverage** for bookings, OTP, Asana, RAG, and all model constraints
- **CI/CD** — no pipeline config
- **Docker** — no `Dockerfile` or compose file
- **Split `requirements.txt`** into core and AI extras
- **Real document storage** — `Document.storage_path` is a string with no backing storage
- **Production hardening** — no whitenoise, no structured prod logging, no `SECURE_PROXY_SSL_HEADER`

---

## Known Issues

Bugs found while documenting this codebase. None are fixed; each is a one-to-few-line change if you want to pick them up.

### 1. Token refresh will fail after the first rotation — `config/settings/base.py:182`

`SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = True` and `ROTATE_REFRESH_TOKENS = True` are set, but `rest_framework_simplejwt.token_blacklist` is **absent from `INSTALLED_APPS`**. Blacklisting needs the `TokenBlacklist` app's migrations, so the second `POST /api/auth/token/refresh/` raises. Fix: add `"rest_framework_simplejwt.token_blacklist"` to `INSTALLED_APPS` and migrate.

### 2. `EMAIL_BACKEND` is ignored — `config/settings/base.py:32`

The variable is hardcoded:

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
```

It is never read from the environment, even though `.env.example` ships it. There is therefore **no way to switch to the console backend** for local development without editing settings. Invitations and OTPs both call `send_mail(..., fail_silently=False)`, so an unconfigured SMTP server makes those flows raise rather than degrade.

### 3. Invitation routes are mounted twice — `config/urls.py:17` and `config/urls.py:24`

```python
path("api/auth/",        include("authentication.urls")),
path("api/auth/accounts/", include("authentication.urls")),
```

The same six invitation routes are exposed under two prefixes. The duplicate is likely intentional for a frontend migration, but it doubles the attack surface and makes route names ambiguous (`send-invite` resolves to two paths). Either drop one or set `app_name` to namespace them.

### 4. Login is unthrottled — `config/urls.py:11`

A `login` scope of `20/hour` is declared at `config/settings/base.py:167` and never used: `LoginView` sets `authentication_classes = ()` and `permission_classes = [AllowAny]` but no `throttle_classes`. Login is therefore limited only by the global `anon` rate of 100/hour, allowing credential stuffing well beyond the intended limit.

### 5. `ASANA_REQUEST_TIMEOUT` is a dead variable

Declared in `.env.example:29` and read by no module. The Asana service uses the `asana` SDK's own default timeout.

### 6. `/api/ai/chat/` is unauthenticated

`RAGChatView` uses `AllowAny`, so anyone who can reach the API can query the knowledge base. The only gate is the `ai` throttle (30/hour per IP), which is not an access control. This is almost certainly unintentional.

### 7. Allauth settings are inert

`config/settings/base.py:103-105` sets `ACCOUNT_AUTHENTICATION_METHOD`, `ACCOUNT_EMAIL_REQUIRED`, `ACCOUNT_USERNAME_REQUIRED`, `ACCOUNT_USER_MODEL_USERNAME_FIELD`, and `ACCOUNT_UNIQUE_EMAIL`, but `django-allauth` is not in `requirements.txt` and not in `INSTALLED_APPS`. dj-rest-auth's own behaviour is configured through `REST_AUTH` instead.

### 8. `health` is not in `INSTALLED_APPS`

`config/urls.py:42` imports `health.views.HealthView` and the endpoint works, but the app is never registered, so `health/tests.py` is not collected and its `migrations/` package is never loaded.

### 9. Smaller items

- `authentication/auth_urls.py` is dead — nothing includes it.
- `DEFAULT_THROTTLE_RATES` is `.update()`-ed a second time at `config/settings/base.py:246-250` with values identical to the original dict.
- `python-decouple` is pinned but never imported.
- `config/urls.py:5` imports `from authentication.views import LoginView` while lines 3-4 use the `apps.` prefix — the two styles coexist because of the `sys.path` insertion.
- `REST_FRAMEWORK` sets no `DEFAULT_PAGINATION_CLASS`, so every list endpoint is unpaginated.
- `notifications/models/__init__.py` has a copy-pasted docstring reading "Document models package".
- `.gitignore` does not cover `staticfiles/`, `data/chromadb/`, or `sbom.json`.
- `.env.example` commits a real ngrok hostname (`agile-deprive-frugality.ngrok-free.dev`) in `ALLOWED_HOSTS`.
- `REST_AUTH["REGISTER_SERIALIZER"]` is commented out at `config/settings/base.py:98`.
- `authentication.LoginOtpFlowTest` hardcodes `expertbake@gmail.com` and a plaintext password in source.

---

## Development & Testing

### Running tests

```bash
python manage.py test
```

Redis **must** be reachable. `authentication` and `otp` tests override `redis_client` to `redis://localhost:6379/15` and call `flushdb()` in `setUp`/`tearDown`, so they will wipe database 15 — do not point that at a real Redis.

The Asana service tests in `test_section.py` use `unittest` and sit outside the Django suite. Run them directly:

```bash
python test_section.py
```

### Inspecting the schema

```bash
python manage.py makemigrations --check --dry-run   # CI guard: non-zero if models drifted
python manage.py showmigrations users
```

### Django admin

```bash
python manage.py createsuperuser
```

Then open `http://127.0.0.1:8000/admin/`. Five models are registered: `AvailableSlot` (bookings), `AuditLog` (audit), `CommunicationLog` (communications), `Document` (document_center), and `LoanApplication` (loans). `users`, `authentication`, `health`, `notifications`, and `otp` ship an empty `admin.py`, so **`User`, `ClientProfile`, and `BrokerProfile` are not manageable through the admin** — use `createsuperuser` or the shell.

### Security baseline

Password policy is 12 characters minimum with similarity, common-password, and numeric validators. Response headers set `X-Frame-Options: DENY`, `nosniff`, and `strict-origin-when-cross-origin`. HSTS is 2 years with subdomains and preload enabled. `production.py` additionally forces `SECURE_SSL_REDIRECT`, secure session/CSRF cookies, and `HttpOnly` on CSRF.

Before a public deploy, also resolve the five numbered items in [Known Issues](#known-issues) and rotate every credential listed in the checklist at the top of `.env.example`.

---

## License

_This project is private. All rights reserved._
