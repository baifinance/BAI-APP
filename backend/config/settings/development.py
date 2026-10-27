"""
Development settings for BAI-APP-1 project.

Extends base.py with local development configurations (DEBUG=True,
permissive CORS settings, and local database settings).
"""
from .base import *

DEBUG = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Allow JWT cookies over HTTP on localhost
REST_AUTH["JWT_AUTH_SECURE"] = False

# In development, disable default throttling (AnonRateThrottle and UserRateThrottle)
# so hot-module reloads, tab-switching, and multi-tab testing never trigger HTTP 429 Too Many Requests.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
        "anon": "10000/hour",
        "user": "50000/hour",
        "login": "1000/minute",
    },
}

# Extend the base logging config: also mirror asana events to a local file for
# convenient debugging while keeping the shared console handler.
LOGGING = {
    **LOGGING,
    "handlers": {
        **LOGGING["handlers"],
        "asana_file": {
            "class": "logging.FileHandler",
            "filename": "/tmp/asana_events.log",
            "formatter": "plain",
        },
    },
    "loggers": {
        **LOGGING["loggers"],
        "asana_integration": {
            "level": "DEBUG",
            "handlers": ["asana_file", "console"],
            "propagate": False,
        },
    },
}