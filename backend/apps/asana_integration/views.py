import hashlib
import hmac
import json
import logging
import re

from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asana_integration.services.asana import handle_task_moved_event

logger = logging.getLogger(__name__)

MAX_HOOK_SECRET_LENGTH = 256

# Each environment (deployment) stores its own handshake secret under a label
# carried in the target URL as ``?hook=<label>``. Asana sends the full target
# URL (including the query string) for both the handshake and every delivery, so
# the label identifies which secret to use. Targets without the parameter keep
# using the original ``asana`` label for backwards compatibility.
DEFAULT_HOOK_KEY = "asana"
HOOK_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")


def _hook_key(request) -> str | None:
    """Return the validated label for this webhook, or ``None`` if malformed."""
    raw = request.query_params.get("hook")
    if raw is None:
        return DEFAULT_HOOK_KEY
    key = str(raw).strip().lower()
    return key if HOOK_KEY_RE.match(key) else None


def _active_secret(key: str = DEFAULT_HOOK_KEY) -> str:
    """Return the stored secret for ``key``, falling back to the env secret.

    The environment fallback only applies to the default label so one
    environment's deliveries can never be verified with another's secret.
    """
    try:
        from asana_integration.models import AsanaWebhookSecret

        row = AsanaWebhookSecret.objects.filter(key=key).first()
        if row and row.secret:
            return row.secret
    except Exception:  # DB unavailable — fall back to env without failing open
        logger.exception("Could not load stored Asana webhook secret for %s", key)
    if key != DEFAULT_HOOK_KEY:
        return ""
    return getattr(settings, "ASANA_WEBHOOK_SECRET", "").strip()


def _store_handshake_secret(key: str, secret: str) -> None:
    from asana_integration.models import AsanaWebhookSecret

    AsanaWebhookSecret.objects.update_or_create(
        key=key,
        defaults={"secret": secret[:MAX_HOOK_SECRET_LENGTH]},
    )


def _verify_webhook_signature(
    key: str, raw_body: bytes, signature: str | None
) -> bool:
    secret = _active_secret(key)
    if not secret:
        # Never fail open: without a secret every delivery is rejected.
        logger.error(
            "No Asana webhook secret configured for %s — rejecting delivery", key
        )
        return False
    if not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


class AsanaWebhookReceiver(APIView):
    """
    POST /api/asana/webhook/?hook=<label>

    Handles the Asana webhook handshake (X-Hook-Secret echo) and event
    deliveries for loan-status (section move) notifications. Each environment
    keeps its own secret under the ``hook`` label carried in the target URL;
    omitting the parameter uses the legacy ``asana`` label.
    """

    permission_classes = [AllowAny]
    throttle_classes = [] # note: never 429 a webhook burst (would kill it)
    pagination_class = None

    def post(self, request):
        key = _hook_key(request)
        if key is None:
            logger.warning("Rejected Asana webhook: invalid hook label")
            return HttpResponse(status=400)

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

                existing = AsanaWebhookSecret.objects.filter(key=key).first()
            except Exception:
                logger.exception("Could not load stored Asana webhook secret")
                return HttpResponse(status=503)

            if (
                existing
                and existing.secret
                and not getattr(settings, "ASANA_WEBHOOK_ALLOW_ROTATION", False)
            ):
                logger.warning(
                    "Rejected Asana handshake: a secret already exists for %s and "
                    "rotation is disabled",
                    key,
                )
                return HttpResponse(status=403)

            try:
                _store_handshake_secret(key, secret)
                logger.info("Asana webhook handshake secret stored for %s", key)
            except Exception:
                logger.exception("Failed to persist Asana handshake secret")
                return HttpResponse(status=503)

            response = HttpResponse(status=200)
            response["X-Hook-Secret"] = secret
            return response

        signature = request.headers.get("X-Hook-Signature")
        if not _verify_webhook_signature(key, request.body or b"", signature):
            # Log which hook headers were present (names only, never values) so a
            # header-name drift or missing secret is easy to spot in the logs.
            logger.warning(
                "Rejected Asana webhook for %s: signature verification failed "
                "(hook headers present: %s)",
                key,
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
