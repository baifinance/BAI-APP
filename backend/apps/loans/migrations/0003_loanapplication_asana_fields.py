# Multi-loan application: Asana project/task linkage and status mirroring.

import django.core.validators
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="loanapplication",
            name="amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(0.01)],
            ),
        ),
        migrations.AlterField(
            model_name="loanapplication",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="created_applications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="loanapplication",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("submitted", "Submitted"),
                    ("in_review", "In_Review"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("settled", "Settled"),
                    ("withdrawn", "Withdrawn"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_project_gid",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_project_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_status",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_status_history",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_synced_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_task_gid",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="asana_task_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="is_primary",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="loanapplication",
            index=models.Index(
                fields=["client", "asana_project_gid"],
                name="loan_applic_client_proj_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="loanapplication",
            constraint=models.UniqueConstraint(
                fields=["asana_project_gid", "asana_task_gid"],
                name="unique_asana_project_task",
            ),
        ),
    ]
