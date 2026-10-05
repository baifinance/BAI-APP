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
        _redis_client = redis.from_url(REDIS_URL)
    
    return _redis_client

def generate_otp(size=6):
    """Generate numeriec OTP code"""
    return "".join(secrets.choice(string.digits) for _ in range(size))

def store_otp(email, code, purpose="login", ttl=settings.OTP_TTL):
    """Store OTP in Redis with TTL in seconds — key is namespaced by purpose to prevent cross-purpose collisions."""
    key = f"otp:{purpose}:{email.lower()}"
    payload = {
        "code": code,
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

def verify_otp(email, code, purpose="login"):
    """Verify OTP against Redis. Returns (success, error_message)"""
    key = f"otp:{purpose}:{email.lower()}"
    stored = get_redis_client().get(key)
    if not stored:
        return False, "OTP expired or not found"

    payload = json.loads(stored)

    if payload["purpose"] != purpose:
        return False, "OTP purpose mismatch"

    if payload["code"] != code:
        payload["attempts"] += 1
        get_redis_client().setex(key, payload["ttl"], json.dumps(payload))
        if payload["attempts"] >= 3:
            get_redis_client().delete(key)
            return False, "Account locked. Too many failed attempts."
        return False, f"Invalid OTP. {3 - payload['attempts']} attempts remaining."

    # Success - consume OTP
    get_redis_client().delete(key)
    return True, "OTP Verified"

def create_login_challenge(email):
    code = generate_otp(size=getattr(settings, "OTP_SIZE", 6))
    store_otp(email, code, purpose="login_2fa", ttl=settings.OTP_LOGIN_EXPIRY)
    return code

def mark_otp_verified(user_id, ttl=None):
    get_redis_client().setex(f"otp_verified:{user_id}", ttl or settings.OTP_VERIFIED_FLAG_TTL, "1")

def is_otp_verified(user_id):
    return bool(get_redis_client().get(f"otp_verified:{user_id}"))