from django.db import migrations


COMPLIANCE_EMAIL = "compliance@bai.finance"
COMPLIANCE_PASSWORD = "SuperSecretPassword123!"


def create_initial_compliance_user(apps, schema_editor):
    User = apps.get_model("users", "User")

    if User.objects.filter(email=COMPLIANCE_EMAIL).exists():
        return

    User.objects.create_user(
        email=COMPLIANCE_EMAIL,
        username=COMPLIANCE_EMAIL,
        password=COMPLIANCE_PASSWORD,
        role="COMPLIANCE",
        status="ACTIVE",
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


def remove_initial_compliance_user(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(email=COMPLIANCE_EMAIL).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_initial_compliance_user,
            remove_initial_compliance_user,
        ),
    ]