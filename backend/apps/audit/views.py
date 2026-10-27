"""Read-only API for audit records."""

from rest_framework import generics

from audit.models import AuditLog
from authentication.permissions import IsOtpVerified
from audit.pagination import AuditLogPagination
from audit.permissions import IsAuditReader
from audit.serializers import AuditLogQuerySerializer, AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/audit/logs/ — newest-first audit trail for compliance.

    Optional filters: ``action``, ``entity_type``, ``entity_id``, ``actor``,
    ``since`` and ``until`` (ISO-8601 timestamps).
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditReader, IsOtpVerified]
    pagination_class = AuditLogPagination
    queryset = AuditLog.objects.select_related("actor").all()

    def get_queryset(self):
        qs = super().get_queryset()
        params = {
            key: value
            for key, value in self.request.query_params.items()
            if value
        }
        query = AuditLogQuerySerializer(data=params)
        query.is_valid(raise_exception=True)
        filters = query.validated_data

        action = filters.get("action")
        if action:
            qs = qs.filter(action=action)

        entity_type = filters.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        entity_id = filters.get("entity_id")
        if entity_id:
            qs = qs.filter(entity_id=entity_id)

        actor = filters.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)

        since = filters.get("since")
        if since:
            qs = qs.filter(occurred_at__gte=since)

        until = filters.get("until")
        if until:
            qs = qs.filter(occurred_at__lte=until)

        return qs
