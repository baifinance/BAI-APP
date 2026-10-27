"""Encrypt any pre-existing plaintext Asana webhook secret in place."""

from django.db import migrations


def encrypt_existing(apps, schema_editor):
    AsanaWebhookSecret = apps.get_model("asana_integration", "AsanaWebhookSecret")
    for row in AsanaWebhookSecret.objects.all():
        # The field decrypts on read (legacy plaintext passes through) and
        # encrypts on write, so a plain save migrates the value to ciphertext.
        row.save(update_fields=["secret"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("asana_integration", "0002_alter_asanawebhooksecret_secret"),
    ]

    operations = [
        migrations.RunPython(encrypt_existing, noop),
    ]
