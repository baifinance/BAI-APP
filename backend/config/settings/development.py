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

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "asana_file": {
            "class": "logging.FileHandler",
            "filename": "/tmp/asana_events.log",
            "formatter": "plain",
        },
    },
    "loggers": {
        "asana_integration": {
            "level": "DEBUG",
            "handlers": ["asana_file"],
            "propagate": False,
        },
    },
}