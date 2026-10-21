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


def publish_stream_notification(user_id, notification=None, loan_status=None):
    """Ping the user's live SSE channel and fan out side channels.

    Push and email are best-effort: a delivery failure must never roll back the
    notification row or the request that created it.
    """
    payload = {
        "notification_id": str(getattr(notification, "pk", "") or ""),
        "loan_status": loan_status,
        "title": getattr(notification, "title", None),
        "message": getattr(notification, "message", None),
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
        # Deliver right away instead of waiting for a scheduled outbox drain.
        # `send_email_delivery` never raises on an SMTP failure: it records the
        # attempt, applies the backoff, and returns False.
        try:
            from notifications.email import send_email_delivery

            if not send_email_delivery(delivery):
                logger.warning(
                    "Notification email for notification %s was not sent; "
                    "see the email_deliveries row for details",
                    notification.pk,
                )
        except Exception:
            logger.exception(
                "Notification email delivery failed for notification %s",
                notification.pk,
            )
