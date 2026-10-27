"""Custom User model replacing Django's default auth user."""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from users.choices import UserRole, UserStatus


class User(AbstractUser):
    """Custom user model with UUID primary key, email-based auth, and role/status tracking.

    Extends Django's AbstractUser to support role-based access control,
    account status management, and multi-factor authentication.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
    )

    status = models.CharField(
        max_length=20,
        choices=UserStatus.choices,
        default=UserStatus.ACTIVE,
    )

    mfa_enabled = models.BooleanField(default=False)

    invited_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invited_users",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"

    def __str__(self):
        """Return the user's email address as the string representation."""
        return self.email