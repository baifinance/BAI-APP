from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.conf import settings
from users.models import User
from .serializers import (
    OtpSendSerializer,
    OtpVerifySerializer,
    PasswordResetSerializer,
)
from .utils import generate_otp, store_otp, verify_otp, mark_otp_verified
from .services import send_otp_email

class OtpSendThrottle(AnonRateThrottle):
    scope = "otp"


class OtpVerifyThrottle(AnonRateThrottle):
    scope = "otp_verify"



class OtpSendView(generics.CreateAPIView):
    serializer_class = OtpSendSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OtpSendThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        purpose = serializer.validated_data.get("purpose", "login")

        # login_2fa code live for 2 minutes; other OTPs use OTP_TTL
        if purpose == "login_2fa":
            ttl = settings.OTP_LOGIN_EXPIRY
        else:
            ttl = settings.OTP_TTL

        code = generate_otp(size=settings.OTP_SIZE)
        store_otp(email, code, purpose=purpose, ttl=ttl)
        send_otp_email(email, code, purpose=purpose)

        return Response({"detail": f"OTP sent to {email}"}, status=status.HTTP_200_OK)

class OtpVerifyView(generics.GenericAPIView):
    serializer_class = OtpVerifySerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OtpVerifyThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purpose = serializer.validated_data.get("purpose", "login")

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        success, message = verify_otp(email, code, purpose=purpose)
        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        if purpose == "login_2fa":
            try:
                user = User.objects.get(email__iexact=email)
                mark_otp_verified(user.id)
            except User.DoesNotExist:
                pass

        return Response(
            {"message": message, "verified": True},
            status=status.HTTP_200_OK,
        )


class PasswordResetView(generics.GenericAPIView):
    """
    Verify a password-reset OTP and change the password in one operation.

    POST /api/otp/reset-password/
    """

    serializer_class = PasswordResetSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OtpVerifyThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        success, message = verify_otp(
            email,
            code,
            purpose="reset_password",
        )
        if not success:
            return Response(
                {"error": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password", "updated_at"])

        return Response(
            {"message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )