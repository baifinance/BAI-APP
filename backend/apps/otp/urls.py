from django.urls import path
from otp.views import OtpSendView, OtpVerifyView, PasswordResetView

urlpatterns = [
    path("send/", OtpSendView.as_view(), name="otp-send"),
    path("verify/", OtpVerifyView.as_view(), name="otp-verify"),
    path(
        "reset-password/",
        PasswordResetView.as_view(),
        name="otp-reset-password",
    ),
]