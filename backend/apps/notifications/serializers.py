from rest_framework import serializers

from notifications.models import Notification


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