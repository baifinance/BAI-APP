from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsOtpVerified
from notifications.models import Notification
from notifications.serializers import NotificationSerializer

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
