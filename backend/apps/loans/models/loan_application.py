"""LoanApplication model.

Represents a single loan application submitted by a client, optionally
assigned to a broker, and tracked through a lifecycle of statuses.
"""

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from loans.choices import ApplicationStatus


class LoanApplication(models.Model):
    """A loan application tied to a client and optionally a broker.

    Tracks the requested amount, chosen lender, current status, and
    audit timestamps (``created_at`` / ``updated_at``).
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    client = models.ForeignKey(
        "users.ClientProfile",
        on_delete=models.PROTECT,
        related_name="loan_applications",
    )

    broker = models.ForeignKey(
        "users.BrokerProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_applications",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        null=True,
        blank=True,
    )

    lender = models.CharField(max_length=255, blank=True)

    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.DRAFT,
    )

    asana_project_gid = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
    )
    asana_task_gid = models.CharField(
        max_length=64,
        blank=True,
        null=True,
    )
    asana_project_name = models.CharField(max_length=255, blank=True, null=True)
    asana_task_name = models.CharField(max_length=255, blank=True, null=True)
    asana_status = models.CharField(max_length=100, blank=True, null=True)
    asana_status_history = models.JSONField(default=dict, blank=True)
    asana_created_at = models.DateTimeField(null=True, blank=True)
    asana_synced_at = models.DateTimeField(auto_now=True)
    is_primary = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_applications",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loan_applications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(
                fields=["client", "asana_project_gid"],
                name="loan_applic_client_proj_idx",
            ),
            models.Index(fields=["broker", "status"]),
            models.Index(fields=["created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["asana_project_gid", "asana_task_gid"],
                name="unique_asana_project_task",
            )
        ]

    def __str__(self):
        """Return a human-readable label showing the application ID and status."""
        return f"Application {self.id} — {self.get_status_display()}"