import uuid

from django.conf import settings
from django.db import models


class NotificationPreference(models.Model):
    """Per-user delivery preferences for push and notification email."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )

    push_enabled = models.BooleanField(default=False)
    email_critical_enabled = models.BooleanField(default=True)
    email_optional_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notification_preferences"

    def __str__(self):
        return f"Notification preferences: {self.user_id}"
