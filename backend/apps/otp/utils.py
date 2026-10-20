import hashlib
import hmac
import secrets
import string
from django.utils import timezone
from django.conf import settings
import redis
import os
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_redis_client = None

def get_redis_client():
    global _redis_client
    if _redis_client is None:
        # rediss:// already negotiates TLS with default cert validation.
        _redis_client = redis.from_url(
            REDIS_URL, socket_connect_timeout=5, socket_timeout=5
        )

    return _redis_client

def generate_otp(size=6):
    """Generate numeriec OTP code"""
    return "".join(secrets.choice(string.digits) for _ in range(size))

def _otp_digest(code):
    """Keyed hash of an OTP so Redis never holds the live code in plaintext."""
    return hmac.new(
        settings.SECRET_KEY.encode(), str(code).encode(), hashlib.sha256
    ).hexdigest()

def store_otp(email, code, purpose="login", ttl=settings.OTP_TTL):
    """Store OTP in Redis with TTL in seconds — key is namespaced by purpose to prevent cross-purpose collisions.

    Only a keyed hash of the code is persisted, so a Redis reader cannot recover
    a live OTP.
    """
    key = f"otp:{purpose}:{email.lower()}"
    payload = {
        "code": _otp_digest(code),
        "ttl": ttl,
        "created_at": timezone.now().isoformat(),
        "purpose": purpose,
        "attempts": 0
    }
    get_redis_client().setex(
        name=key,
        time=ttl,
        value=json.dumps(payload)
    )
    return key

MAX_OTP_ATTEMPTS = 3


def verify_otp(email, code, purpose="login", consume=True):
    """Verify OTP against Redis. Returns (success, error_message)"""
    key = f"otp:{purpose}:{email.lower()}"
    attempts_key = f"{key}:attempts"
    client = get_redis_client()
    stored = client.get(key)
    if not stored:
        return False, "OTP expired or not found"

    payload = json.loads(stored)

    if payload["purpose"] != purpose:
        return False, "OTP purpose mismatch"

    # Constant-time comparison of the keyed digest; use an atomic counter so
    # concurrent guesses cannot undercount attempts (INCR is atomic in Redis).
    if not hmac.compare_digest(
        str(payload.get("code", "")), _otp_digest(code or "")
    ):
        attempts = client.incr(attempts_key)
        client.expire(attempts_key, payload.get("ttl", settings.OTP_TTL))
        if attempts >= MAX_OTP_ATTEMPTS:
            client.delete(key)
            client.delete(attempts_key)
            return False, "Account locked. Too many failed attempts."
        return False, f"Invalid OTP. {MAX_OTP_ATTEMPTS - attempts} attempts remaining."

    # Success - consume OTP if requested
    if consume:
        client.delete(key)
    client.delete(attempts_key)
    return True, "OTP Verified"

def create_login_challenge(email):
    code = generate_otp(size=getattr(settings, "OTP_SIZE", 6))
    store_otp(email, code, purpose="login_2fa", ttl=settings.OTP_LOGIN_EXPIRY)
    return code

def mark_otp_verified(user_id, ttl=None):
    get_redis_client().setex(f"otp_verified:{user_id}", ttl or settings.OTP_VERIFIED_FLAG_TTL, "1")

def is_otp_verified(user_id):
    return bool(get_redis_client().get(f"otp_verified:{user_id}"))

def clear_otp_verified(user_id):
    """Revoke the OTP-verified flag (call on logout / password change)."""
    get_redis_client().delete(f"otp_verified:{user_id}")