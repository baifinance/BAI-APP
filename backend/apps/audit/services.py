"""Helpers for writing audit records.

Audit writes are best-effort: a logging failure must never break the business
operation that triggered it.
"""

import logging

from audit.models import AuditLog

logger = logging.getLogger(__name__)


def _client_ip(request):
    if request is None:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def log_action(
    action,
    *,
    actor=None,
    entity_type="",
    entity_id=None,
    request=None,
):
    """Record a single auditable action. Returns the row or ``None``."""
    try:
        if actor is not None and not getattr(actor, "is_authenticated", False):
            actor = None
        return AuditLog.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type or "",
            entity_id=entity_id,
            ip_address=_client_ip(request),
        )
    except Exception:  # never let audit failures break the request
        logger.exception("Failed to write audit log for action %s", action)
        return None
