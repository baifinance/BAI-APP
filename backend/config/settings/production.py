"""
Production settings for BAI-APP-1 project.

Extends base.py with strict security rules, SSL enforcement,
and production-ready host/CORS constraints.
"""
from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

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