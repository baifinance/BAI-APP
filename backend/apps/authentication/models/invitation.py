# users/models/invitation.py
import uuid
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from authentication.choices import InviteStatus

class Invitation(models.Model):
    """
    One-time invitation token used to activate a user account.

    Lifecycle:
      - Created when Compliance creates a broker (or client/compliance) user.
      - Token is emailed to the user.
      - User calls /api/auth/invitations/accept/ with the token + password.
      - Invitation becomes ACCEPTED and user is activated.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Primary key. Unique identifier.",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="invitations",
        db_column="user_id",
        help_text="Target user account associated with the invitation.",
    )

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invitations",
        db_column="sent_by",
        help_text="Admin or user who generated/sent the invitation.",
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        help_text="Unique, secure token embedded in the email link.",
    )

    expires_at = models.DateTimeField(
        help_text="Expiration date and time for security.",
    )

    status = models.CharField(
        max_length=20,
        choices=InviteStatus.choices,
        default=InviteStatus.PENDING,
        help_text="Current state of the invitation link.",
    )

    created_at = models .DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "invitations"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_valid(self):
        """Return True if the invitation is pending and not expired."""
        now = timezone.now()
        return (
            self.status == InviteStatus.PENDING
            and self.expires_at > now
        )

    def __str__(self):
        return f"Invitation {self.token[:8]}... for user {self.user.email}"