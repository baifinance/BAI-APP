"""Serializers for the audit read API."""

from rest_framework import serializers

from audit.models import AuditLog


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
