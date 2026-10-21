from rest_framework import serializers

from notifications.models import Notification, NotificationPreference, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        source="get_notification_type_display",
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "related_object_type",
            "related_object_id",
            "is_read",
            "created_at",
            "read_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "push_enabled",
            "email_critical_enabled",
            "email_optional_enabled",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ["endpoint", "p256dh", "auth", "user_agent"]
        extra_kwargs = {
            "user_agent": {"required": False, "allow_blank": True},
        }


class PushUnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1000)


class EmailPreferencesSerializer(serializers.Serializer):
    token = serializers.CharField()
    scope = serializers.ChoiceField(
        choices=["all", "critical", "optional"],
        required=False,
        default="all",
    )
