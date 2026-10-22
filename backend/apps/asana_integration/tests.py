import hashlib
import hmac
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.db import connection
from django.test import override_settings
from rest_framework.test import APITestCase

from asana_integration.models import AsanaWebhookSecret
from asana_integration.services.asana import (
    AsanaProfileService,
    handle_task_moved_event,
)
from notifications.models import EmailDelivery, Notification
from users.models import ClientProfile

User = get_user_model()


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@override_settings(
    ASANA_WEBHOOK_ENABLED=True,
    ASANA_WEBHOOK_SECRET="",
    ASANA_WEBHOOK_HANDSHAKE_ENABLED=True,
    ASANA_WEBHOOK_ALLOW_ROTATION=False,
)
class AsanaWebhookReceiverTests(APITestCase):
    URL = "/api/asana/webhook/"

    def _store_secret(self, secret: str) -> None:
        AsanaWebhookSecret.objects.update_or_create(
            key="asana", defaults={"secret": secret}
        )

    def test_handshake_echoes_and_stores_secret(self):
        resp = self.client.post(self.URL, HTTP_X_HOOK_SECRET="handshake-secret")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("X-Hook-Secret"), "handshake-secret")
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "handshake-secret"
        )

    def test_valid_signature_accepted(self):
        self._store_secret("stored-secret")
        body = b'{"events": []}'

        resp = self.client.post(
            self.URL,
            data=body,
            content_type="application/json",
            HTTP_X_HOOK_SIGNATURE=_sign("stored-secret", body),
        )

        self.assertEqual(resp.status_code, 200)

    def test_invalid_signature_rejected(self):
        self._store_secret("stored-secret")
        body = b'{"events": []}'

        resp = self.client.post(
            self.URL,
            data=body,
            content_type="application/json",
            HTTP_X_HOOK_SIGNATURE=_sign("wrong-secret", body),
        )

        self.assertEqual(resp.status_code, 403)

    def test_missing_signature_rejected(self):
        self._store_secret("stored-secret")

        resp = self.client.post(
            self.URL, data=b'{"events": []}', content_type="application/json"
        )

        self.assertEqual(resp.status_code, 403)

    def test_no_secret_rejected(self):
        AsanaWebhookSecret.objects.all().delete()
        body = b'{"events": []}'

        resp = self.client.post(
            self.URL,
            data=body,
            content_type="application/json",
            HTTP_X_HOOK_SIGNATURE=_sign("anything", body),
        )

        self.assertEqual(resp.status_code, 403)


@override_settings(
    ASANA_WEBHOOK_ENABLED=True,
    ASANA_WEBHOOK_SECRET="",
    ASANA_WEBHOOK_HANDSHAKE_ENABLED=True,
    ASANA_WEBHOOK_ALLOW_ROTATION=False,
)
class AsanaHandshakeHardeningTests(APITestCase):
    URL = "/api/asana/webhook/"

    def _store_secret(self, secret: str) -> None:
        AsanaWebhookSecret.objects.update_or_create(
            key="asana", defaults={"secret": secret}
        )

    @override_settings(ASANA_WEBHOOK_HANDSHAKE_ENABLED=False)
    def test_handshake_rejected_when_disabled(self):
        resp = self.client.post(self.URL, HTTP_X_HOOK_SECRET="attacker-secret")

        self.assertEqual(resp.status_code, 403)
        self.assertIsNone(resp.headers.get("X-Hook-Secret"))
        self.assertFalse(AsanaWebhookSecret.objects.exists())

    def test_rotation_rejected_when_secret_exists(self):
        self._store_secret("original-secret")

        resp = self.client.post(self.URL, HTTP_X_HOOK_SECRET="attacker-secret")

        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "original-secret"
        )

    @override_settings(ASANA_WEBHOOK_ALLOW_ROTATION=True)
    def test_rotation_allowed_when_explicitly_enabled(self):
        self._store_secret("original-secret")

        resp = self.client.post(self.URL, HTTP_X_HOOK_SECRET="new-secret")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "new-secret"
        )

    def test_first_handshake_still_allowed(self):
        resp = self.client.post(self.URL, HTTP_X_HOOK_SECRET="first-secret")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "first-secret"
        )


