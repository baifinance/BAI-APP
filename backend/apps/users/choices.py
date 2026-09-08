"""Choice enumerations for the users app."""

from django.db import models


class UserRole(models.TextChoices):
    """System roles assigned to users."""

    CLIENT = "client", "Client"
    BROKER = "broker", "Broker"
    LOAN_PROCESSING = "loan_processing", "Loan Processing"


class UserStatus(models.TextChoices):
    """Account status for user lifecycle management."""

    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    SUSPENDED = "suspended", "Suspended"


class VerificationStatus(models.TextChoices):
    """Verification state for client and broker profiles."""

    PENDING = "pending", "Pending"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"