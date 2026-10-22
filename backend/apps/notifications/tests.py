import json
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from notifications.choices import NotificationType
from notifications.models import Notification
from notifications.services import create_notification, publish_stream_notification


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

from django.core import mail
from django.test import override_settings

from notifications.email import (
    enqueue_notification_email,
    send_due_notification_emails,
    send_email_delivery,
)
from notifications.models import EmailDelivery, NotificationPreference, PushSubscription
from notifications.tokens import make_email_preferences_token


class NotificationPreferenceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="prefs@example.com",
            username="prefs@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_defaults_are_private_and_critical_only(self):
        response = self.client.get("/api/notifications/preferences/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["push_enabled"])
        self.assertTrue(response.data["email_critical_enabled"])
        self.assertFalse(response.data["email_optional_enabled"])

    def test_patch_preferences(self):
        response = self.client.patch(
            "/api/notifications/preferences/",
            {"email_optional_enabled": True, "push_enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        preference = NotificationPreference.objects.get(user=self.user)
        self.assertTrue(preference.push_enabled)
        self.assertTrue(preference.email_optional_enabled)

    @override_settings(
        PUSH_NOTIFICATIONS_ENABLED=True,
        VAPID_PUBLIC_KEY="public-test-key",
    )
    def test_push_config_exposes_public_key_only(self):
        response = self.client.get("/api/notifications/push/config/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["enabled"])
        self.assertEqual(response.data["public_key"], "public-test-key")

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=True)
    def test_subscribe_and_unsubscribe(self):
        endpoint = "https://push.example.com/subscription/abc"

        response = self.client.post(
            "/api/notifications/push/subscribe/",
            {
                "endpoint": endpoint,
                "p256dh": "p256dh-key",
                "auth": "auth-secret",
                "user_agent": "Test browser",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["subscribed"])
        self.assertTrue(PushSubscription.objects.filter(endpoint=endpoint).exists())
        self.assertTrue(
            NotificationPreference.objects.get(user=self.user).push_enabled
        )

        response = self.client.post(
            "/api/notifications/push/unsubscribe/",
            {"endpoint": endpoint},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(PushSubscription.objects.filter(endpoint=endpoint).exists())
        self.assertFalse(
            NotificationPreference.objects.get(user=self.user).push_enabled
        )

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=True)
    def test_endpoint_cannot_be_taken_over_by_another_user(self):
        endpoint = "https://push.example.com/subscription/shared"
        payload = {
            "endpoint": endpoint,
            "p256dh": "p256dh-key",
            "auth": "auth-secret",
        }
        self.client.post(
            "/api/notifications/push/subscribe/", payload, format="json"
        )

        other = User.objects.create_user(
            email="other@example.com",
            username="other@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        self.client.force_authenticate(user=other)
        response = self.client.post(
            "/api/notifications/push/subscribe/", payload, format="json"
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            PushSubscription.objects.get(endpoint=endpoint).user, self.user
        )


@override_settings(
    EMAIL_NOTIFICATIONS_ENABLED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class NotificationEmailTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="email@example.com",
            username="email@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )

    def _notification(self, notification_type=NotificationType.LOAN_STATUS):
        return create_notification(
            recipient=self.user,
            notification_type=notification_type,
            title="Loan status updated",
            message="Your loan is now under review.",
        )

    def test_critical_email_is_queued_by_default(self):
        notification = self._notification()

        delivery = enqueue_notification_email(notification)

        self.assertIsNotNone(delivery)
        self.assertEqual(delivery.status, EmailDelivery.Status.PENDING)

    def test_optional_email_is_not_queued_by_default(self):
        notification = self._notification(NotificationType.COMMUNICATION)

        self.assertIsNone(enqueue_notification_email(notification))

    def test_worker_sends_queued_email(self):
        notification = self._notification()
        enqueue_notification_email(notification)

        sent, attempted = send_due_notification_emails()

        self.assertEqual((sent, attempted), (1, 1))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Loan status updated", mail.outbox[0].subject)
        delivery = EmailDelivery.objects.get(notification=notification)
        self.assertEqual(delivery.status, EmailDelivery.Status.SENT)

    def test_claimed_delivery_is_not_sent_twice_by_a_second_worker(self):
        notification = self._notification()
        delivery = enqueue_notification_email(notification)
        stale = EmailDelivery.objects.get(pk=delivery.pk)

        self.assertTrue(send_email_delivery(delivery))
        self.assertFalse(send_email_delivery(stale))

        self.assertEqual(len(mail.outbox), 1)

    def test_signed_link_disables_email(self):
        token = make_email_preferences_token(self.user)

        response = self.client.post(
            "/api/notifications/email/preferences/",
            {"token": token, "scope": "all"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        preference = NotificationPreference.objects.get(user=self.user)
        self.assertFalse(preference.email_critical_enabled)
        self.assertFalse(preference.email_optional_enabled)

    def test_invalid_signed_link_is_rejected(self):
        response = self.client.get(
            "/api/notifications/email/preferences/?token=not-a-token"
        )

        self.assertEqual(response.status_code, 400)


@override_settings(
    EMAIL_NOTIFICATIONS_ENABLED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class NotificationInlineEmailTests(APITestCase):
    """Publishing a notification must deliver the email without a scheduler."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="inline@example.com",
            username="inline@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        self.notification = create_notification(
            recipient=self.user,
            notification_type=NotificationType.LOAN_STATUS,
            title="Loan status updated",
            message="Your loan is now under review.",
        )

    def _publish(self):
        with mock.patch("notifications.services.get_redis_client"):
            publish_stream_notification(self.user.id, self.notification)

    def test_publish_sends_email_immediately(self):
        self._publish()

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Loan status updated", mail.outbox[0].subject)
        delivery = EmailDelivery.objects.get(notification=self.notification)
        self.assertEqual(delivery.status, EmailDelivery.Status.SENT)
        self.assertIsNotNone(delivery.sent_at)

    def test_publish_does_not_raise_when_smtp_fails(self):
        with mock.patch(
            "notifications.email.EmailMultiAlternatives.send",
            side_effect=OSError("smtp unavailable"),
        ):
            self._publish()

        delivery = EmailDelivery.objects.get(notification=self.notification)
        self.assertEqual(delivery.status, EmailDelivery.Status.PENDING)
        self.assertEqual(delivery.attempts, 1)
        self.assertIsNotNone(delivery.next_attempt_at)


@override_settings(
    EMAIL_NOTIFICATIONS_ENABLED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class NotificationEmailDisabledTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="disabled@example.com",
            username="disabled@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        self.notification = create_notification(
            recipient=self.user,
            notification_type=NotificationType.LOAN_STATUS,
            title="Loan status updated",
            message="Your loan is now under review.",
        )

    def test_publish_sends_nothing_when_channel_is_off(self):
        with mock.patch("notifications.services.get_redis_client"):
            publish_stream_notification(self.user.id, self.notification)

        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(EmailDelivery.objects.exists())


@override_settings(
    PUSH_NOTIFICATIONS_ENABLED=True,
    VAPID_PUBLIC_KEY="public-test-key",
    VAPID_PRIVATE_KEY="private-test-key",
)
class WebPushDispatchTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="push@example.com",
            username="push@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        NotificationPreference.objects.create(user=self.user, push_enabled=True)
        self.subscription = PushSubscription.objects.create(
            user=self.user,
            endpoint="https://push.example.com/subscription/push",
            p256dh="p256dh-key",
            auth="auth-secret",
        )
        self.notification = create_notification(
            recipient=self.user,
            notification_type=NotificationType.LOAN_STATUS,
            title="Loan status updated",
            message="Your loan is now under review.",
        )

    def test_push_dispatches_to_active_subscriptions(self):
        with mock.patch("pywebpush.webpush") as webpush:
            from notifications.push import send_push_notification

            sent = send_push_notification(self.notification)

        self.assertEqual(sent, 1)
        webpush.assert_called_once()
        payload = json.loads(webpush.call_args.kwargs["data"])
        self.assertEqual(payload["title"], "Loan status updated")

    def test_push_respects_user_opt_out(self):
        preference = NotificationPreference.objects.get(user=self.user)
        preference.push_enabled = False
        preference.save(update_fields=["push_enabled", "updated_at"])

        with mock.patch("pywebpush.webpush") as webpush:
            from notifications.push import send_push_notification

            sent = send_push_notification(self.notification)

        self.assertEqual(sent, 0)
        webpush.assert_not_called()
