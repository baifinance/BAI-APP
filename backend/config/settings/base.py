"""
Base settings for BAI-APP-1 project.

Contains shared configurations (installed apps, middleware, databases)
common across all environments. Extended by development.py and production.py.
"""
import os
import sys
from pathlib import Path
from datetime import timedelta
import environ


# Point to project root (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

sys.path.insert(0, str(BASE_DIR / "apps"))


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

env = environ.Env(
    DEBUG=(bool, False),
)

environ.Env.read_env(BASE_DIR / ".env")
# Frontend base URL
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

# Email / SMTP
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
# Bound how long a notification email may hold an inbound request open. The
# Asana webhook returns inline, so a slow SMTP server must not stall it.
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "5"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "BAI Finance <no-reply@baifinance.com>"
)

# Notification delivery channels. Both are opt-in at deploy time; the database
# tables and endpoints stay available so enabling a channel is a config change.
PUSH_NOTIFICATIONS_ENABLED = env.bool(
    "PUSH_NOTIFICATIONS_ENABLED",
    default=False,
)
EMAIL_NOTIFICATIONS_ENABLED = env.bool(
    "EMAIL_NOTIFICATIONS_ENABLED",
    default=False,
)

# Web Push VAPID identity. Generate once with ``py-vapid`` and keep the private
# key out of source control. The admin email must be a mailto: URL.
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "").strip()
VAPID_ADMIN_EMAIL = os.getenv(
    "VAPID_ADMIN_EMAIL", "mailto:no-reply@baifinance.com"
).strip()
WEB_PUSH_TTL = int(os.getenv("WEB_PUSH_TTL", "86400"))

# Notification email outbox retry policy.
NOTIFICATION_EMAIL_BATCH_SIZE = int(
    os.getenv("NOTIFICATION_EMAIL_BATCH_SIZE", "50")
)
NOTIFICATION_EMAIL_MAX_ATTEMPTS = int(
    os.getenv("NOTIFICATION_EMAIL_MAX_ATTEMPTS", "5")
)
NOTIFICATION_EMAIL_TOKEN_MAX_AGE = int(
    os.getenv("NOTIFICATION_EMAIL_TOKEN_MAX_AGE", "2592000")
)


SECRET_KEY = env("SECRET_KEY")

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1", "testserver"],
)

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)
CORS_ALLOW_CREDENTIALS = True
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    "cache-control",
    "pragma",
]

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


INSTALLED_APPS = [
    # Django admin is intentionally not installed (see config/urls.py).
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "dj_rest_auth",
    
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "rest_framework.authtoken",
    "corsheaders",

    # Local apps
    "users",
    "authentication",
    "loans",
    "bookings",
    "audit",
    "otp",
    "ai_assistant",
    "asana_integration",
    "notifications",
    "health",
]

# Force the in-memory email backend for every test run so a dev .env pointing
# at real SMTP cannot deliver live emails from the test suite.
TEST_RUNNER = "config.test_runner.NotificationSafeTestRunner"

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "jwt-access-token",
    "JWT_AUTH_REFRESH_COOKIE": "jwt-refresh-token",
    "JWT_AUTH_SECURE": False,          # True in prod (HTTPS only)
    "JWT_AUTH_HTTPONLY": True,       
    "JWT_AUTH_SAMESITE": "Lax",       # CSRF protection
    "JWT_AUTH_RETURN_EXPIRATION": True,
    "USER_DETAILS_SERIALIZER": "users.serializers.UserSerializer",
    "LOGIN_SERIALIZER": "authentication.serializers.ActiveUserLoginSerializer",
    # Changing a password must prove knowledge of the current one.
    "OLD_PASSWORD_FIELD_ENABLED": True,
    # JWT cookies are the only credential. Do not also create a Django
    # login session, which would survive an unverified MFA challenge.
    "SESSION_LOGIN": False,
}

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL"),
}

DATABASES["default"]["CONN_MAX_AGE"] = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
   "DEFAULT_AUTHENTICATION_CLASSES": (
       "authentication.authentication.ActiveUserJWTCookieAuthentication",
        "authentication.authentication.ActiveUserJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),

   # Throttling for brute‑force protection
  "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "otp": "5/hour",
        "otp_email": "5/hour",
        "otp_verify": "10/hour",
        "ai": "30/hour",
        "mfa_send": "10/hour",
        "login": "10/minute",
        "dj_rest_auth": "10/minute",
        "mfa_disable": "5/hour",
        "invite": "20/hour",
        "session": "10/hour",
        "transcript": "5/hour",
        "push_test": os.getenv("PUSH_TEST_THROTTLE_RATE", "100/hour"),
    },
}

SIMPLE_JWT = {
    # Short‑lived access token
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    # Longer‑lived refresh token
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Rotate refresh tokens and blacklist old ones
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,

    # Signing
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,  # or a separate env var if you prefer
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
}

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Shared cache backend (rate-limit counters, etc.) on its own Redis DB index so
# it can't collide with — or be flushed alongside — OTP/session state in
# REDIS_URL. Falling back to db 1 keeps local dev zero-config.
REDIS_CACHE_URL = os.getenv("REDIS_CACHE_URL", "redis://localhost:6379/1")

# RQ queue state on its own Redis DB index. Keep it separate from OTP/session
# state and the cache so a queue flush cannot log users out.
REDIS_QUEUE_URL = os.getenv("REDIS_QUEUE_URL", "redis://localhost:6379/2")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_CACHE_URL,
    }
}

