"""Shared OTP delivery helpers (email + labels)"""

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

PURPOSE_LABELS = {
    "login": "log in",
    "signup": "verify your email",
    "reset_password": "reset your password",
    "invite_verify": "accept your invitation", 
    "login_2fa": "verify your login",
    "mfa_enable": "enable two-factor authentication"
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


def send_otp_email(email, code, purpose="login", expires_in=None):
    """Render and dispatch the branded OTP email."""
    purpose_label = PURPOSE_LABELS.get(purpose, "continue")
    if purpose == "login_2fa":
        expires_in = expires_in or getattr(settings, "OTP_LOGIN_EXPIRY", 120)
    else:
        expires_in = expires_in or getattr(settings, "OTP_TTL", 180)

    subject = "Your Bai App Verification code"
    message = (
        f"Your Bai App verification code is: {code}\n\n"
        f"Use it to {purpose_label}. It expires in {expires_in} seconds"
        "If you did not request this, please ignore this email."
    )
    context = {
        "subject": subject,
        "otp_code": code,
        "purpose_label": purpose_label,
        "expiry_minutes": max(1, round(expires_in / 60)),
        "current_year": timezone.now().year,
        **DEFAULT_THEME
    }
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        html_message=render_to_string("send_otp.html", context),
        fail_silently=False
    )