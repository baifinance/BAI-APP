import json
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from authentication.permissions import IsOtpVerified
from notifications.models import Notification, NotificationPreference, PushSubscription
from notifications.serializers import (
    EmailPreferencesSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    PushSubscriptionSerializer,
    PushUnsubscribeSerializer,
)
from notifications.tokens import read_email_preferences_token
from otp.utils import get_redis_client


NOTIFICATION_HISTORY_LIMIT = 100
STREAM_MAX_LIFETIME_SECONDS = 1800


class EventStreamRenderer(BaseRenderer):
    """Let DRF content negotiation accept SSE requests."""

    media_type = "text/event-stream"
    format = "sse"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsOtpVerified
    ]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user
        ).order_by("-created_at")

        unread_only = self.request.query_params.get("unread")
        if unread_only == "true":
            queryset = queryset.filter(is_read=False)

        return queryset[:NOTIFICATION_HISTORY_LIMIT]

class NotificationMarkReadView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsOtpVerified
    ]

    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user
        )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read","read_at"])

        return Response(NotificationSerializer(notification).data)

class NotificationMarkAllReadView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        IsOtpVerified
    ]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now(),
        )

        return Response(
            {"updated_count": updated_count},
            status=status.HTTP_200_OK,
        )

class NotificationStreamView(APIView):
    """
    GET /api/notifications/stream/

    Server-sent Events: emits a ping on the user's Redis channel whenever
    a notification is created, so clients refresh instantly instead of
    waiting on the 30s poll.
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsOtpVerified
    ]
    renderer_classes = [EventStreamRenderer]

    def get(self, request):
        pubsub = get_redis_client().pubsub()
        pubsub.subscribe(f"notify:{request.user.id}")

        def event_stream():
            try:
                yield "retry: 3000\n\n"
                yield f"event: snapshot\ndata: {json.dumps({'ok': True})}\n\n"
                deadline = time.monotonic() + STREAM_MAX_LIFETIME_SECONDS
                while time.monotonic() < deadline:
                    message = pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=25,
                    )
                    if message and message.get("type") == "message":
                        data = message["data"]
                        if isinstance(data, bytes):
                            data = data.decode()
                        data = data.replace("\r", "").replace("\n", "")
                        yield f"event: notification\ndata: {data}\n\n"
                    else:
                        yield ": keepalive\n\n" # keep proxies/NAT alive

            finally:
                pubsub.close()

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

class PushTestThrottle(ScopedRateThrottle):
    scope = "push_test"


class NotificationPreferenceView(APIView):
    """GET/PATCH the signed-in user's delivery preferences."""

    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get(self, request):
        preference, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        return Response(NotificationPreferenceSerializer(preference).data)

    def patch(self, request):
        preference, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        serializer = NotificationPreferenceSerializer(
            preference,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PushConfigView(APIView):
    """Public VAPID key and channel status used by the service worker client."""

    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get(self, request):
        enabled = bool(getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", False))
        public_key = getattr(settings, "VAPID_PUBLIC_KEY", "") if enabled else ""
        return Response(
            {
                "enabled": enabled and bool(public_key),
                "public_key": public_key,
            }
        )


class PushSubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def post(self, request):
        if not getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", False):
            return Response(
                {"detail": "Push notifications are not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription, _ = PushSubscription.objects.update_or_create(
            endpoint=serializer.validated_data["endpoint"],
            defaults={
                "user": request.user,
                "p256dh": serializer.validated_data["p256dh"],
                "auth": serializer.validated_data["auth"],
                "user_agent": serializer.validated_data.get("user_agent", ""),
            },
        )

        preference, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        if not preference.push_enabled:
            preference.push_enabled = True
            preference.save(update_fields=["push_enabled", "updated_at"])

        return Response({"subscribed": True, "subscription_id": str(subscription.pk)})


class PushUnsubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def post(self, request):
        serializer = PushUnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PushSubscription.objects.filter(
            user=request.user,
            endpoint=serializer.validated_data["endpoint"],
        ).delete()

        preference, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        if not PushSubscription.objects.filter(user=request.user).exists():
            preference.push_enabled = False
            preference.save(update_fields=["push_enabled", "updated_at"])

        return Response({"subscribed": False})


class PushTestView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]
    throttle_classes = [PushTestThrottle]
    throttle_scope = "push_test"

    def post(self, request):
        from notifications.push import send_test_push

        sent = send_test_push(request.user)
        if sent == 0:
            return Response(
                {"sent": 0, "detail": "No active push subscriptions."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"sent": sent})


class EmailPreferencesView(APIView):
    """Signed-link email preference endpoint used by notification emails."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = self._user_from_token(request.query_params.get("token", ""))
        if user is None:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        preference, _ = NotificationPreference.objects.get_or_create(user=user)
        return Response(
            {
                "email": user.email,
                "push_enabled": preference.push_enabled,
                "email_critical_enabled": preference.email_critical_enabled,
                "email_optional_enabled": preference.email_optional_enabled,
            }
        )

    def post(self, request):
        serializer = EmailPreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self._user_from_token(serializer.validated_data["token"])
        if user is None:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preference, _ = NotificationPreference.objects.get_or_create(user=user)
        scope = serializer.validated_data["scope"]
        if scope in ("all", "critical"):
            preference.email_critical_enabled = False
        if scope in ("all", "optional"):
            preference.email_optional_enabled = False
        preference.save(
            update_fields=[
                "email_critical_enabled",
                "email_optional_enabled",
                "updated_at",
            ]
        )
        return Response(
            {
                "email_critical_enabled": preference.email_critical_enabled,
                "email_optional_enabled": preference.email_optional_enabled,
            }
        )

    @staticmethod
    def _user_from_token(token):
        user_id = read_email_preferences_token(token)
        if not user_id:
            return None
        User = get_user_model()
        return User.objects.filter(pk=user_id, is_active=True).first()
