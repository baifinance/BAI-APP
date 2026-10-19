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
