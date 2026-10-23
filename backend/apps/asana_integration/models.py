"""Persistent store for the per-webhook secret Asana issues at handshake time."""

from django.db import models

from asana_integration.fields import EncryptedCharField


class AsanaWebhookSecret(models.Model):
    """The latest ``X-Hook-Secret`` issued during an Asana webhook handshake.

    Asana generates a fresh secret on handshake and signs every subsequent
    delivery with it (``X-Hook-Signature``). Only the newest handshake is kept
    active, matching the single-project webhook this integration runs.
    """

    key = models.CharField(max_length=128, primary_key=True, default="asana", editable=False)
    secret = EncryptedCharField(max_length=512)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asana_webhook_secrets"

    def __str__(self):
        return f"AsanaWebhookSecret(key={self.key})"
