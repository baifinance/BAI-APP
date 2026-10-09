# users/serializers.py
# -----------------------------------------------------------------------
# Define your user-related serializers here.
#
# Examples:
#   - UserSerializer       – serialize/deserialize User model
#   - UserCreateSerializer – handle user registration payload
# -----------------------------------------------------------------------

from rest_framework import serializers  # noqa: F401
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
             "id",
            "email",
            "username",
            "role",
            "status",
            "mfa_enabled",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "role",
        ]
        read_only_fields = [
            "id",
            "email",
            "role"
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.email

class MfaEnableSerializer(serializers.Serializer):
    """Verify the emailed code before turning MFA on"""
    code = serializers.CharField(max_length=6, min_length=6)

class MfaDisableSerializer(serializers.Serializer):
    """Confirm identity with the current password before turning MFA off"""
    password = serializers.CharField(write_only=True)


class RegisteredUserSerializer(serializers.ModelSerializer):
    """Serializer for displaying registered users in Compliance & administrative views."""
    full_name = serializers.SerializerMethodField()
    registered_date = serializers.SerializerMethodField()
    formatted_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "role",
            "formatted_role",
            "status",
            "registered_date",
            "created_at",
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        if name:
            return name
        email_prefix = obj.email.split("@")[0].replace(".", " ").replace("_", " ").title()
        return email_prefix if email_prefix else obj.email

    def get_formatted_role(self, obj):
        role_map = {
            "client": "Client",
            "broker": "Broker",
            "loan_processing": "Loan Processing",
            "compliance": "Compliance",
        }
        return role_map.get(str(obj.role).lower(), str(obj.role).replace("_", " ").title())

    def get_registered_date(self, obj):
        dt = getattr(obj, "created_at", None) or getattr(obj, "date_joined", None)
        if dt:
            return dt.strftime("%b %d, %Y")
        return "N/A"

