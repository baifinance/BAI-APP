from django.urls import path
from otp.views import OtpSendView, OtpVerifyView

urlpatterns = [
    path("send/", OtpSendView.as_view(), name="otp-send"),
    path("verify/", OtpVerifyView.as_view(), name="otp-verify"),
]