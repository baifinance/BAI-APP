"""Cloudflare Turnstile server-side verification (siteverify API)."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
MAX_TOKEN_LENGTH = 2048


def verify_turnstile(token: str | None, remoteip: str | None = None) -> tuple[bool, list]:
    """Validate a Turnstile token. Returns (ok, error_codes). Fail-closed."""
    if not token or len(token) > MAX_TOKEN_LENGTH:
        return False, ["invalid-input-response"]
    secret = getattr(settings, "TURNSTILE_SECRET_KEY", "")
    if not secret:
        # Fail closed. To run without Turnstile locally, set TURNSTILE_ENABLED=False
        # rather than relying on DEBUG.
        logger.error("TURNSTILE_SECRET_KEY missing — rejecting verification")
        return False, ["missing-input-secret"]

    payload = {"secret": secret, "response": token}
    if remoteip:
        payload["remoteip"] = remoteip

    try:
        resp = requests.post(SITEVERIFY_URL, json=payload, timeout=10)
        data = resp.json()
    except Exception:
        logger.exception("Turnstile siteverify request failed")
        return False, ["internal-error"]

    if data.get("success"):
        return True, []
    return False, data.get("error-codes") or ["invalid-input-response"]


TURNSTILE_ERROR_MESSAGES = {
    "timeout-or-duplicate": "Verification expired, please retry.",
    "invalid-input-response": "Verification invalid, please retry.",
    "missing-input-secret": "Verification unavailable, please try again later.",
    "internal-error": "Verification unavailable, please try again later.",
}
