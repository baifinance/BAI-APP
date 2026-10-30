"""Synchronous SSE stream for live notification delivery.

Works under both WSGI (local runserver) and ASGI (production uvicorn).
Auth is performed synchronously; the Redis pubsub call blocks one
threadpool thread per connection, which is acceptable for up to ~200
concurrent clients with uvicorn's default threadpool.
"""

from __future__ import annotations

import json
import logging
import time

from django.conf import settings
from django.http import StreamingHttpResponse

from authentication.authentication import ActiveUserJWTCookieAuthentication
from otp.utils import get_redis_client, is_otp_verified

logger = logging.getLogger(__name__)

# Keep well below the proxy idle timeout; the client reconnects with backoff.
STREAM_MAX_LIFETIME_SECONDS = 300


def notification_stream(request):
    """GET /api/notifications/stream/ — synchronous server-sent events."""
    # Authenticate synchronously.
    try:
        auth_result = ActiveUserJWTCookieAuthentication().authenticate(request)
    except Exception:
        logger.warning("SSE stream auth failed", exc_info=True)
        return StreamingHttpResponse(
            "unauthorized", content_type="text/plain", status=401
        )
    if auth_result is None:
        return StreamingHttpResponse(
            "unauthorized", content_type="text/plain", status=401
        )
    user, _ = auth_result

    # OTP verification is only enforced when MFA is enabled on the account,
    # matching IsOtpVerified behavior. Non-MFA users connect instantly.
    if user.mfa_enabled:
        try:
            verified = is_otp_verified(user.id)
        except Exception:
            logger.warning("SSE stream otp check failed", exc_info=True)
            verified = False
        if not verified:
            return StreamingHttpResponse(
                "otp required", content_type="text/plain", status=403
            )

    client = get_redis_client()
    pubsub = client.pubsub()
    pubsub.subscribe(f"notify:{user.id}")

    def event_stream():
        try:
            yield "retry: 3000\n\n"
            yield f"event: snapshot\ndata: {json.dumps({'ok': True})}\n\n"
            deadline = time.monotonic() + STREAM_MAX_LIFETIME_SECONDS
            while time.monotonic() < deadline:
                remaining = max(0, deadline - time.monotonic())
                message = pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=min(25, remaining),
                )
                if message and message.get("type") == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    data = data.replace("\r", "").replace("\n", "")
                    yield f"event: notification\ndata: {data}\n\n"
                else:
                    yield ": keepalive\n\n"
        finally:
            try:
                pubsub.unsubscribe(f"notify:{user.id}")
            except Exception:
                pass
            try:
                pubsub.close()
            except Exception:
                pass

    response = StreamingHttpResponse(
        event_stream(), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
