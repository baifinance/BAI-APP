from rest_framework import serializers
from .utils import generate_otp, store_otp

class OtpSendSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=[("login", "Login"), ("reset_password", "Password Reset"), 
                 ("invite_verify", "Invitation Verification")],
        default="login"
    )

class OtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(
            choices=[("login", "Login"), ("reset_password", "Password Reset"), 
                     ("invite_verify", "Invitation Verification")],
            default="login"
        )
