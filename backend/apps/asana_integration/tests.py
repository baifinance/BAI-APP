import hashlib
import hmac

from django.db import connection
from django.test import override_settings
from rest_framework.test import APITestCase

from asana_integration.models import AsanaWebhookSecret


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
