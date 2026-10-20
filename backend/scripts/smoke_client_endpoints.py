"""Smoke-test the client-facing API endpoints for a real account.

Runs in-process (no server/Turnstile needed): verifies the account password,
mints a short-lived access token, and exercises every client endpoint, printing
the outcome of each.

Usage:
    venv/bin/python scripts/smoke_client_endpoints.py \
        --email you@example.com --password '...' [--include-ai]

Read-only by default; ``--include-ai`` additionally opens/closes an AI chat
session (which writes a Conversation row and calls the LLM).
"""

import argparse
import os
import sys

import django


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--include-ai", action="store_true")
    args = parser.parse_args()

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django.conf import settings

    # APIClient sends Host: testserver; allow it for this in-process run.
    if "testserver" not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ["testserver"]

    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    User = get_user_model()
    user = User.objects.filter(email__iexact=args.email).first()
    if user is None:
        print(f"FAIL: no account for {args.email}")
        return 1

    if not user.check_password(args.password):
        print("FAIL: password does not match")
        return 1

    print(f"OK  credentials valid for {args.email} (role={user.role}, "
          f"active={user.is_active}, mfa={user.mfa_enabled})")

    if user.mfa_enabled:
        from otp.utils import mark_otp_verified

        mark_otp_verified(user.id)
        print("    MFA enabled -> marked session OTP-verified for this smoke run")

    token = str(RefreshToken.for_user(user).access_token)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    failures = []

    def check(method, path, expected, data=None):
        resp = client.generic(method, path, data=data or {}, format=None)
        ok = resp.status_code == expected
        body = resp.content[:120].decode("utf-8", "replace")
        status = "OK " if ok else "FAIL"
        print(f"{status} {method:4} {path:44} -> {resp.status_code} "
              f"(expected {expected}) {body}")
        if not ok:
            failures.append(path)
        return resp

    print("\n-- client endpoints --")
    check("GET", "/api/auth/user/", 200)
    check("GET", "/api/users/profile/", 200)
    check("GET", "/api/loans/current-status/", 200)
    check("GET", "/api/notifications/", 200)
    check("GET", "/api/brokers/", 200)

    print("\n-- negative check (admin-only endpoint must be blocked) --")
    check("GET", "/api/users/", 403)

    if args.include_ai:
        print("\n-- AI endpoints --")
        start = check("POST", "/api/ai/chat/session/start/", 201)
        conv_id = start.data.get("conversation_id") if start.status_code == 201 else None
        if conv_id:
            check(
                "POST",
                "/api/ai/chat/",
                200,
                data={"question": "What documents do I need?", "conversation_id": conv_id},
            )
            check(
                "POST",
                "/api/ai/chat/session/end/",
                200,
                data={"conversation_id": conv_id},
            )

    print()
    if failures:
        print(f"SMOKE FAILED for: {', '.join(failures)}")
        return 1
    print("SMOKE PASSED: all client endpoints responded as expected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
