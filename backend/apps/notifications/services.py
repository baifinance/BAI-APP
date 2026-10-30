import json
import logging

from otp.utils import get_redis_client
from notifications.models import Notification

logger = logging.getLogger(__name__)


def create_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    related_object=None,
):
    related_object_type = ""
    related_object_id = ""

    if related_object is not None:
        related_object_type = related_object._meta.label
        related_object_id = str(related_object.pk)

    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
    )


def publish_stream_notification(user_id, notification=None, loan_status=None, application_id=None):
    """Ping the user's live SSE channel and fan out side channels.

    Push and email are best-effort: a delivery failure must never roll back the
    notification row or the request that created it.
    """
    payload = {
        "notification_id": str(getattr(notification, "pk", "") or ""),
        "notification_type": getattr(notification, "notification_type", None),
        "loan_status": loan_status,
        "application_id": str(application_id) if application_id is not None else None,
        "title": getattr(notification, "title", None),
        "message": getattr(notification, "message", None),
        "created_at": (
            notification.created_at.isoformat()
            if getattr(notification, "created_at", None)
            else None
        ),
    }
    try:
        get_redis_client().publish(f"notify:{user_id}", json.dumps(payload))
    except Exception:
        logger.exception("SSE publish failed for user %s", user_id)

    if notification is None:
        return

    try:
        from notifications.push import send_push_notification

        send_push_notification(notification)
    except Exception:
        logger.exception("Web push dispatch failed for notification %s", notification.pk)

    try:
        from notifications.email import enqueue_notification_email

        delivery = enqueue_notification_email(notification)
    except Exception:
        logger.exception(
            "Notification email enqueue failed for notification %s",
            notification.pk,
        )
        delivery = None

    if delivery is not None:
        # Email is delivered by the scheduled outbox drain
        # (send_notification_emails management command), not inline here, so
        # SMTP latency never blocks SSE/push delivery.
        pass
