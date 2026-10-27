"""Loan-related choice enumerations.

Defines the valid status transitions for a :class:`LoanApplication`.
"""

from django.db import models


class ApplicationStatus(models.TextChoices):
    """Lifecycle states a loan application can occupy."""

    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    IN_REVIEW = "in_review", "In_Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    SETTLED = "settled", "Settled"
    WITHDRAWN = "withdrawn", "Withdrawn"
