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

from django.conf import settings
from rest_framework import generics, status, serializers, permissions
from rest_framework.response import Response
from dj_rest_auth.views import LoginView as DjRestAuthLoginView

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from authentication.permissions import IsLoanProcessingTeam
from authentication.serializers import LoanProcessingAccountCreateSerializer
from audit.models import AuditLog

from users.models import User, ClientProfile, BrokerProfile
from users.choices import UserStatus
from users.choices import UserRole
from authentication.models import Invitation
from authentication.choices import InviteStatus
from authentication.serializers import SendInviteSerializer, InvitationAcceptSerializer


User = get_user_model()

class LoanProcessingAccountCreateView(generics.CreateAPIView):
    serializer_class = LoanProcessingAccountCreateSerializer
    permission_classes = [IsLoanProcessingTeam]

    def perform_create(self, serializer):
        user = serializer.save(request=self.request)
        invitation = getattr(user, "invitation", None)

        AuditLog.objects.create(
            actor=self.request.user,
            action="LOAN_PROCESSING_ACCOUNT_CREATED",
            entity_type="User",
            entity_id=user.id,
            ip_address=self.request.META.get("REMOTE_ADDR")
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
    """
    authentication_classes = ()  # Ignores stale headers/cookies
    permission_classes = [permissions.AllowAny]

    def get_response(self):
        response = super().get_response()

        # The refresh token must remain HttpOnly-cookie-only in all environments.
        response.data.pop("refresh", None)

        # Keep access visible only in local development for Postman debugging.
        if not settings.DEBUG:
            response.data.pop("access", None)

        return response

def send_invite_email(user, invitation, request):
    """Send invitation email to the user using a separated HTML template."""
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    activate_url = f"{frontend_base}/auth/activate?token={invitation.token}"

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
    permission_classes = [IsLoanProcessingTeam]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, invitation = serializer.create(
            validated_data=serializer.validated_data,
            actor=request.user
        )

        # Optional audit log
        # AuditLog.objects.create(...)

        send_invite_email(user, invitation, request)

        return Response(
            {"message": "Invitation sent."},
            status=status.HTTP_201_CREATED,
        )
    
class InvitationValidateView(generics.GenericAPIView):
    """
    Public endpoint to validate an invitation token.
    GET /api/auth/invitations/validate/?token=<token>
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = serializers.Serializer # dummy - test

    def get(self, request, *args, **kwargs):
        token = request.query_params.get("token")
        if not token:
             return Response(
                {"valid": False, "error": "Token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            invitation = Invitation.objects.select_related("user").get(token=token)
        except Invitation.DoesNotExist:
            return Response({"valid": False, "error": "Invalid token."})

        if not invitation.is_valid():
            return Response({"valid": False, "error": "Invitation expired or invalid."})

        user = invitation.user
        return Response(
            {
                "valid": True,
                "email": user.email,
                "role": user.role,
            }
        )

class InvitationAcceptView(generics.GenericAPIView):
    """
    Public endpoint to accept an invitation and set password.
    POST /api/auth/invitations/accept/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = InvitationAcceptSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save(request=request)

        # Optional audit log
        # AuditLog.objects.create(...)

        return Response(
            {"message": "Account activated. You can now log in."},
            status=status.HTTP_200_OK,
        )

class InvitationResendView(generics.RetrieveAPIView):
    """
    Resend invitation email.
    GET /api/auth/invitations/<id>/resend/
    Only Compliance users should be allowed.
    """
    # permission_classes = [IsComplianceTeam]
    queryset = Invitation.objects.select_related("user")

    def retrieve(self, request, *args, **kwargs):
        invitation = self.get_object()

        if invitation.status != InviteStatus.PENDING:
            return Response(
                {"error": "Invitation is not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.expires_at = timezone.now() + timedelta(days=7)
        invitation.save()

        send_invite_email(invitation.user, invitation, request)

        return Response({"message": "Invitation email resent."})

class InvitationRevokeView(generics.RetrieveAPIView):
    """
    Revoke an invitation.
    GET /api/auth/invitations/<id>/revoke/
    Only Compliance users should be allowed.
    """
    # permission_classes = [IsComplianceTeam]
    queryset = Invitation.objects.select_related("user")

    def retrieve(self, request, *args, **kwargs):
        invitation = self.get_object()

        if invitation.status == InviteStatus.ACCEPTED:
            return Response(
                 {"error": "Cannot revoke an accepted invitation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = InviteStatus.REVOKED
        invitation.save()

        user = invitation.user
        if not user.is_active:
            user.is_active = False
            user.status = UserStatus.INACTIVE
            user.save()

        return Response({"message": "Invitation revoked."})