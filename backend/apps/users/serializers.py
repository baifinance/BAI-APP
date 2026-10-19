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
    """Read-only view of the authenticated user for dj-rest-auth's
    ``/api/auth/user/`` endpoint.

    Every field is read-only: the endpoint is served by a
    ``RetrieveUpdateAPIView``, and exposing ``role``/``status``/``is_active``/
    ``mfa_enabled`` as writable allowed any authenticated user to escalate
    privileges (e.g. PATCH ``{"role": "loan_processing"}``) or silently
    disable their own MFA. Profile edits go through
    ``PATCH /api/users/profile/`` (``ProfileSerializer``) instead.
    """
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
        read_only_fields = fields

class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    client_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "role",
            "client_profile",
        ]
        read_only_fields = [
            "id",
            "email",
            "role",
            "client_profile",
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.email

    def get_client_profile(self, obj):
        """Expose the caller's own Asana-sourced profile (clients only).

        Replaces the previous practice of shipping this PII in the login
        response and caching it in the browser's sessionStorage.
        """
        if getattr(obj, "role", None) != "client":
            return None
        try:
            profile = obj.client_profile
        except Exception:
            return None
        return {
            "fullname": profile.asana_fullname
            or f"{obj.first_name} {obj.last_name}".strip()
            or obj.email,
            "email": obj.email,
            "mobile": profile.mobile,
            "address": profile.address,
            "dob": profile.dob,
            "visa": profile.visa,
            "visa_subclass": profile.visa_subclass,
            "visa_expiry": profile.visa_expiry,
            "loan_amount": profile.loan_amount,
            "goal": profile.goal,
            "source": profile.source,
            "inquiry": profile.inquiry,
            "loan_status": profile.loan_status,
        }

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


class ActiveUserSerializer(serializers.ModelSerializer):
    """Compact representation used by staff account-management screens."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "full_name", "email", "role"]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.email
