# users/views.py
# -----------------------------------------------------------------------
# Define your user-related API views here.
#
# Examples:
#   - UserListView          – GET  /api/users/
#   - UserDetailView        – GET  /api/users/<id>/
#   - UserCreateView        – POST /api/users/
#   - UserUpdateView        – PUT  /api/users/<id>/
#   - UserDeleteView        – DELETE /api/users/<id>/
#
# Use DRF generics or viewsets:
#   from rest_framework import generics, viewsets
# -----------------------------------------------------------------------

import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from authentication.permissions import IsOtpVerified, IsLoanProcessingTeam
from rest_framework.throttling import ScopedRateThrottle

from django.conf import settings

from audit.services import log_action

from users.models import User
from users.pagination import UserListPagination
from otp.utils import verify_otp, mark_otp_verified
from otp.services import issue_otp
from users.serializers import (
    ProfileSerializer,
    MfaEnableSerializer,
    MfaDisableSerializer,
    RegisteredUserSerializer,
)
from notifications.choices import NotificationType
from notifications.services import create_notification, publish_stream_notification


logger = logging.getLogger(__name__)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/users/profile/  → return current user's profile
    PATCH /api/users/profile/ → update first_name / last_name
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get_object(self):
        return self.request.user

class MfaSendThrottle(ScopedRateThrottle):
    scope = "mfa_send"


class MfaDisableThrottle(ScopedRateThrottle):
    scope = "mfa_disable"

class MfaEnableSendView(generics.GenericAPIView):
    """
    POST /api/users/profile/mfa/enable/send/ -> email a verification code
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MfaSendThrottle]
    throttle_scope = "mfa_send"

    def post(self, request, *args, **kwargs):
        user = request.user
        try:
            issue_otp(
                user.email,
                purpose="mfa_enable",
                ttl=settings.OTP_TTL,
            )
        except Exception:
            logger.exception("Failed to send MFA enable OTP for user %s", user.pk)
            return Response(
                {"detail": "Unable to send a verification code. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"detail": "Verification code sent to your email."},
            status=status.HTTP_200_OK
        )

class MfaEnableView(generics.GenericAPIView):
    """
    POST /api/users/profile/mfa/enable/verify/ {"code": "123456"} -> enable MFA.
    """
    serializer_class = MfaEnableSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MfaSendThrottle]
    throttle_scope = "mfa_send"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        success, message = verify_otp(
            user.email, serializer.validated_data["code"], purpose="mfa_enable"
        )
        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        user.mfa_enabled = True
        user.save(update_fields=["mfa_enabled", "updated_at"])

        mark_otp_verified(user.id)

        log_action(
            "MFA_ENABLED",
            actor=user,
            entity_type="User",
            entity_id=user.id,
            request=request,
        )

        notification = create_notification(
            recipient=user,
            notification_type=NotificationType.MFA,
            title="Multi-factor authentication enabled",
            message=(
                "MFA has been enabled on your account. "
                "You will be required to enter an OTP when logging in."
            ),
        )
        publish_stream_notification(user.id, notification)

        return Response({"message": "MFA enabled.", "mfa_enabled": True})

class MfaDisableView(generics.GenericAPIView):
    """
    POST /api/users/profile/mfa/disable/ {"password": "..." } -> disable mfa.
    """
    serializer_class = MfaDisableSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MfaDisableThrottle]
    throttle_scope = "mfa_disable"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data["password"]):
            return Response(
                {"error": "Incorrect Password"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.mfa_enabled = False
        user.save(update_fields=["mfa_enabled", "updated_at"])

        log_action(
            "MFA_DISABLED",
            actor=user,
            entity_type="User",
            entity_id=user.id,
            request=request,
        )

        notification = create_notification(
            recipient=user,
            notification_type=NotificationType.MFA,
            title="Multi-factor authentication disabled",
            message=(
                "MFA has been disabled on your account. "
                "Your account is now using password-only login."
            ),
        )
        publish_stream_notification(user.id, notification)

        return Response({"message": "MFA disabled.", "mfa_enabled": False})


class UserListView(generics.ListAPIView):
    """
    GET /api/users/ -> Returns all registered users from the database.
    Used by the Compliance portal and user administration.
    """
    serializer_class = RegisteredUserSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsLoanProcessingTeam,
        IsOtpVerified,
    ]
    pagination_class = UserListPagination

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined", "-created_at")