class AsanaSecretEncryptionTests(APITestCase):
    def _raw_secret(self) -> str:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT secret FROM asana_webhook_secrets WHERE key = %s", ["asana"]
            )
            return cursor.fetchone()[0]

    def test_secret_is_encrypted_at_rest_and_decrypts_on_read(self):
        AsanaWebhookSecret.objects.create(key="asana", secret="super-secret")

        raw = self._raw_secret()
        self.assertNotEqual(raw, "super-secret")
        self.assertTrue(raw.startswith("fernet:"))
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "super-secret"
        )

    def test_legacy_plaintext_row_is_readable(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO asana_webhook_secrets (key, secret, updated_at) "
                "VALUES (%s, %s, NOW())",
                ["asana", "legacy-plain"],
            )

        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "legacy-plain"
        )


@override_settings(
    ASANA_WEBHOOK_ENABLED=True,
    ASANA_WEBHOOK_SECRET="",
    ASANA_WEBHOOK_HANDSHAKE_ENABLED=True,
    ASANA_WEBHOOK_ALLOW_ROTATION=False,
)
class AsanaMultiKeyWebhookTests(APITestCase):
    """One signing secret per ``?hook=`` label, so environments can coexist."""

    URL = "/api/asana/webhook/"

    def _store(self, key: str, secret: str) -> None:
        AsanaWebhookSecret.objects.update_or_create(
            key=key, defaults={"secret": secret}
        )

    def _handshake(self, label: str, secret: str):
        return self.client.post(
            f"{self.URL}?hook={label}", HTTP_X_HOOK_SECRET=secret
        )

    def _deliver(self, label: str, secret: str):
        body = b'{"events": []}'
        return self.client.post(
            f"{self.URL}?hook={label}",
            data=body,
            content_type="application/json",
            HTTP_X_HOOK_SIGNATURE=_sign(secret, body),
        )

    def test_handshake_stores_under_hook_label(self):
        resp = self._handshake("windows", "w-secret")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("X-Hook-Secret"), "w-secret")
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="windows").secret, "w-secret"
        )
        self.assertFalse(
            AsanaWebhookSecret.objects.filter(key="asana").exists()
        )

    def test_new_label_is_accepted_while_default_exists(self):
        self._store("asana", "a-secret")

        resp = self._handshake("windows", "w-secret")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="asana").secret, "a-secret"
        )
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="windows").secret, "w-secret"
        )

    def test_rotation_gate_is_per_label(self):
        self._store("windows", "w-secret")

        resp = self._handshake("windows", "attacker-secret")

        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            AsanaWebhookSecret.objects.get(key="windows").secret, "w-secret"
        )

    def test_delivery_uses_only_the_matching_label_secret(self):
        self._store("asana", "a-secret")
        self._store("windows", "w-secret")

        self.assertEqual(self._deliver("windows", "w-secret").status_code, 200)
        self.assertEqual(self._deliver("asana", "a-secret").status_code, 200)
        self.assertEqual(self._deliver("windows", "a-secret").status_code, 403)
        self.assertEqual(self._deliver("asana", "w-secret").status_code, 403)

    def test_legacy_target_without_hook_uses_default(self):
        self._store("asana", "a-secret")
        body = b'{"events": []}'

        resp = self.client.post(
            self.URL,
            data=body,
            content_type="application/json",
            HTTP_X_HOOK_SIGNATURE=_sign("a-secret", body),
        )

        self.assertEqual(resp.status_code, 200)

    def test_invalid_hook_label_rejected(self):
        for label in ("bad.label", "bad%20label", "", "x" * 33):
            resp = self._handshake(label, "secret")
            self.assertEqual(resp.status_code, 400, label)

        self.assertFalse(AsanaWebhookSecret.objects.exists())

    def test_each_label_is_encrypted_at_rest(self):
        self._store("asana", "a-secret")
        self._store("windows", "w-secret")

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT key, secret FROM asana_webhook_secrets ORDER BY key"
            )
            raw = dict(cursor.fetchall())

        self.assertTrue(raw["asana"].startswith("fernet:"))
        self.assertTrue(raw["windows"].startswith("fernet:"))
        self.assertNotIn("w-secret", raw["windows"])


