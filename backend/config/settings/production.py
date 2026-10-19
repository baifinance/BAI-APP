"""
Production settings for BAI-APP-1 project.

Extends base.py with strict security rules, SSL enforcement,
and production-ready host/CORS constraints.
"""
from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
# HSTS preload-ready (63072000 = 2 years, per skill pattern)
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
# Production must enforce secure JWT cookies
REST_AUTH["JWT_AUTH_SECURE"] = True
REST_AUTH["JWT_AUTH_SAMESITE"] = "Strict"

# ---------------------------------------------------------------------------
# Fail-closed production guards (OWASP A02 / A05).
# Never boot with empty or placeholder security-critical configuration.
# ---------------------------------------------------------------------------
_REQUIRED = {
    "SECRET_KEY": SECRET_KEY,
    "ALLOWED_HOSTS": ALLOWED_HOSTS,
    "CORS_ALLOWED_ORIGINS": CORS_ALLOWED_ORIGINS,
    "CSRF_TRUSTED_ORIGINS": CSRF_TRUSTED_ORIGINS,
}
_missing = [name for name, value in _REQUIRED.items() if not value]
if _missing:
    raise ImproperlyConfigured(
        "Refusing to start: missing required production setting(s): "
        + ", ".join(_missing)
    )

if SECRET_KEY.startswith("replace-") or len(SECRET_KEY) < 32:
    raise ImproperlyConfigured(
        "Refusing to start: SECRET_KEY is a placeholder or too short."
    )