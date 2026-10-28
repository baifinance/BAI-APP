# authentication/views.py
# -----------------------------------------------------------------------
# Define your authentication-related API views here.
#
# Examples:
#   - LoginView             – POST /api/auth/login/
#   - LogoutView            – POST /api/auth/logout/
#   - RegisterView          – POST /api/auth/register/
#   - PasswordResetView     – POST /api/auth/password-reset/
#   - TokenRefreshView      – POST /api/auth/token/refresh/
#
# Use DRF generics or viewsets:
#   from rest_framework import generics, viewsets
# -----------------------------------------------------------------------
import logging
from django.conf import settings
from rest_framework import generics, status, serializers, permissions
from rest_framework.response import Response
from dj_rest_auth.views import (
    LoginView as DjRestAuthLoginView,
    LogoutView as DjRestAuthLogoutView,
    PasswordChangeView as DjRestAuthPasswordChangeView,
)

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.template.loader import render_to_string
from authentication.cookies import (
    ROLE_COOKIE,
    clear_session_cookies,
    set_role_cookie,
)
from authentication.permissions import IsLoanProcessingTeam, IsOtpVerified
from authentication.serializers import LoanProcessingAccountCreateSerializer
from authentication.tokens import revoke_user_tokens
from audit.services import log_action

from asana_integration.services.loan_sync import enqueue_login_sync

from users.models import User
from users.choices import UserStatus
from users.choices import UserRole
from authentication.models import Invitation
from authentication.choices import InviteStatus
from rest_framework.throttling import ScopedRateThrottle


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


class InviteThrottle(ScopedRateThrottle):
    scope = "invite"
from authentication.serializers import SendInviteSerializer, InvitationAcceptSerializer

from otp.services import issue_otp
from otp.utils import clear_otp_verified


logger = logging.getLogger(__name__)

User = get_user_model()

class DisabledPasswordResetView(generics.GenericAPIView):
    """Retired dj-rest-auth token-email password reset.

    The app's canonical recovery flow is OTP-based
    (``/api/otp/send/`` + ``/api/otp/reset-password/``). Leaving the
    token-email flow reachable would allow a second, less-hardened reset path.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = serializers.Serializer

    def post(self, request, *args, **kwargs):
        return Response(
            {
                "detail": (
                    "Password reset via email links is disabled. Request an OTP "
                    "at /api/otp/send/ and reset at /api/otp/reset-password/."
                )
            },
            status=status.HTTP_410_GONE,
        )


class LoanProcessingAccountCreateView(generics.CreateAPIView):
    serializer_class = LoanProcessingAccountCreateSerializer
    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]

    def perform_create(self, serializer):
        user = serializer.save()
        invitation = getattr(user, "invitation", None)

        log_action(
            "LOAN_PROCESSING_ACCOUNT_CREATED",
            actor=self.request.user,
            entity_type="User",
            entity_id=user.id,
            request=self.request,
        )

        if invitation:
            send_invite_email(user, invitation, self.request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Loan Processing account created and invite sent."},
            status=status.HTTP_201_CREATED,
        )

class LoginView(DjRestAuthLoginView):
    """
    Sets access and refresh JWTs in HttpOnly cookies.

    The refresh token is never included in the JSON response.
    The access token is returned only in development to simplify
    local API testing; production keeps both tokens cookie-only.
    Requires a Cloudflare Turnstile token (fail-closed) unless disabled.
    """
    authentication_classes = ()  # Ignores stale headers/cookies
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        if getattr(settings, "TURNSTILE_ENABLED", True):
            from authentication.turnstile import TURNSTILE_ERROR_MESSAGES, verify_turnstile

            token = (request.data.get("turnstile_token") or "").strip()
            xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
            remoteip = (xff.split(",")[0].strip() if xff else "") or request.META.get("REMOTE_ADDR")
            ok, codes = verify_turnstile(token or None, remoteip or None)
            if not ok:
                code = (codes or ["invalid-input-response"])[0]
                msg = TURNSTILE_ERROR_MESSAGES.get(code, "Verification failed, please retry.")
                log_action("LOGIN_BLOCKED_TURNSTILE", request=request)
                return Response({"turnstile": [msg]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return super().post(request, *args, **kwargs)
        except serializers.ValidationError:
            log_action("LOGIN_FAILED", request=request)
            raise

    def get_response(self):
        response = super().get_response()

        # The refresh token must remain HttpOnly-cookie-only in all environments.
        response.data.pop("refresh", None)

        # Keep access visible only in local development for Postman debugging.
        if not settings.DEBUG:
            response.data.pop("access", None)

        user = getattr(self, "user", None)

        if user is not None:
            log_action(
                "LOGIN_SUCCEEDED",
                actor=user,
                entity_type="User",
                entity_id=user.id,
                request=self.request,
            )

        if user is not None and user.mfa_enabled:
            # Never hand out a usable session before the second factor is
            # verified. The OTP verify endpoint issues the JWT + role cookies
            # once the challenge is satisfied; otherwise a reloaded tab would
            # be bounced back into a portal that rejects every IsOtpVerified
            # request (login → portal → 403 → login loop).
            clear_session_cookies(response)
            # Defense in depth: never leave a Django login session usable
            # after a login that still requires the second factor.
            self.request.session.flush()
            try:
                issue_otp(
                    user.email,
                    purpose="login_2fa",
                    ttl=settings.OTP_LOGIN_EXPIRY,
                )
            except Exception:
                logger.exception("Failed to send login OTP for user %s", user.pk)
                response.data = {
                    "detail": "Unable to send a verification code. Please try again."
                }
                response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                return response

            response.data["otp_required"] = True
            response.data["otp_expires_in"] = settings.OTP_LOGIN_EXPIRY
        elif user is not None:
            # Set an HttpOnly, server-authoritative role cookie for portal
            # routing. It stays unreadable to JS (mitigating XSS tampering)
            # while the Next.js proxy can still read it server-side. The backend
            # enforces RBAC regardless, so this is a routing hint, not authZ.
            set_role_cookie(response, user)
            enqueue_login_sync(user, response)

        return response


class LogoutView(DjRestAuthLogoutView):
    """dj-rest-auth logout that also revokes the user's MFA-verified flag."""

    def post(self, request, *args, **kwargs):
        user = getattr(request, "user", None)
        response = super().post(request, *args, **kwargs)
        response.delete_cookie(ROLE_COOKIE, path="/")
        if user is not None and getattr(user, "is_authenticated", False):
            clear_otp_verified(user.id)
            log_action(
                "LOGOUT",
                actor=user,
                entity_type="User",
                entity_id=user.id,
                request=request,
            )
        return response


