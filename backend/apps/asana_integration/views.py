import hashlib
import hmac
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.db import close_old_connections
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asana_integration.services.asana import (
    claim_event,
    handle_task_moved_event,
    release_event,
)

logger = logging.getLogger(__name__)

MAX_HOOK_SECRET_LENGTH = 256

# Asana retries any delivery that does not receive a success response within
# 10 seconds. Process events off the request thread so a slow Asana API call,
# push dispatch, or SMTP send can never hold the ACK open.
_event_executor = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="asana-webhook",
)


def _process_event(event, digest, project_gid=None):
    try:
        close_old_connections()
        handle_task_moved_event(event, project_gid=project_gid)
    except Exception:  # noqa: BLE001 - background work must never crash
        release_event(digest)
        logger.exception("Failed to process Asana event: %s", event)
    finally:
        close_old_connections()


def _dispatch_event(event, project_gid=None):
    digest, claimed = claim_event(event)
    if not claimed:
        logger.info("Skipped duplicate Asana webhook event %s", digest)
        return

    if getattr(settings, "ASANA_WEBHOOK_SYNC", False):
        _process_event(event, digest, project_gid=project_gid)
        return

    try:
        _event_executor.submit(_process_event, event, digest, project_gid=project_gid)
    except Exception:  # noqa: BLE001 - e.g. executor already shut down
        release_event(digest)
        logger.exception("Could not queue Asana event: %s", event)

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


def _project_gid(request) -> str | None:
    """Return the Asana project GID carried in ``?project=<gid>``, if any."""
    raw = request.query_params.get("project")
    if raw is None:
        return None
    return str(raw).strip() or None


def _secret_key(request) -> str | None:
    """Composite secret key: ``<hook>:<project>`` when project is present."""
    key = _hook_key(request)
    if key is None:
        return None
    project = _project_gid(request)
    return f"{key}:{project}" if project else key


def _active_secret(secret_key: str = DEFAULT_HOOK_KEY) -> str:
    """Return the stored secret for ``secret_key``, falling back to env secret.

    The environment fallback only applies to the default label so one
    environment's deliveries can never be verified with another's secret.
    """
    try:
        from asana_integration.models import AsanaWebhookSecret

        row = AsanaWebhookSecret.objects.filter(key=secret_key).first()
        if row and row.secret:
            return row.secret
    except Exception:  # DB unavailable — fall back to env without failing open
        logger.exception("Could not load stored Asana webhook secret for %s", secret_key)
    if secret_key != DEFAULT_HOOK_KEY:
        return ""
    return getattr(settings, "ASANA_WEBHOOK_SECRET", "").strip()


def _store_handshake_secret(secret_key: str, secret: str) -> None:
    from asana_integration.models import AsanaWebhookSecret

    AsanaWebhookSecret.objects.update_or_create(
        key=secret_key,
        defaults={"secret": secret[:MAX_HOOK_SECRET_LENGTH]},
    )


def _verify_webhook_signature(
    secret_key: str, raw_body: bytes, signature: str | None
) -> bool:
    secret = _active_secret(secret_key)
    if not secret:
        # Never fail open: without a secret every delivery is rejected.
        logger.error(
            "No Asana webhook secret configured for %s — rejecting delivery", secret_key
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
        secret_key = _secret_key(request)
        if secret_key is None:
            logger.warning("Rejected Asana webhook: invalid hook label")
            return HttpResponse(status=400)

        project_gid = _project_gid(request)

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

                existing = AsanaWebhookSecret.objects.filter(key=secret_key).first()
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
                    secret_key,
                )
                return HttpResponse(status=403)

            try:
                _store_handshake_secret(secret_key, secret)
                logger.info("Asana webhook handshake secret stored for %s", secret_key)
            except Exception:
                logger.exception("Failed to persist Asana handshake secret")
                return HttpResponse(status=503)

            response = HttpResponse(status=200)
            response["X-Hook-Secret"] = secret
            return response

        signature = request.headers.get("X-Hook-Signature")
        if not _verify_webhook_signature(secret_key, request.body or b"", signature):
            # Log which hook headers were present (names only, never values) so a
            # header-name drift or missing secret is easy to spot in the logs.
            logger.warning(
                "Rejected Asana webhook for %s: signature verification failed "
                "(hook headers present: %s)",
                secret_key,
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
                _dispatch_event(event, project_gid=project_gid)
            except Exception:  # noqa: BLE001 - keep the webhook alive
                logger.exception("Failed to dispatch Asana event: %s", event)

        return HttpResponse(status=200)
