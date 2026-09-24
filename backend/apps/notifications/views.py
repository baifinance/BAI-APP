import json

from django.http import StreamingHttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsOtpVerified
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from otp.utils import redis_client


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
        )

        unread_only = self.request.query_params.get("unread")
        if unread_only == "true":
            queryset = queryset.filter(is_read=False)

        return queryset

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
        pubsub = redis_client.pubsub()
        pubsub.subscribe(f"notify:{request.user.id}")

        def event_stream():
            try:
                yield "retry: 3000\n\n"
                yield f"event: snapshot\ndata: {json.dumps({'ok': True})}\n\n"
                while True:
                    message = pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=25,
                    )
                    if message and message.get("type") == "message":
                        data = message["data"]
                        if isinstance(data, bytes):
                            data = data.decode()
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