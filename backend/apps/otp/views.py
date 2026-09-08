from rest_framework import generics, status, permissions
from rest_framework.response import Response
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from .utils import generate_otp, store_otp, verify_otp
from .serializers import OtpSendSerializer, OtpVerifySerializer

PURPOSE_LABELS = {
    "login": "log in",
    "signup": "verify your email",
    "reset_password": "reset your password",
    "invite_verify": "accept your invitation", 
}


DEFAULT_THEME = {
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


class OtpSendView(generics.CreateAPIView):
    serializer_class = OtpSendSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        purpose = serializer.validated_data.get("purpose", "login")
        
        expiry_minutes = getattr(settings, "OTP_TTL", 180)
        code = generate_otp(size=getattr(settings, "OTP_SIZE", 6))
        store_otp(email, code, purpose=purpose)

        theme = DEFAULT_THEME
        purpose_label = PURPOSE_LABELS.get(purpose, "continue")
        subject = f"Your Bāi Finance verification code"

        message = (
            f"Your Bāi Finance verification code is: {code}\n\n"
            f"Use it to {purpose_label}. It expires in {expiry_minutes} minutes.\n\n"
            "If you did not request this, please ignore this email."
        )

        context = {
            "subject": subject,
            "otp_code": code,
            "purpose_label": purpose_label,
            "expiry_minutes": expiry_minutes,
            "current_year": timezone.now().year,
            **theme,
        }

        html_content = render_to_string("send_otp.html", context)

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_content,
            fail_silently=False,
        )

        return Response(
            {"detail": f"OTP sent to {email}"},
            status=status.HTTP_200_OK,
        )

class OtpVerifyView(generics.GenericAPIView):
    serializer_class = OtpVerifySerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        purpose = serializer.validated_data.get("purpose", "login")

        success, message = verify_otp(email, code, purpose=purpose)
        if success:
            # Return user info or token depending on purpose
            return Response({"message": message}, status=status.HTTP_200_OK)
        return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

    