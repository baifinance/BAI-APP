from django.db import migrations, models
from django.db.models import Count, Q


def cleanup_duplicate_primaries(apps, schema_editor):
    LoanApplication = apps.get_model("loans", "LoanApplication")
    duplicate_clients = (
        LoanApplication.objects.filter(is_primary=True)
        .values("client_id")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
    )
    for row in duplicate_clients:
        primaries = LoanApplication.objects.filter(
            client_id=row["client_id"],
            is_primary=True,
        ).order_by("created_at", "id")
        keep = primaries.first()
        primaries.exclude(pk=keep.pk).update(is_primary=False)


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0003_loanapplication_asana_fields"),
    ]

    operations = [
        migrations.RunPython(
            cleanup_duplicate_primaries,
            migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name="loanapplication",
            name="unique_asana_project_task",
        ),
        migrations.AddIndex(
            model_name="loanapplication",
            index=models.Index(
                fields=["asana_project_gid", "asana_task_gid"],
                name="loan_app_task_lookup_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="loanapplication",
            constraint=models.UniqueConstraint(
                fields=["client", "asana_project_gid", "asana_task_gid"],
                name="unique_client_asana_project_task",
            ),
        ),
        migrations.AddConstraint(
            model_name="loanapplication",
            constraint=models.UniqueConstraint(
                condition=Q(is_primary=True),
                fields=["client"],
                name="unique_primary_application_per_client",
            ),
        ),
    ]
