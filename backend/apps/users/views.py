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

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from authentication.permissions import IsOtpVerified
from rest_framework.throttling import ScopedRateThrottle

from django.conf import settings

from users.serializers import ProfileSerializer
from otp.utils import generate_otp, store_otp, verify_otp, mark_otp_verified
from otp.services import send_otp_email
from users.serializers import (
    ProfileSerializer,
    MfaEnableSerializer,
    MfaDisableSerializer
)
from notifications.choices import NotificationType
from notifications.services import create_notification, publish_stream_notification


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

class MfaEnableSendView(generics.GenericAPIView):
    """
    POST /api/users/profile/mfa/enable/send/ -> email a verification code
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MfaSendThrottle]

    def post(self, request, *args, **kwargs):
        user = request.user
        code = generate_otp(size=settings.OTP_SIZE)
        store_otp(user.email, code, purpose="mfa_enable", ttl=settings.OTP_TTL)
        send_otp_email(user.email, code, purpose="mfa_enable")
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