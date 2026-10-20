"""Seed the "Pending" loan-status date for existing client profiles.

Uses the linked user's ``created_at`` (the local fallback). The optional
``backfill_loan_status_dates`` management command can later refine this with
the accurate Asana task ``created_at``.
"""

from django.db import migrations


def seed_pending(apps, schema_editor):
    ClientProfile = apps.get_model("users", "ClientProfile")

    profiles = ClientProfile.objects.filter(loan_status_history={})
    for profile in profiles.select_related("user"):
        created = getattr(profile.user, "created_at", None)
        if created is None:
            continue
        profile.loan_status_history = {"Pending": created.isoformat()}
        profile.save(update_fields=["loan_status_history"])


def unseed_pending(apps, schema_editor):
    ClientProfile = apps.get_model("users", "ClientProfile")
    ClientProfile.objects.filter(loan_status_history__has_key="Pending").update(
        loan_status_history={}
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_clientprofile_loan_status_history"),
    ]

    operations = [
        migrations.RunPython(seed_pending, unseed_pending),
    ]
