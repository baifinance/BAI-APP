from django.contrib.auth.hashers import check_password, make_password
from django.db import migrations


SEEDED_EMAIL = "compliance@bai.finance"
SEEDED_PASSWORD = "SuperSecretPassword123!"


def neutralize_seeded_account(apps, schema_editor):
    User = apps.get_model("users", "User")
    user = User.objects.filter(email__iexact=SEEDED_EMAIL).first()

    if user is None or not check_password(SEEDED_PASSWORD, user.password):
        return

    user.password = make_password(None)
    user.is_active = False
    user.is_staff = False
    user.is_superuser = False
    user.save(
        update_fields=[
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
        ]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_backfill_pending_loan_status"),
    ]

    operations = [
        migrations.RunPython(
            neutralize_seeded_account,
            migrations.RunPython.noop,
        ),
    ]
