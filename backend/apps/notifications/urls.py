from django.urls import path

from notifications.views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationStreamView
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("stream/", NotificationStreamView.as_view(), name="notification-stream"),
    path(
        "mark-all-read/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "<uuid:pk>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
]