class PasswordChangeView(DjRestAuthPasswordChangeView):
    """Password change that invalidates any prior MFA verification."""

    def post(self, request, *args, **kwargs):
        user = getattr(request, "user", None)
        response = super().post(request, *args, **kwargs)
        if user is not None and getattr(user, "is_authenticated", False):
            clear_otp_verified(user.id)
            if response.status_code < 400:
                # A password change must invalidate every existing refresh
                # token so a stolen credential cannot keep a session alive.
                revoke_user_tokens(user)
                clear_session_cookies(response)
                log_action(
                    "PASSWORD_CHANGED",
                    actor=user,
                    entity_type="User",
                    entity_id=user.id,
                    request=request,
                )
        return response


def send_invite_email(user, invitation, request):
    """Send invitation email to the user using a separated HTML template."""
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    # Token goes in the URL fragment so it is never sent to servers, logged,
    # or leaked via the Referer header.
    activate_url = f"{frontend_base.rstrip('/')}/auth/activate#token={invitation.token}"

    is_broker = user.role == UserRole.BROKER
    role_label = "broker" if is_broker else "client"

    # Theme palette configuration
    if is_broker:
        theme = {
            "primary_color": "#0284c7",
            "primary_dark": "#0c4a6e",
            "primary_rgb": "2, 132, 199",
            "accent_color": "#f97316",
            "text_strong": "#0f172a",
            "bg_color": "#f1f5f9",
            "pill_bg": "#e0f2fe",
            "pill_text": "#0369a1",
            "radius_card": 12,
            "radius_btn": 8,
        }
    else:
        theme = {
            "primary_color": "#0048cc",
            "primary_dark": "#0a2881",
            "primary_rgb": "0, 72, 204",
            "accent_color": "#e4ba37",
            "text_strong": "#0a2881",
            "bg_color": "#f8fafc",
            "pill_bg": "#e0eafd",
            "pill_text": "#0048cc",
            "radius_card": 18,
            "radius_btn": 12,
        }

    subject = f"Activate your BAI Finance {role_label} account"

    # Fallback plain-text version
    message = (
        f"You have been invited to join BAI Finance as a {role_label}.\n\n"
        f"Please activate your account using the link below:\n\n"
        f"{activate_url}\n\n"
        "This link will expire in 7 days.\n\n"
        "If you did not request this, please ignore this email.\n"
    )

    # Template Context
    context = {
        "subject": subject,
        "activate_url": activate_url,
        "role_label": role_label,
        "current_year": timezone.now().year,
    }

    # Render template into string
    html_content = render_to_string("send_invite.html", context)

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_content,
        fail_silently=False,
    )

