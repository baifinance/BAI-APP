from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from notifications.choices import NotificationType
from notifications.models import Notification
from notifications.services import create_notification


User = get_user_model()


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="client@example.com",
            username="client@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )

    def test_create_notification(self):
        notification = create_notification(
            recipient=self.user,
            notification_type=NotificationType.LOAN_STATUS,
            title="Loan status updated",
            message="Your loan is now under review.",
        )

        self.assertEqual(notification.recipient, self.user)
        self.assertFalse(notification.is_read)

    def test_list_notifications(self):
        create_notification(
            recipient=self.user,
            notification_type=NotificationType.MFA,
            title="MFA enabled",
            message="MFA has been enabled.",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_mark_all_notifications_read(self):
        create_notification(
            recipient=self.user,
            notification_type=NotificationType.SYSTEM,
            title="System message",
            message="Test notification.",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/notifications/mark-all-read/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated_count"], 1)

        self.assertFalse(
            Notification.objects.filter(
                recipient=self.user,
                is_read=False,
            ).exists()
        )