import logging

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from django.conf import settings

from audit.services import log_action
from authentication.cookies import issue_session_cookies
from authentication.tokens import revoke_user_tokens
from users.models import User
from .serializers import (
    OtpSendSerializer,
    OtpVerifySerializer,
    PasswordResetSerializer,
)
from .utils import (
    verify_otp,
    mark_otp_verified,
    clear_otp_verified,
)
from .services import issue_otp

from asana_integration.services.loan_sync import enqueue_login_sync


logger = logging.getLogger(__name__)

class OtpSendThrottle(AnonRateThrottle):
    scope = "otp"


class OtpSendEmailThrottle(SimpleRateThrottle):
    """Per-recipient throttle so one address cannot be spammed from many IPs."""

    scope = "otp_email"

    def get_cache_key(self, request, view):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}


class OtpVerifyThrottle(AnonRateThrottle):
    scope = "otp_verify"



class OtpSendView(generics.CreateAPIView):
    serializer_class = OtpSendSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OtpSendThrottle, OtpSendEmailThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        purpose = serializer.validated_data.get("purpose", "login")

        # Only issue codes for eligible, existing accounts. The response is
        # always generic so this endpoint cannot be used to enumerate users.
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        eligible = False
        if purpose == "login_2fa":
            eligible = bool(user and user.mfa_enabled)
        elif purpose in ("login", "reset_password"):
            eligible = bool(user)

        if eligible:
            # login_2fa code live for 2 minutes; other OTPs use OTP_TTL
            ttl = settings.OTP_LOGIN_EXPIRY if purpose == "login_2fa" else settings.OTP_TTL
            try:
                issue_otp(email, purpose=purpose, ttl=ttl)
            except Exception:
                logger.exception("Failed to send %s OTP", purpose)

        return Response(
            {"detail": "If an account exists for this email, a code has been sent."},
            status=status.HTTP_200_OK,
        )

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

        consume = purpose != "reset_password"
        success, message = verify_otp(email, code, purpose=purpose, consume=consume)
        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        if purpose == "login_2fa":
            user = User.objects.filter(
                email__iexact=email,
                is_active=True,
                mfa_enabled=True,
            ).first()
            if user is None:
                return Response(
                    {"error": "OTP verification failed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            mark_otp_verified(user.id)
            log_action(
                "MFA_VERIFIED",
                actor=user,
                entity_type="User",
                entity_id=user.id,
                request=request,
            )
            response = Response(
                {"message": message, "verified": True},
                status=status.HTTP_200_OK,
            )
            # Login does not issue JWTs until MFA succeeds; this is where the
            # session becomes usable.
            issue_session_cookies(response, user)
            enqueue_login_sync(user, response)
            return response

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

        # A password change invalidates any prior MFA verification for this user.
        clear_otp_verified(user.id)

        # A reset may be performed by someone other than the account owner;
        # force every existing session to re-authenticate.
        revoke_user_tokens(user)
        log_action(
            "PASSWORD_RESET",
            actor=user,
            entity_type="User",
            entity_id=user.id,
            request=request,
        )

        return Response(
            {"message": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )