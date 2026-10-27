"""Permissions for the audit read API."""

from rest_framework import permissions

from users.choices import UserRole


class IsAuditReader(permissions.BasePermission):
    """Allow only superusers and compliance staff to read audit records."""

    message = "You do not have permission to view audit logs."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser or getattr(user, "role", None) == UserRole.COMPLIANCE
