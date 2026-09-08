import secrets
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
import redis
import os
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)

def generate_otp(size=6):
    """Generate numeriec OTP code"""
    return "".join(secrets.choice(string.digits) for _ in range(size))

def store_otp(email, code, purpose="login", ttl=180):
    """Store OTP in Redis with TTL in seconds"""
    key = f"otp:{email.lower()}"
    payload = {
        "code": code,
        "created_at": timezone.now().isoformat(),
        "purpose": purpose,
        "attempts": 0
    }
    redis_client.setex(
        name=key,
        time=ttl,
        value=json.dumps(payload)
    )
    return key

def verify_otp(email, code, purpose="login"):
    """Verify OTP against Redis. Returns (success, error_message)"""
    key = f"otp:{email.lower()}"
    stored = redis_client.get(key)
    if not stored:
        return False, "OTP expired or not found"

    payload = json.loads(stored)

    if payload["purpose"] != purpose:
        return False, "OTP purpose mismatch"

    if payload["code"] != code:
        payload["attempts"] += 1
        redis_client.setex(key, 180, json.dumps(payload))
        if payload["attempts"] >= 3:
            redis_client.delete(key)
            return False, "Account locked. Too many failed attempts."
        return False, f"Invalid OTP. {3 - payload['attempts']} attempts remaining."

    # Success - consume OTP
    redis_client.delete(key)
    return True, "OTP Verified"