if "test" in sys.argv:
    # Tests run with an isolated, per-process cache so throttle counters don't
    # leak between runs (Redis-backed limits would otherwise persist and make
    # the suite flaky).
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "bai-test-cache",
        }
    }

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "").strip()

TURNSTILE_ENABLED = env.bool("TURNSTILE_ENABLED", default=True)

ASANA_PROFILE_LOOKUP_ENABLED = env.bool(
    "ASANA_PROFILE_LOOKUP_ENABLED",
    default=False
)

ASANA_ACCESS_TOKEN = os.getenv(
    "ASANA_ACCESS_TOKEN",
    ""
).strip()

ASANA_PROJECT_GIDS = os.getenv(
    "ASANA_PROJECT_GIDS",
    ""
).strip()

ASANA_PROJECT_GID = os.getenv(
    "ASANA_PROJECT_GID",
    ""
).strip()

ASANA_ALLOW_UNLABELED_EMAIL_MATCH = env.bool(
    "ASANA_ALLOW_UNLABELED_EMAIL_MATCH",
    default=False,
)

ASANA_WEBHOOK_ENABLED = env.bool(
    "ASANA_WEBHOOK_ENABLED",
    default=False
)

ASANA_WEBHOOK_SECRET = os.getenv("ASANA_WEBHOOK_SECRET", "").strip()

# Key material for encrypting the stored webhook secret at rest. Falls back to
# SECRET_KEY when unset (dev); set a dedicated value in production.
ASANA_SECRET_ENC_KEY = os.getenv("ASANA_SECRET_ENC_KEY", "").strip()

# Accept the Asana handshake (X-Hook-Secret) only while explicitly registering a
# webhook; otherwise an unauthenticated caller could rotate the signing secret
# and forge events. Rotation of an already-established secret additionally
# requires ASANA_WEBHOOK_ALLOW_ROTATION.
ASANA_WEBHOOK_HANDSHAKE_ENABLED = env.bool(
    "ASANA_WEBHOOK_HANDSHAKE_ENABLED",
    default=False,
)

ASANA_WEBHOOK_ALLOW_ROTATION = env.bool(
    "ASANA_WEBHOOK_ALLOW_ROTATION",
    default=False,
)

# Asana retries undelivered events for up to 24 hours, so a backlog can replay
# moves from days ago. Events older than this are ignored rather than allowed
# to flip the client's current status back in time.
ASANA_WEBHOOK_MAX_EVENT_AGE_SECONDS = env.int(
    "ASANA_WEBHOOK_MAX_EVENT_AGE_SECONDS",
    default=3600,
)

# Tests set this to True to process deliveries inline. Production keeps the
# request thread free so Asana gets its ACK well within the 10-second limit.
ASANA_WEBHOOK_SYNC = env.bool(
    "ASANA_WEBHOOK_SYNC",
    default=False,
)

ASANA_LOGIN_SYNC_ENABLED = env.bool(
    "ASANA_LOGIN_SYNC_ENABLED",
    default=True,
)

ASANA_QUEUE_NAME = os.getenv("ASANA_QUEUE_NAME", "asana").strip() or "asana"
ASANA_WORKER_CONCURRENCY = env.int("ASANA_WORKER_CONCURRENCY", default=2)
ASANA_JOB_TIMEOUT = env.int("ASANA_JOB_TIMEOUT", default=120)
ASANA_JOB_MAX_RETRIES = env.int("ASANA_JOB_MAX_RETRIES", default=3)

# AI assistant: whether the client's own profile is injected into the LLM
# prompt (sent to Groq). Disable to keep PII entirely within the app, or enable
# redaction to mask the most identifying fields while keeping loan context.
AI_PROFILE_CONTEXT_ENABLED = env.bool(
    "AI_PROFILE_CONTEXT_ENABLED",
    default=True,
)
AI_REDACT_PROFILE_PII = env.bool(
    "AI_REDACT_PROFILE_PII",
    default=True,
)

# OTP configuration
OTP_SIZE = int(os.getenv("OTP_SIZE", 6))
OTP_TTL = int(os.getenv("OTP_TTL", 180))  # 3 minutes
OTP_LOGIN_EXPIRY = int(os.getenv("OTP_LOGIN_EXPIRY", 120)) # 2-min login OTP
OTP_VERIFIED_FLAG_TTL = int(os.getenv("OTP_VERIFIED_FLAG_TTL", 14400)) # 4h flag


AUTH_USER_MODEL = "users.User"

# Password validation — OWASP A07 / ASVS 2.1.7
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "authentication.validators.StrongPasswordValidator"},
]

X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
# Audit rows store the immediate peer address unless the app is definitely
# behind a trusted reverse proxy; otherwise X-Forwarded-For is spoofable.
AUDIT_TRUST_X_FORWARDED_FOR = env.bool(
    "AUDIT_TRUST_X_FORWARDED_FOR",
    default=False,
)
# CSP nonce-based is set via middleware/headers in production; deny framing and sniffing by default
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

TIME_ZONE= "UTC"
USE_TZ = True

# Base logging: security-relevant loggers go to the console so they are
# captured by the platform (systemd/Docker/Cloud Run) in production.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "plain",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.security": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "authentication": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "turnstile": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "asana_integration": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}