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

    