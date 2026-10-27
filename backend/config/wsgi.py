"""
WSGI config for BAI-APP-1 project.
"""

import os

from django.core.wsgi import get_wsgi_application

# Deployed servers must default to production settings. Local `runserver` goes
# through manage.py, which defaults to development, so this only affects real
# WSGI deployments.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.getenv("DJANGO_SETTINGS_MODULE", "config.settings.production"))

application = get_wsgi_application()
