import uuid

from django.db import models


class EmailDelivery(models.Model):
    """Outbox row for a notification email.

    Rows are created when a notification is published and drained by the
    ``send_notification_emails`` management command, keeping SMTP latency out
    of the request path.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    notification = models.OneToOneField(
        "notifications.Notification",
        on_delete=models.CASCADE,
        related_name="email_delivery",
    )

    recipient_email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "email_deliveries"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "next_attempt_at"]),
        ]

    def __str__(self):
        return f"Email delivery: {self.notification_id} ({self.status})"


class EmailSuppression(models.Model):
    """Addresses that must not receive notification email."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(unique=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_suppressions"

    def __str__(self):
        return f"Suppressed email: {self.email}"
