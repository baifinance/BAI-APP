import json

from otp.utils import redis_client
from notifications.models import Notification

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
    """Ping the user's live SSE channel; clients refetch on receipt."""
    payload = {
        "notification_id": str(getattr(notification, "pk", "") or ""),
        "loan_status": loan_status,
    }
    redis_client.publish(f"notify:{user_id}", json.dumps(payload))
