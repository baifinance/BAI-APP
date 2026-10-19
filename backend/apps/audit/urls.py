"""URL routes for the audit app."""

from django.urls import path

from audit.views import AuditLogListView

urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-log-list"),
]
