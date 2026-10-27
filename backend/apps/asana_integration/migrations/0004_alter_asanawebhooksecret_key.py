# Increase AsanaWebhookSecret.key length to support composite "<hook>:<project>" keys.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("asana_integration", "0003_encrypt_webhook_secret"),
    ]

    operations = [
        migrations.AlterField(
            model_name='asanawebhooksecret',
            name="key",
            field=models.CharField(
                default="asana",
                editable=False,
                max_length=128,
                primary_key=True,
                serialize=False,
            ),
        ),
    ]
