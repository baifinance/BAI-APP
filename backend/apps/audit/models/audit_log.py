"""AuditLog model – immutable record of auditable actions.

Each row captures *who* did *what* to *which entity* and *when*,
forming a tamper-evident history for compliance and debugging.
"""

import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Immutable record of a single auditable action.

    Stores the actor, action verb, target entity, timestamp, and
    originating IP address.  Rows are never updated or deleted by
    application code.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
    )

    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.UUIDField(null=True, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["occurred_at"]),
        ]

    def __str__(self):
        """Return a human-readable summary like ``'create by 3 on order'``."""
        return f"{self.action} by {self.actor_id} on {self.entity_type}"

    def save(self, *args, **kwargs):
        """Allow inserts only; audit rows must never be rewritten."""
        if not self._state.adding:
            raise ValueError("Audit log rows are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Refuse deletion from application code."""
        raise ValueError("Audit log rows are immutable.")