"""Async SSE stream for live notification delivery.

Runs under ASGI and holds no Django worker thread while waiting on Redis
pubsub, so hundreds of concurrent client streams do not exhaust the sync
threadpool. Auth (JWT cookie + OTP-verified flag) is performed synchronously
inside ``sync_to_async`` since those helpers are blocking Redis calls.
"""

from __future__ import annotations

import json
import logging
import time

from asgiref.sync import sync_to_async
from django.conf import settings
from django.http import StreamingHttpResponse

from authentication.authentication import ActiveUserJWTCookieAuthentication
from otp.utils import is_otp_verified

logger = logging.getLogger(__name__)

# Keep well below the proxy idle timeout; the client reconnects with backoff.
STREAM_MAX_LIFETIME_SECONDS = 300


async def notification_stream(request):
    """GET /api/notifications/stream/ — async server-sent events."""
    # Authenticate (sync helpers run in a threadpool via sync_to_async).
    try:
        auth_result = await sync_to_async(
            ActiveUserJWTCookieAuthentication().authenticate
        )(request)
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

    try:
        verified = await sync_to_async(is_otp_verified)(user.id)
    except Exception:
        logger.warning("SSE stream otp check failed", exc_info=True)
        verified = False
    if not verified:
        return StreamingHttpResponse(
            "otp required", content_type="text/plain", status=403
        )

    from redis.asyncio import Redis as AsyncRedis

    client = AsyncRedis.from_url(
        settings.REDIS_URL,
        socket_connect_timeout=5,
        socket_timeout=5,
    )
    pubsub = client.pubsub()
    await pubsub.subscribe(f"notify:{user.id}")

    async def event_stream():
        try:
            yield "retry: 3000\n\n"
            yield f"event: snapshot\ndata: {json.dumps({'ok': True})}\n\n"
            deadline = time.monotonic() + STREAM_MAX_LIFETIME_SECONDS
            while time.monotonic() < deadline:
                remaining = max(0.0, deadline - time.monotonic())
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=min(25.0, remaining),
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
                await pubsub.unsubscribe(f"notify:{user.id}")
            except Exception:
                pass
            try:
                await pubsub.close()
            except Exception:
                pass
            try:
                await client.close()
            except Exception:
                pass

    response = StreamingHttpResponse(
        event_stream(), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
