"""
Base settings for BAI-APP-1 project.

Contains shared configurations (installed apps, middleware, databases)
common across all environments. Extended by dev.py and production.py.
"""
import sys
import os
from pathlib import Path
from datetime import timedelta
import environ


# Point to project root (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Add 'apps' folder to Python path for direct app imports
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
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "BAI Finance <no-reply@baifinance.com>"
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

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


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "dj_rest_auth",
    
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework.authtoken",
    "corsheaders",

    # Local apps
    "users",
    "authentication",
    "loans",
    "document_center",
    "bookings",
    "communications",
    "audit",
    "otp",
    "ai_assistant",
]

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "jwt-access-token",
    "JWT_AUTH_REFRESH_COOKIE": "jwt-refresh-token",
    "JWT_AUTH_SECURE": False,          # True in prod (HTTPS only)
    "JWT_AUTH_HTTPONLY": True,       
    "JWT_AUTH_SAMESITE": "Lax",       # CSRF protection
    "JWT_AUTH_RETURN_EXPIRATION": True,

    # "REGISTER_SERIALIZER": "apps.authentication.serializers.RegisterSerializer",
    "USER_DETAILS_SERIALIZER": "users.serializers.UserSerializer",
}

# Tell allauth/dj-rest-auth you use email, not username
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_UNIQUE_EMAIL = True


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
       "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
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
        "login": "20/hour"
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

# OTP configuration
OTP_SIZE = int(os.getenv("OTP_SIZE", 6))
OTP_TTL = int(os.getenv("OTP_TTL", 180))  # 3 minutes


AUTH_USER_MODEL = "users.User"

SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

TIME_ZONE= "UTC"
USE_TZ = True