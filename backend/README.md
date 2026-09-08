# BAI-APP

> Mortgage & brokerage platform backend — Django REST API for managing loan applications, client/broker workflows, document management, and appointment scheduling.

![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.2-092E20?style=flat&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.17-004C99?style=flat&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql&logoColor=white)

---

## Overview

BAI-APP is a backend REST API built with Django REST Framework. It serves as the core platform for a mortgage brokerage system, handling:

- **User management** — Admin, Client, and Broker roles with verification workflows
- **Loan applications** — Full lifecycle from draft to approval/rejection
- **Document center** — File storage and tracking per loan application
- **Bookings** — Broker-client appointment scheduling with slot management
- **Communications** — Email, SMS, and in-app message logging
- **Audit trail** — System-wide activity logging

---

## Tech Stack

| Technology       | Version | Purpose                                  |
| ---------------- | ------- | ---------------------------------------- |
| Python           | 3.14.6  | Runtime                                  |
| Django           | 4.2.30  | Web framework                            |
| Django REST Framework | 3.17.2 | REST API toolkit                    |
| PostgreSQL       | —       | Database (hosted on Supabase)            |
| psycopg          | 3.3.4   | PostgreSQL adapter (async-capable)       |
| django-environ   | 0.14.0  | Environment variable parsing             |
| django-cors-headers | 4.9.0 | Cross-Origin Resource Sharing           |
| python-decouple  | 3.8     | Settings from .env files                 |
| dj-database-url  | 3.1.2   | DATABASE_URL parser                      |

---

## Folder Structure

```
BAI-APP/
├── backend/
│   ├── manage.py                          # Django entry point
│   ├── requirements.txt                   # Python dependencies
│   ├── backend_start.bat                  # One-click Windows startup script
│   ├── .env                               # Environment config (git-ignored)
│   ├── .env.example                       # Environment template
│   ├── .gitignore                         # Git ignore rules
│   │
│   ├── config/                            # Django project configuration
│   │   ├── __init__.py
│   │   ├── asgi.py                        # ASGI entry point
│   │   ├── wsgi.py                        # WSGI entry point
│   │   ├── urls.py                        # Root URL router
│   │   └── settings/
│   │       ├── __init__.py
│   │       ├── base.py                    # Shared settings
│   │       ├── development.py             # Dev overrides (DEBUG=True)
│   │       └── production.py              # Prod overrides (SSL, secure cookies)
│   │
│   ├── common/                            # Shared utilities
│   │   └── __init__.py
│   │
│   └── apps/                              # All Django applications
│       ├── users/                         # User management
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: User, ClientProfile, BrokerProfile
│       │   │   ├── user.py                # Custom User (UUID pk, email-based auth)
│       │   │   └── profiles.py            # ClientProfile, BrokerProfile
│       │   ├── choices.py                 # UserRole, UserStatus, VerificationStatus
│       │   ├── migrations/
│       │   │   └── 0001_initial.py
│       │   ├── urls.py                    # (placeholder)
│       │   ├── serializers.py             # (placeholder)
│       │   ├── views.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── authentication/                # Invitation system
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: Invitation
│       │   │   └── invitation.py          # Token-based invitations
│       │   ├── choices.py                 # InviteStatus
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   └── 0002_initial.py
│       │   ├── urls.py                    # (placeholder)
│       │   ├── serializers.py             # (placeholder)
│       │   ├── views.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── loans/                         # Loan applications
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: LoanApplication
│       │   │   └── loan_application.py    # Loan lifecycle tracking
│       │   ├── choices.py                 # ApplicationStatus
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   └── 0002_initial.py
│       │   ├── views.py                   # (placeholder)
│       │   ├── tests.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── bookings/                      # Appointment scheduling
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: Booking
│       │   │   └── booking.py             # Broker-client slot management
│       │   ├── choices.py                 # BookingStatus
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   └── 0002_initial.py
│       │   ├── views.py                   # (placeholder)
│       │   ├── tests.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── communications/                # Message logging
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: CommunicationLog
│       │   │   └── communication_log.py   # Email/SMS/In-App tracking
│       │   ├── choices.py                 # CommunicationsChannel
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   ├── 0002_initial.py
│       │   │   └── 0003_initial.py
│       │   ├── views.py                   # (placeholder)
│       │   ├── tests.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── document_center/               # Document management
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: Document
│       │   │   └── document.py            # File storage metadata
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   ├── 0002_initial.py
│       │   │   └── 0003_initial.py
│       │   ├── views.py                   # (placeholder)
│       │   ├── tests.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       ├── audit/                         # Audit trail
│       │   ├── models/
│       │   │   ├── __init__.py            # Exports: AuditLog
│       │   │   └── audit_log.py           # System-wide activity logging
│       │   ├── choices.py                 # (none)
│       │   ├── migrations/
│       │   │   ├── 0001_initial.py
│       │   │   └── 0002_initial.py
│       │   ├── views.py                   # (placeholder)
│       │   ├── tests.py                   # (placeholder)
│       │   └── admin.py                   # (placeholder)
│       │
│       └── health/                        # Health check endpoint
│           ├── models.py                  # (empty)
│           ├── views.py                   # HealthView — returns status JSON
│           ├── tests.py                   # (placeholder)
│           └── migrations/
│               └── __init__.py
```

