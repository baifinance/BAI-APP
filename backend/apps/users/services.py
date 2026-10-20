"""Service helpers for user profiles."""

import logging

from django.utils import timezone

from audit.services import log_action
from otp.utils import get_redis_client
from users.models import ClientProfile

logger = logging.getLogger(__name__)


def _invalidate_asana_profile_cache(email):
    """Drop the cached Asana profile so the next lookup reflects Asana."""
    if not email:
        return
    try:
        get_redis_client().delete(f"asana_profile:{email.lower()}")
    except Exception:  # cache is best-effort; never block the status write
        logger.warning("Could not invalidate Asana profile cache", exc_info=True)


def record_loan_status_change(user, status, *, when=None):
    """Stamp the moment a client entered a given loan-status section.

    Persists a ``{status: ISO-timestamp}`` map on the client's ``ClientProfile``
    so the loan-status stepper can render the real date each step was reached.

    Safe to call repeatedly: consecutive duplicates of the current status are
    ignored. Returns the updated profile, or ``None`` when there is nothing to
    record (no status, or the user is not a client).
    """
    if not status:
        return None

    try:
        profile = user.client_profile
    except ClientProfile.DoesNotExist:
        return None

    history = dict(profile.loan_status_history or {})

    if profile.loan_status == status and status in history:
        return profile

    history[status] = (when or timezone.now()).isoformat()
    profile.loan_status = status
    profile.loan_status_history = history
    profile.save(update_fields=["loan_status", "loan_status_history"])

    log_action(
        "LOAN_STATUS_CHANGED",
        actor=user,
        entity_type="ClientProfile",
        entity_id=profile.pk,
    )

    # The cached Asana profile still carries the previous loan_status; drop it
    # so a /api/loans/current-status/ read falls back to a fresh Asana lookup.
    _invalidate_asana_profile_cache(user.email)

    return profile
