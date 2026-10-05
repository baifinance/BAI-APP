# apps/authentication/permissions.py
from rest_framework import permissions
from users.choices import UserRole
from otp.utils import is_otp_verified

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

class IsOtpVerified(permissions.BasePermission):
    """Block a session until an mfa-enabled user passes the 2-min login OTP"""

    message = "OTP verification required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not user.mfa_enabled:
            return True
        return is_otp_verified(user.id)