---

## Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **PostgreSQL** — Local install or [Supabase](https://supabase.com) account
- **Git** — [Download](https://git-scm.com/)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/BAI-APP.git
cd BAI-APP
```

### 2. Create your `.env` file

```bash
cd backend
copy .env.example .env
```

Edit `.env` and fill in your values:

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=your-secret-key-here-generate-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://postgres.your-project-ref:YOUR_DATABASE_PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### 3. Create a virtual environment

```bash
python -m venv venv
```

### 4. Activate the virtual environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Run database migrations (Sets up schema & pre-seeded data)

```bash
python manage.py migrate
```

> [!NOTE]
> Running migrations automatically creates all database tables and seeds the default **Compliance Administrator account** (`compliance@bai.finance` / `SuperSecretPassword123!`) via data migration `0002_auto_20260824_1151`.

### 7. (Optional) Create an additional superuser

```bash
python manage.py createsuperuser
```

Follow the prompts if you wish to create a custom personal admin account.

### 8. Start the development server

```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`.

### Quick Start (Windows)

Alternatively, double-click `backend_start.bat` to automate steps 3–8:

```
backend_start.bat
```

This will create a venv, install deps, run migrations (seeding the compliance account), and start the server.

---

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | Settings configuration module | `config.settings.development` |
| `SECRET_KEY` | Cryptographic signing key | `django-insecure-abc123...` |
| `DEBUG` | Enable debug mode (`True` for local, `False` in prod) | `True` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed host domains | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection URL (Supabase pooler) | `postgresql://user:pass@host:5432/postgres` |
| `FRONTEND_BASE_URL` | Base URL used in invitation activation links | `http://localhost:3000` |
| `EMAIL_BACKEND` | Django email backend (`smtp` or `console`) | `django.core.mail.backends.console.EmailBackend` |
| `EMAIL_HOST` | SMTP server host (e.g. Gmail / SendGrid) | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USE_TLS` | Enable TLS encryption | `True` |
| `EMAIL_HOST_USER` | SMTP username / email address | `yourgmail@gmail.com` |
| `EMAIL_HOST_PASSWORD` | SMTP app password / API key | `your-app-password` |
| `DEFAULT_FROM_EMAIL` | Sender address shown in invite emails | `BAI Finance <no-reply@baifinance.com>` |

> [!TIP]
> **Local Testing without SMTP Credentials**: Set `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in your `.env`. When an invitation is sent via the API or UI, the activation email and link will be printed directly to your Django server console!

---

## Database Setup & Migrations

### Connection

The project uses **PostgreSQL** (hosted on Supabase) with the `psycopg` adapter. The connection string is parsed from `DATABASE_URL` via `dj-database-url`.

### Initial Setup

After configuring your `.env`, run all migrations to create the database tables:

```bash
python manage.py migrate
```

This applies **15 migration files** across 7 apps in the correct dependency order:

1. `users` — Creates `users`, `client_profiles`, `broker_profiles`
2. `authentication` — Creates `invitations`
3. `loans` — Creates `loan_applications`
4. `bookings` — Creates `bookings`
5. `communications` — Creates `communication_logs`
6. `document_center` — Creates `documents`
7. `audit` — Creates `audit_logs`

### Common Migration Commands

| Command                                        | Description                                      |
| ---------------------------------------------- | ------------------------------------------------ |
| `python manage.py migrate`                     | Apply all pending migrations                     |
| `python manage.py migrate <app_name>`          | Apply migrations for a specific app              |
| `python manage.py makemigrations`              | Auto-detect model changes and create migrations  |
| `python manage.py makemigrations <app_name>`   | Create migrations for a specific app             |
| `python manage.py showmigrations`              | List all migrations and their status             |
| `python manage.py sqlmigrate <app> <number>`   | Show the SQL for a migration                     |

### Rolling Back Migrations

To undo migrations (go back to a previous state):

```bash
# Roll back the last migration for a specific app
python manage.py migrate <app_name> <previous_migration_number>

# Example: Roll back bookings to before 0002
python manage.py migrate bookings 0001
```

### Creating New Migrations

After modifying a model, generate and apply the migration:

```bash
# 1. Detect changes
python manage.py makemigrations <app_name>

# 2. Apply
python manage.py migrate
```

---

## Database Schema

### Users (`users`)

| Field              | Type         | Description                              |
| ------------------ | ------------ | ---------------------------------------- |
| `id`               | UUID (PK)    | Auto-generated unique identifier         |
| `email`            | Email        | Unique, used as login                    |
| `username`         | String       | Required                                 |
| `role`             | Choice       | `admin` / `client` / `broker`            |
| `status`           | Choice       | `active` / `inactive` / `suspended`      |
| `mfa_enabled`      | Boolean      | Multi-factor auth toggle                 |
| `invited_by`       | FK → User    | Who invited this user (nullable)         |
| `created_at`       | DateTime     | Auto-set on creation                     |
| `updated_at`       | DateTime     | Auto-updated on save                     |

### Client Profile (`client_profiles`)

| Field                  | Type       | Description                            |
| ---------------------- | ---------- | -------------------------------------- |
| `user`                 | FK → User  | One-to-one (PK)                        |
| `verification_status`  | Choice     | `pending` / `verified` / `rejected`    |
| `verified_by`          | FK → User  | Admin who verified (nullable)          |
| `verified_at`          | DateTime   | When verified (nullable)               |

### Broker Profile (`broker_profiles`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `user`         | FK → User  | One-to-one (PK)                        |
| `license_no`   | String     | Unique license number                  |
| `approved_by`  | FK → User  | Admin who approved (nullable)          |
| `approved_at`  | DateTime   | When approved (nullable)               |

### Invitation (`invitations`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `id`           | UUID (PK)  | Unique identifier                      |
| `user`         | FK → User  | The invited user                       |
| `token`        | String     | URL-safe token (auto-generated)        |
| `expires_at`   | DateTime   | Expiration timestamp                   |
| `status`       | Choice     | `pending` / `accepted` / `expired` / `revoked` |
| `sent_by`      | FK → User  | Who sent the invitation (nullable)     |
| `created_at`   | DateTime   | Auto-set on creation                   |

### Loan Application (`loan_applications`)

| Field          | Type          | Description                          |
| -------------- | ------------- | ------------------------------------ |
| `id`           | UUID (PK)     | Unique identifier                    |
| `client`       | FK → Client   | Applicant (PROTECT on delete)        |
| `broker`       | FK → Broker   | Assigned broker (nullable, SET_NULL) |
| `amount`       | Decimal(12,2) | Loan amount (min: 0.01)             |
| `lender`       | String        | Lender name                          |
| `status`       | Choice        | `draft` / `submitted` / `in_review` / `approved` / `rejected` |
| `created_by`   | FK → User     | Creator (PROTECT on delete)          |
| `created_at`   | DateTime      | Auto-set on creation                 |
| `updated_at`   | DateTime      | Auto-updated on save                 |

**Indexes:** `(client, status)`, `(broker, status)`, `(created_at)`

### Booking (`bookings`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `id`           | UUID (PK)  | Unique identifier                      |
| `broker`       | FK → Broker | Assigned broker (PROTECT on delete)   |
| `client`       | FK → Client | Applicant (PROTECT on delete)         |
| `slot_time`    | DateTime   | Appointment datetime                   |
| `status`       | Choice     | `scheduled` / `confirmed` / `cancelled` / `completed` |
| `created_at`   | DateTime   | Auto-set on creation                   |
| `updated_at`   | DateTime   | Auto-updated on save                   |

**Constraint:** Unique on `(broker, slot_time)` — no double-booking.

### Communication Log (`communication_logs`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `id`           | UUID (PK)  | Unique identifier                      |
| `application`  | FK → Loan  | Related loan application (nullable)    |
| `sender`       | FK → User  | Message sender (nullable)              |
| `recipient`    | FK → User  | Message recipient (nullable)           |
| `channel`      | Choice     | `email` / `sms` / `in_app`            |
| `subject`      | String     | Message subject                        |
| `sent_at`      | DateTime   | Auto-set on creation                   |

**Indexes:** `(application, sent_at)`, `(recipient, sent_at)`

### Document (`documents`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `id`           | UUID (PK)  | Unique identifier                      |
| `application`  | FK → Loan  | Parent loan application (CASCADE)      |
| `storage_path` | String     | File path (unique, max 500 chars)      |
| `doc_type`     | String     | Document type label                    |
| `uploaded_by`  | FK → User  | Uploader (nullable)                    |
| `requested_by` | FK → User  | Requester (nullable)                   |
| `uploaded_at`  | DateTime   | Auto-set on creation                   |

**Index:** `(application, doc_type)`

### Audit Log (`audit_logs`)

| Field          | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `id`           | UUID (PK)  | Unique identifier                      |
| `actor`        | FK → User  | User who performed the action (nullable) |
| `action`       | String     | Action performed                       |
| `entity_type`  | String     | Type of entity affected                |
| `entity_id`    | UUID       | ID of entity affected (nullable)       |
| `occurred_at`  | DateTime   | Auto-set on creation                   |
| `ip_address`   | IP Address | Client IP (nullable)                   |

**Indexes:** `(entity_type, entity_id)`, `(occurred_at)`

## Preseeded Accounts
 
 The database migrations include an initial administrator / compliance user created automatically via data migration [`0002_auto_20260824_1151`](apps/users/migrations/0002_auto_20260824_1151.py):
 
 | Field | Value |
 | :--- | :--- |
 | **Email** | `compliance@bai.finance` |
 | **Password** | `SuperSecretPassword123!` |
 | **Role** | `compliance` |
 | **Status** | `active` |
 | **Permissions** | `is_staff=True`, `is_superuser=True` |
 
 ### How to Seed / Re-seed:
 - **Automatic**: Triggered on initial setup when you run `python manage.py migrate` (or run `backend_start.bat`).
 - **Manual Re-seeding**: If the compliance user was deleted or modified and you need to reset it, roll back and re-apply migration 0002:
   ```bash
   python manage.py migrate users 0001
   python manage.py migrate users 0002
   ```

---

## API Endpoints

For full request/response schemas, payloads, error states, and token flows, refer to **[`endpoints.md`](endpoints.md)**.

| Method | Endpoint | Description | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | Health check | Public | ✅ Working |
| `POST` | `/api/auth/login/` | Log in & issue HttpOnly JWT cookies | Public | ✅ Working |
| `POST` | `/api/auth/logout/` | Log out & clear JWT cookies | Authenticated | ✅ Working |
| `POST` | `/api/auth/token/refresh/` | Refresh access JWT cookie | Public (Cookie) | ✅ Working |
| `GET` / `PUT` | `/api/auth/user/` | View/update current user profile | Authenticated | ✅ Working |
| `POST` | `/api/auth/invitations/send/` | Send invitation link to Broker or Client | Authenticated | ✅ Working |
| `POST` | `/api/auth/compliance/` | Create Compliance user & send invite | Compliance | ✅ Working |
| `GET` | `/api/auth/invitations/validate/` | Validate token & retrieve invitee role | Public | ✅ Working |
| `POST` | `/api/auth/invitations/accept/` | Accept invite, set password & create profile | Public | ✅ Working |
| `GET` | `/api/auth/invitations/<id>/resend/` | Resend invitation email | Compliance | ✅ Working |
| `GET` | `/api/auth/invitations/<id>/revoke/` | Revoke pending invitation | Compliance | ✅ Working |
| — | `/admin/` | Django admin panel | Staff/Superuser | ✅ Working |
| — | `/api/users/` | User CRUD management | Authenticated | 🔲 Placeholder |

---

## Current Status

### Done ✅

- Project scaffold with clean architecture (`config/`, `apps/`, `common/`)
- 8 Django apps with models, choices, and migrations
- Custom User model with UUID PKs and email-based auth
- Preseeded compliance account migration
- Full Authentication & Invitation flow (`dj-rest-auth`, `SimpleJWT`, HttpOnly cookies)
- Invitation lifecycle with 32-byte secure tokens, 7-day expiration & HTML email dispatch
- Public activation workflow with role validation (`ClientProfile` & `BrokerProfile` creation)
- PostgreSQL database connected via Supabase
- Settings split (base / development / production)
- CORS configured for frontend (`localhost:3000`)
- Health check endpoint
- Windows quick-start script (`backend_start.bat`)
- Complete endpoint documentation in `endpoints.md`

### Pending 🔲

- **Domain API views & serializers** — Loan applications, document center, bookings & communications views
- **Tests** — Unit and integration test suites
- **CI/CD** — Deployment pipelines
- **Docker** — Containerization setup

---

## Development

### Running Tests

```bash
python manage.py test
```

### Creating a Superuser

```bash
python manage.py createsuperuser
```

Then access the admin panel at `http://127.0.0.1:8000/admin/`.

### Checking for Model Changes

```bash
python manage.py makemigrations --check --dry-run
```

---

## License

_This project is private. All rights reserved._