class SendInviteView(generics.CreateAPIView):
    """
    Loan Processing-only endpoint to send an invitation email
    to a broker or client.
    POST /api/auth/invitations/send/
    """
    serializer_class = SendInviteSerializer
    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]
    throttle_classes = [InviteThrottle]
    throttle_scope = "invite"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, invitation = serializer.create(
            validated_data=serializer.validated_data,
            actor=request.user
        )

        log_action(
            "INVITATION_SENT",
            actor=request.user,
            entity_type="Invitation",
            entity_id=invitation.id,
            request=request,
        )

        send_invite_email(user, invitation, request)

        return Response(
            {"message": "Invitation sent."},
            status=status.HTTP_201_CREATED,
        )
    
class InvitationValidateView(generics.GenericAPIView):
    """
    Public endpoint to validate an invitation token.
    POST /api/auth/invitations/validate/ with {"token": "<token>"}
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [InviteThrottle]
    throttle_scope = "invite"
    serializer_class = serializers.Serializer # dummy - test

    def post(self, request, *args, **kwargs):
        token = request.data.get("token")
        if not token:
             return Response(
                {"valid": False, "error": "Token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            invitation = Invitation.objects.select_related("user", "sent_by").get(token=token)
        except Invitation.DoesNotExist:
            return Response({"valid": False, "error": "Invalid token."})

        if not invitation.is_valid():
            return Response({"valid": False, "error": "Invitation expired or invalid."})

        user = invitation.user
        compliance_name = ""
        if invitation.sent_by:
            inviter = invitation.sent_by
            full_name = f"{inviter.first_name} {inviter.last_name}".strip()
            compliance_name = full_name or inviter.email or ""

        # Clients are assigned to a broker when the invitation is created; the
        # activation form only displays that assignment. It is not client-
        # selectable, and anonymous callers cannot list brokers.
        broker = getattr(user, "invited_by", None)
        broker_id = None
        broker_name = ""
        if broker and broker.role == UserRole.BROKER:
            broker_id = str(broker.id)
            broker_name = (
                f"{broker.first_name} {broker.last_name}".strip() or broker.email
            )

        return Response(
            {
                "valid": True,
                "email": user.email,
                "role": user.role,
                "invited_by": compliance_name,
                "compliance_name": compliance_name,
                "broker_id": broker_id,
                "broker_name": broker_name,
            }
        )

class InvitationAcceptView(generics.GenericAPIView):
    """
    Public endpoint to accept an invitation and set password.
    POST /api/auth/invitations/accept/
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [InviteThrottle]
    throttle_scope = "invite"
    serializer_class = InvitationAcceptSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save(request=request)

        log_action(
            "INVITATION_ACCEPTED",
            actor=user,
            entity_type="User",
            entity_id=user.id,
            request=request,
        )

        return Response(
            {"message": "Account activated. You can now log in."},
            status=status.HTTP_200_OK,
        )

class InvitationResendView(generics.GenericAPIView):
    """
    Resend invitation email.
    POST /api/auth/invitations/<id>/resend/
    Loan Processing only — state-changing, must be POST with CSRF.
    """
    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]
    throttle_classes = [InviteThrottle]
    throttle_scope = "invite"
    queryset = Invitation.objects.select_related("user")

    def post(self, request, *args, **kwargs):
        invitation = self.get_object()

        if invitation.status != InviteStatus.PENDING:
            return Response(
                {"error": "Invitation is not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.expires_at = timezone.now() + timedelta(days=7)
        invitation.save()

        log_action(
            "INVITATION_RESENT",
            actor=request.user,
            entity_type="Invitation",
            entity_id=invitation.id,
            request=request,
        )

        send_invite_email(invitation.user, invitation, request)

        return Response({"message": "Invitation email resent."})

    # Backward compat: GET returns 405 with guidance
    def get(self, request, *args, **kwargs):
        return Response(
            {"error": "Use POST for this endpoint."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class InvitationRevokeView(generics.GenericAPIView):
    """
    Revoke an invitation.
    POST /api/auth/invitations/<id>/revoke/
    Loan Processing only — state-changing, must be POST with CSRF.
    """
    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]
    throttle_classes = [InviteThrottle]
    throttle_scope = "invite"
    queryset = Invitation.objects.select_related("user")

    def post(self, request, *args, **kwargs):
        invitation = self.get_object()

        if invitation.status == InviteStatus.ACCEPTED:
            return Response(
                {"error": "Cannot revoke an accepted invitation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = InviteStatus.REVOKED
        invitation.save()

        log_action(
            "INVITATION_REVOKED",
            actor=request.user,
            entity_type="Invitation",
            entity_id=invitation.id,
            request=request,
        )

        user = invitation.user
        user.is_active = False
        user.status = UserStatus.INACTIVE
        user.save(update_fields=["is_active", "status"])

        return Response({"message": "Invitation revoked."})

    def get(self, request, *args, **kwargs):
        return Response(
            {"error": "Use POST for this endpoint."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )