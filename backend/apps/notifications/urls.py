from django.urls import path

from notifications.views import (
    EmailPreferencesView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationPreferenceView,
    NotificationStreamView,
    PushConfigView,
    PushSubscribeView,
    PushTestView,
    PushUnsubscribeView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("stream/", NotificationStreamView.as_view(), name="notification-stream"),
    path(
        "preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences",
    ),
    path(
        "push/config/",
        PushConfigView.as_view(),
        name="notification-push-config",
    ),
    path(
        "push/subscribe/",
        PushSubscribeView.as_view(),
        name="notification-push-subscribe",
    ),
    path(
        "push/unsubscribe/",
        PushUnsubscribeView.as_view(),
        name="notification-push-unsubscribe",
    ),
    path(
        "push/test/",
        PushTestView.as_view(),
        name="notification-push-test",
    ),
    path(
        "email/preferences/",
        EmailPreferencesView.as_view(),
        name="notification-email-preferences",
    ),
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