@override_settings(
    EMAIL_NOTIFICATIONS_ENABLED=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class AsanaTaskMovedNotificationTests(APITestCase):
    """A section move notifies the client once, even if the event repeats."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            email="moved@example.com",
            username="moved@example.com",
            password="StrongPassword123!",
            role="client",
            is_active=True,
        )
        ClientProfile.objects.create(
            user=self.client_user,
            loan_status="Pending",
            loan_status_history={"Pending": "2026-01-01T00:00:00+00:00"},
        )

    def _event(self, section="Under Review"):
        return {
            "action": "changed",
            "resource": {"gid": "task-gid-1"},
            "change": {
                "field": "memberships",
                "new_section": {"name": section},
            },
        }

    def _handle(self, event):
        with mock.patch(
            "asana_integration.services.asana._task_email",
            return_value="moved@example.com",
        ), mock.patch("notifications.services.get_redis_client"), mock.patch(
            "users.services.get_redis_client"
        ):
            handle_task_moved_event(event)

    def test_task_moved_notifies_and_emails_the_client(self):
        self._handle(self._event())

        self.assertEqual(
            Notification.objects.filter(recipient=self.client_user).count(), 1
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Loan status updated", mail.outbox[0].subject)
        delivery = EmailDelivery.objects.get()
        self.assertEqual(delivery.status, EmailDelivery.Status.SENT)

    def test_repeated_event_does_not_notify_or_email_twice(self):
        self._handle(self._event())
        self._handle(self._event())

        self.assertEqual(
            Notification.objects.filter(recipient=self.client_user).count(), 1
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(EmailDelivery.objects.count(), 1)


class _FakePage:
    """Mimic the SDK's PageIterator: iteration yields pages, items() yields tasks."""

    def __init__(self, items):
        self._items = items

    def __iter__(self):
        raise AssertionError("PageIterator must be consumed via items()")

    def items(self):
        return iter(self._items)


class _FakeTasksApi:
    def __init__(self, tasks):
        self._tasks = tasks

    def get_tasks_for_project(self, *_args, **_kwargs):
        return _FakePage(self._tasks)


class _FakeSectionsApi:
    def __init__(self, sections):
        self._sections = sections
        self.added = []

    def get_sections_for_project(self, *_args, **_kwargs):
        return _FakePage(self._sections)

    def add_task_for_section(self, section_gid, body):
        self.added.append((section_gid, body))


@override_settings(ASANA_ACCESS_TOKEN="token", ASANA_PROJECT_GID="project")
class AsanaPaginationTests(APITestCase):
    def test_find_profile_iterates_task_items(self):
        service = AsanaProfileService()
        service.tasks_api = _FakeTasksApi(
            [
                {
                    "gid": "1",
                    "name": "Client",
                    "notes": "Email: client@example.com",
                    "memberships": [],
                }
            ]
        )

        profile = service.find_profile_by_email("client@example.com")

        self.assertIsNotNone(profile)
        self.assertEqual(profile["email"], "client@example.com")

    def test_move_status_iterates_task_and_section_items(self):
        service = AsanaProfileService()
        service.tasks_api = _FakeTasksApi(
            [
                {
                    "gid": "1",
                    "name": "Client",
                    "notes": "Email: client@example.com",
                    "memberships": [
                        {
                            "project": {"gid": "project"},
                            "section": {"gid": "s1", "name": "Pending"},
                        }
                    ],
                }
            ]
        )
        sections = _FakeSectionsApi(
            [
                {"gid": "s1", "name": "Pending"},
                {"gid": "s2", "name": "Settled"},
            ]
        )
        service.sections_api = sections

        result = service.move_task_to_status("client@example.com", "Settled")

        self.assertEqual(result["section_gid"], "s2")
        self.assertEqual(sections.added[0][0], "s2")
