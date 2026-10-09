from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()


class OtpSendSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=[("login", "Login"), ("reset_password", "Password Reset"), ("login_2fa", "Login OTP"),
                 ("invite_verify", "Invitation Verification")],
        default="login"
    )

class OtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(
            choices=[("login", "Login"), ("reset_password", "Password Reset"), ("login_2fa", "Login OTP"),
                     ("invite_verify", "Invitation Verification")],
            default="login"
        )


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        try:
            user = User.objects.get(
                email__iexact=attrs["email"].strip(),
                is_active=True,
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "Invalid email or verification code."}
            )

        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})

        attrs["email"] = user.email
        attrs["user"] = user
        return attrs
