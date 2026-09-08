# BAI Finance API — Authentication & Invitation Endpoints

Comprehensive API reference for authentication, session management, and the user invitation lifecycle (Compliance, Brokers, Clients) in BAI Finance.

---

## Table of Contents
- [Authentication Overview](#authentication-overview)
- [Preseeded Accounts](#preseeded-accounts)
- [Authentication & Session Endpoints](#authentication--session-endpoints)
  - [1. User Login (`POST /api/auth/login/`)](#1-user-login-post-apiauthlogin)
  - [2. User Logout (`POST /api/auth/logout/`)](#2-user-logout-post-apiauthlogout)
  - [3. Token Refresh (`POST /api/auth/token/refresh/`)](#3-token-refresh-post-apiauthtokenrefresh)
  - [4. Get / Update Current User (`GET, PUT, PATCH /api/auth/user/`)](#4-get--update-current-user-get-put-patch-apiauthuser)
- [Invitation & Account Creation Endpoints](#invitation--account-creation-endpoints)
  - [5. Send Invitation (`POST /api/auth/invitations/send/`)](#5-send-invitation-post-apiauthinvitationssend)
  - [6. Create Compliance Account (`POST /api/auth/compliance/`)](#6-create-compliance-account-post-apiauthcompliance)
  - [7. Validate Invitation Token (`GET /api/auth/invitations/validate/`)](#7-validate-invitation-token-get-apiauthinvitationsvalidate)
  - [8. Accept Invitation & Set Password (`POST /api/auth/invitations/accept/`)](#8-accept-invitation--set-password-post-apiauthinvitationsaccept)
  - [9. Resend Invitation (`GET /api/auth/invitations/<id>/resend/`)](#9-resend-invitation-get-apiauthinvitationsidresend)
  - [10. Revoke Invitation (`GET /api/auth/invitations/<id>/revoke/`)](#10-revoke-invitation-get-apiauthinvitationsidrevoke)
- [System Endpoints](#system-endpoints)
  - [11. Health Check (`GET /healthz`)](#11-health-check-get-healthz)

---

## Authentication Overview

BAI Finance uses **JSON Web Tokens (JWT)** configured with **HttpOnly Cookies** via `dj-rest-auth` and `djangorestframework-simplejwt`.

* **Access Token**: Set in cookie `jwt-access-token` (Lifetime: 15 minutes, `SameSite=Lax`, `HttpOnly=True`).
* **Refresh Token**: Set in cookie `jwt-refresh-token` (Lifetime: 7 days, `SameSite=Lax`, `HttpOnly=True`).
* **CORS Credentials**: All frontend requests must include credentials (`credentials: "include"` in fetch).
* **Security & Tokens**: In production (`DEBUG=False`), raw tokens are never exposed in JSON payloads.

---

## Preseeded Accounts

The database migrations include an initial administrator/compliance account seeded into the system via migration `0002_auto_20260824_1151`:

| Field | Value |
| :--- | :--- |
| **Email** | `compliance@bai.finance` |
| **Password** | `SuperSecretPassword123!` |
| **Role** | `compliance` |
| **Status** | `active` |
| **Permissions** | `is_staff=True`, `is_superuser=True` |

### Setting Up & Seeding the Database
1. **Automatic Seeding**: Run `python manage.py migrate` (or start the project via `backend_start.bat`). Migration `0002_auto_20260824_1151` automatically checks for and creates the default compliance account if it does not already exist.
2. **Re-seeding**: If the account was deleted and needs to be recreated:
   ```bash
   python manage.py migrate users 0001
   python manage.py migrate users 0002
   ```
3. **Local Email Testing (Invitations)**: To test the invitation email dispatch without configuring SMTP credentials, set:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   ```
   All invitation emails and activation links will be printed directly in your terminal console.

---

## Authentication & Session Endpoints

### 1. User Login (`POST /api/auth/login/`)
Authenticates credentials and sets secure JWT cookies (`jwt-access-token` and `jwt-refresh-token`).

- **URL**: `/api/auth/login/`
- **Method**: `POST`
- **Authentication**: None (`AllowAny`)
- **Rate Limit**: 20 requests / hour

#### Request Body
```json
{
  "email": "compliance@bai.finance",
  "password": "SuperSecretPassword123!"
}
```

#### Success Response (`200 OK`)
**Cookies Set**:
- `jwt-access-token`: `<access_jwt>` (`HttpOnly`, `Path=/`, `SameSite=Lax`)
- `jwt-refresh-token`: `<refresh_jwt>` (`HttpOnly`, `Path=/api/auth/`, `SameSite=Lax`)

**Response Body**:
```json
{
  "user": {
    "id": "e83df3b8-6f6a-4d2c-8ab5-3b987b1c3123",
    "email": "compliance@bai.finance",
    "username": "compliance@bai.finance",
    "role": "compliance",
    "status": "active",
    "mfa_enabled": false,
    "is_active": true,
    "created_at": "2026-08-24T11:51:00Z",
    "updated_at": "2026-08-24T11:51:00Z"
  }
}
```
*(Note: In development (`DEBUG=True`), `"access": "<token>"` is also temporarily included for Postman testing).*

#### Error Responses
- **`400 Bad Request`** (Invalid credentials / Inactive user):
```json
{
  "non_field_errors": [
    "Unable to log in with provided credentials."
  ]
}
```

---

### 2. User Logout (`POST /api/auth/logout/`)
Invalidates the current session and clears JWT cookies.

- **URL**: `/api/auth/logout/`
- **Method**: `POST`
- **Authentication**: `IsAuthenticated` (or unauthenticated request to clear cookies)

#### Success Response (`200 OK`)
```json
{
  "detail": "Successfully logged out."
}
```

---

### 3. Token Refresh (`POST /api/auth/token/refresh/`)
Refreshes the access token using the HttpOnly refresh token cookie.

- **URL**: `/api/auth/token/refresh/`
- **Method**: `POST`
- **Authentication**: None (Reads `jwt-refresh-token` cookie automatically)

#### Success Response (`200 OK`)
Sets a new `jwt-access-token` cookie.
```json
{
  "detail": "Token refreshed successfully."
}
```

---

### 4. Get / Update Current User (`GET, PUT, PATCH /api/auth/user/`)
Returns or updates profile details for the currently logged-in user.

- **URL**: `/api/auth/user/`
- **Method**: `GET` / `PUT` / `PATCH`
- **Authentication**: `IsAuthenticated`

#### Success Response (`200 OK`)
```json
{
  "id": "e83df3b8-6f6a-4d2c-8ab5-3b987b1c3123",
  "email": "compliance@bai.finance",
  "username": "compliance@bai.finance",
  "role": "compliance",
  "status": "active",
  "mfa_enabled": false,
  "is_active": true,
  "created_at": "2026-08-24T11:51:00Z",
  "updated_at": "2026-08-24T11:51:00Z"
}
```

---

## Invitation & Account Creation Endpoints

### 5. Send Invitation (`POST /api/auth/invitations/send/`)
Generates an invitation token, creates an inactive user record, and sends a branded HTML invitation email with an activation link.

- **URL**: `/api/auth/invitations/send/`
- **Method**: `POST`
- **Authentication**: `IsAuthenticated` (Compliance or Broker)

#### Request Body
```json
{
  "email": "john.broker@example.com",
  "role": "broker"
}
```
*(Valid `role` values: `"client"`, `"broker"`)*

#### Success Response (`201 Created`)
```json
{
  "message": "Invitation sent."
}
```

#### Error Responses
- **`400 Bad Request`** (Account already registered):
```json
{
  "email": [
    "This account is already registered and active."
  ]
}
```
- **`400 Bad Request`** (Role mismatch for existing email):
```json
{
  "email": [
    "A user with this email already exists as a 'client'."
  ]
}
```

---

### 6. Create Compliance Account (`POST /api/auth/compliance/`)
Creates a new inactive `compliance` user, generates an activation token, and sends an invite email.

- **URL**: `/api/auth/compliance/`
- **Method**: `POST`
- **Authentication**: `IsComplianceTeam` (Superuser or `role=compliance`)

#### Request Body
```json
{
  "email": "officer2@bai.finance",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

#### Success Response (`201 Created`)
```json
{
  "message": "Compliance account created and invite sent."
}
```

---

### 7. Validate Invitation Token (`GET /api/auth/invitations/validate/`)
Public verification endpoint used by the frontend activation page to verify token authenticity and determine if the invitee is a broker or client before rendering the form.

- **URL**: `/api/auth/invitations/validate/?token=<token>`
- **Method**: `GET`
- **Authentication**: Public (`AllowAny`)

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | Yes | 32-character URL-safe invitation token |

#### Success Response (`200 OK`)
```json
{
  "valid": true,
  "email": "john.broker@example.com",
  "role": "broker"
}
```

#### Error Responses
- **`400 Bad Request`** (Token missing):
```json
{
  "valid": false,
  "error": "Token not provided."
}
```
- **`200 OK`** (Invalid or expired token):
```json
{
  "valid": false,
  "error": "Invalid token."
}
```
*(or `"Invitation expired or invalid."`)*

---

### 8. Accept Invitation & Set Password (`POST /api/auth/invitations/accept/`)
Public registration endpoint. Sets the user's password, activates their account, populates profile data (`ClientProfile` or `BrokerProfile`), and marks the invitation as `ACCEPTED`.

- **URL**: `/api/auth/invitations/accept/`
- **Method**: `POST`
- **Authentication**: Public (`AllowAny`)

#### Request Body (Client)
```json
{
  "token": "4vT7Z-d7_W9lB69a3K1yZ...",
  "first_name": "Alice",
  "last_name": "Smith",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!"
}
```

#### Request Body (Broker)
*Note: `license_no` is mandatory for brokers.*
```json
{
  "token": "4vT7Z-d7_W9lB69a3K1yZ...",
  "first_name": "John",
  "last_name": "Broker",
  "license_no": "BROKER-NSW-8921",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!"
}
```

#### Success Response (`200 OK`)
```json
{
  "message": "Account activated. You can now log in."
}
```

#### Error Responses
- **`400 Bad Request`** (Password mismatch):
```json
{
  "password_confirm": [
    "Passwords do not match."
  ]
}
```
- **`400 Bad Request`** (Broker missing license):
```json
{
  "license_no": [
    "License number is required for brokers."
  ]
}
```
- **`400 Bad Request`** (Duplicate broker license):
```json
{
  "license_no": [
    "This license number is already registered."
  ]
}
```
- **`400 Bad Request`** (Already active):
```json
{
  "token": [
    "This account is already active."
  ]
}
```

---

### 9. Resend Invitation (`GET /api/auth/invitations/<id>/resend/`)
Extends the invitation expiration by another 7 days and resends the activation email.

- **URL**: `/api/auth/invitations/<uuid:id>/resend/`
- **Method**: `GET`
- **Authentication**: `IsAuthenticated` (Compliance)

#### Success Response (`200 OK`)
```json
{
  "message": "Invitation email resent."
}
```

---

### 10. Revoke Invitation (`GET /api/auth/invitations/<id>/revoke/`)
Revokes a pending invitation so the token can no longer be used.

- **URL**: `/api/auth/invitations/<uuid:id>/revoke/`
- **Method**: `GET`
- **Authentication**: `IsAuthenticated` (Compliance)

#### Success Response (`200 OK`)
```json
{
  "message": "Invitation revoked."
}
```

---

## System Endpoints

### 11. Health Check (`GET /healthz`)
Returns the health status of the backend API service.

- **URL**: `/healthz`
- **Method**: `GET`
- **Authentication**: Public (`AllowAny`)

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "bai-backend",
  "timestamp": "2026-08-27T03:35:00Z"
}
```
