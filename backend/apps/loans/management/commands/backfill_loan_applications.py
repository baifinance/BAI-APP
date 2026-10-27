"""Backfill and reconcile LoanApplication rows from Asana tasks.

Uses the shared sync service so webhooks, backfill, and scheduled
reconciliation all create applications identically: one application per
active client email found on an Asana task.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from asana_integration.services.asana import get_project_gids
from asana_integration.services.loan_sync import (
    audit_project_tasks,
    repair_primaries,
    sync_project_tasks,
)


class Command(BaseCommand):
    help = "Backfill or reconcile LoanApplication rows from existing Asana tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            action="append",
            default=[],
            help="Only sync this client email. Repeatable.",
        )
        parser.add_argument(
            "--project",
            action="append",
            default=[],
            help=(
                "Asana project GID to scan. Repeatable or comma-separated. "
                "Defaults to ASANA_PROJECT_GIDS / ASANA_PROJECT_GID."
            ),
        )
        parser.add_argument(
            "--since-hours",
            type=int,
            default=None,
            help="Only scan tasks modified within the last N hours.",
        )
        parser.add_argument(
            "--full",
            action="store_true",
            help="Scan all tasks regardless of modification time.",
        )
        parser.add_argument(
            "--audit",
            action="store_true",
            help="Report email parsing/coverage audit without writing.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report planned changes without writing to the database.",
        )

    def handle(self, *args, **options):
        emails = {
            email.strip().lower()
            for value in options["email"]
            for email in str(value).split(",")
            if email.strip()
        }

        projects = [
            gid.strip()
            for value in options["project"]
            for gid in str(value).split(",")
            if gid.strip()
        ]
        project_gids = projects or get_project_gids()
        if not project_gids:
            raise CommandError(
                "No Asana project GIDs configured. Pass --project or set "
                "ASANA_PROJECT_GIDS / ASANA_PROJECT_GID."
            )

        if options["since_hours"] is not None and options["full"]:
            raise CommandError("--since-hours and --full cannot be used together.")

        modified_since = None
        if options["since_hours"] is not None:
            modified_since = (
                timezone.now() - timedelta(hours=options["since_hours"])
            ).isoformat()

        include_emails = emails or None

        if options["audit"]:
            for project_gid in project_gids:
                report = audit_project_tasks(
                    project_gid,
                    modified_since=modified_since,
                    full=options["full"],
                )
                self.stdout.write(
                    f"Project {project_gid}: {report['stats']}"
                )
                for sample in report["unlabeled_samples"]:
                    self.stdout.write(f"  unlabeled sample: {sample}")
            return

        total = {
            "scanned": 0,
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "skipped": 0,
        }

        for project_gid in project_gids:
            result = sync_project_tasks(
                project_gid,
                modified_since=modified_since,
                include_emails=include_emails,
                notify=False,
                publish=False,
                dry_run=options["dry_run"],
            )
            total["scanned"] += result.scanned
            total["created"] += result.created
            total["updated"] += result.updated
            total["unchanged"] += result.unchanged
            total["skipped"] += result.skipped
            self.stdout.write(
                f"Project {project_gid}: scanned={result.scanned} "
                f"created={result.created} updated={result.updated} "
                f"unchanged={result.unchanged} skipped={result.skipped}"
            )

        if not options["dry_run"]:
            repair_primaries(project_gids)

        self.stdout.write(
            "Backfill complete: scanned={scanned} created={created} "
            "updated={updated} unchanged={unchanged} skipped={skipped}".format(
                **total
            )
        )
