"""Serializers for the audit read API."""

from rest_framework import serializers

from audit.models import AuditLog


class AuditLogQuerySerializer(serializers.Serializer):
    action = serializers.CharField(max_length=100, required=False)
    entity_type = serializers.CharField(max_length=100, required=False)
    entity_id = serializers.UUIDField(required=False)
    actor = serializers.UUIDField(required=False)
    since = serializers.DateTimeField(required=False)
    until = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        since = attrs.get("since")
        until = attrs.get("until")
        if since and until and since > until:
            raise serializers.ValidationError(
                "`since` must be earlier than or equal to `until`."
            )
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_email",
            "action",
            "entity_type",
            "entity_id",
            "occurred_at",
            "ip_address",
        ]
        read_only_fields = fields

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor_id and obj.actor else None
