"""Read-only API for audit records."""

from rest_framework import generics

from audit.models import AuditLog
from audit.pagination import AuditLogPagination
from audit.permissions import IsAuditReader
from audit.serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/audit/logs/ — newest-first audit trail for compliance.

    Optional filters: ``action``, ``entity_type``, ``entity_id``, ``actor``,
    ``since`` and ``until`` (ISO-8601 timestamps).
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditReader]
    pagination_class = AuditLogPagination
    queryset = AuditLog.objects.select_related("actor").all()

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        action = params.get("action")
        if action:
            qs = qs.filter(action=action)

        entity_type = params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        entity_id = params.get("entity_id")
        if entity_id:
            qs = qs.filter(entity_id=entity_id)

        actor = params.get("actor")
        if actor:
            qs = qs.filter(actor_id=actor)

        since = params.get("since")
        if since:
            qs = qs.filter(occurred_at__gte=since)

        until = params.get("until")
        if until:
            qs = qs.filter(occurred_at__lte=until)

        return qs
