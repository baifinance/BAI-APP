import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asana_integration.services.asana import handle_task_moved_event

logger = logging.getLogger(__name__)

MAX_HOOK_SECRET_LENGTH = 256


def _active_secret() -> str:
    """Return the stored handshake secret, falling back to the env secret."""
    try:
        from asana_integration.models import AsanaWebhookSecret

        row = AsanaWebhookSecret.objects.filter(key="asana").first()
        if row and row.secret:
            return row.secret
    except Exception:  # DB unavailable — fall back to env without failing open
        logger.exception("Could not load stored Asana webhook secret")
    return getattr(settings, "ASANA_WEBHOOK_SECRET", "").strip()


def _store_handshake_secret(secret: str) -> None:
    from asana_integration.models import AsanaWebhookSecret

    AsanaWebhookSecret.objects.update_or_create(
        key="asana",
        defaults={"secret": secret[:MAX_HOOK_SECRET_LENGTH]},
    )


def _verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    secret = _active_secret()
    if not secret:
        # Never fail open: without a secret every delivery is rejected.
        logger.error("No Asana webhook secret configured — rejecting delivery")
        return False
    if not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


class AsanaWebhookReceiver(APIView):
    """
    POST /api/asana/webhook/

    Handles the Asana webhook handshake (X-Hook-Secret echo) and event
    deliveries for loan-status (section move) notifications.
    """

    permission_classes = [AllowAny]
    throttle_classes = [] # note: never 429 a webhook burst (would kill it)
    pagination_class = None

    def post(self, request):
        secret = request.headers.get("X-Hook-Secret")
        if secret:
            # Handshakes are only honored while an operator is registering the
            # webhook. Without this gate any unauthenticated caller could
            # overwrite the signing secret and then forge signed deliveries.
            if not getattr(settings, "ASANA_WEBHOOK_HANDSHAKE_ENABLED", False):
                logger.warning(
                    "Rejected Asana handshake: handshake mode is disabled"
                )
                return HttpResponse(status=403)

            try:
                from asana_integration.models import AsanaWebhookSecret

                existing = AsanaWebhookSecret.objects.filter(key="asana").first()
            except Exception:
                logger.exception("Could not load stored Asana webhook secret")
                return HttpResponse(status=503)

            if (
                existing
                and existing.secret
                and not getattr(settings, "ASANA_WEBHOOK_ALLOW_ROTATION", False)
            ):
                logger.warning(
                    "Rejected Asana handshake: a secret already exists and "
                    "rotation is disabled"
                )
                return HttpResponse(status=403)

            try:
                _store_handshake_secret(secret)
                logger.info("Asana webhook handshake secret stored")
            except Exception:
                logger.exception("Failed to persist Asana handshake secret")
                return HttpResponse(status=503)

            response = HttpResponse(status=200)
            response["X-Hook-Secret"] = secret
            return response

        signature = request.headers.get("X-Hook-Signature")
        if not _verify_webhook_signature(request.body or b"", signature):
            # Log which hook headers were present (names only, never values) so a
            # header-name drift or missing secret is easy to spot in the logs.
            logger.warning(
                "Rejected Asana webhook: signature verification failed (hook headers present: %s)",
                [h for h in request.headers if h.lower().startswith("x-hook")],
            )
            return HttpResponse(status=403)

        if not getattr(settings, "ASANA_WEBHOOK_ENABLED", False):
            return HttpResponse(status=200)
        
        try:
            payload = json.loads(request.body or b"{}")
        except json.JSONDecodeError:
            return HttpResponse(status=200)
        
        for event in payload.get("events") or []:
            try:
                logger.info("RAW EVENT: %s", json.dumps(event, sort_keys=True))
                handle_task_moved_event(event)
            except Exception: #noqa: BLE001 - keep the webhook alive
                logger.exception("Failed to process Asana event: %s", event)

        return HttpResponse(status=200)
