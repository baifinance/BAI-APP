# apps/authentication/permissions.py
from rest_framework import permissions
from apps.users.choices import UserRole

class IsLoanProcessingTeam(permissions.BasePermission):
    """
    Only users with role = LOAN_PROCESSING.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (
                request.user.is_superuser
                or getattr(request.user, "role", None) == UserRole.LOAN_PROCESSING
            )

class IsLoanProcessingOrSelf(permissions.BasePermission):
    """
    - Loan Processing Team: full access.
    - Others: only read/update their own profile.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, "role", None) == UserRole.LOAN_PROCESSING:
            return True

        # For safe methods on self
        if view.action in ["retrieve", "update", "partial_update"]:
             # Will be further checked in has_object_permission
             return True

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, "role", None) == UserRole.LOAN_PROCESSING:
            return True
        return obj == request.user