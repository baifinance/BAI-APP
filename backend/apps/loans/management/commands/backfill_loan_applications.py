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
from otp.utils import get_redis_client

RECONCILE_LOCK_KEY = "asana:reconcile:lock"
RECONCILE_LAST_RUN_KEY = "asana:reconcile:last_run"
RECONCILE_INTERVAL_HOURS = 25
RECONCILE_LOCK_TTL_SECONDS = 3600
FIRST_RUN_SINCE_HOURS = 168


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
        parser.add_argument(
            "--reconcile",
            action="store_true",
            help=(
                "Scheduled reconciliation mode: scans all configured projects "
                "for recently modified tasks, guarded by a Redis lock and "
                "last-run timestamp so it only does meaningful work roughly "
                "once per reconciliation interval. Implies --notify."
            ),
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

        reconcile = options["reconcile"]
        if reconcile:
            if options["full"] or options["since_hours"] or options["project"] or options["email"]:
                raise CommandError(
                    "--reconcile cannot be combined with --full, --since-hours, "
                    "--project, or --email; it scans all configured projects."
                )

        modified_since = None
        if reconcile:
            # Scheduled reconciliation: guarded by a Redis lock and last-run
            # timestamp so an hourly scheduler only does meaningful work roughly
            # once per reconciliation interval.
            redis = get_redis_client()
            lock_acquired = redis.set(
                RECONCILE_LOCK_KEY, "1", nx=True, ex=RECONCILE_LOCK_TTL_SECONDS
            )
            if not lock_acquired:
                self.stdout.write(
                    "Reconciliation skipped: another run is in progress "
                    f"(lock {RECONCILE_LOCK_KEY})."
                )
                return

            try:
                last_run_raw = redis.get(RECONCILE_LAST_RUN_KEY)
                hours_since = None
                if last_run_raw is not None:
                    last_run = timezone.datetime.fromisoformat(
                        last_run_raw.decode()
                    )
                    if timezone.is_naive(last_run):
                        last_run = timezone.make_aware(last_run, timezone.utc)
                    hours_since = (
                        timezone.now() - last_run
                    ).total_seconds() / 3600
                    if hours_since < RECONCILE_INTERVAL_HOURS:
                        self.stdout.write(
                            f"Reconciliation skipped: last ran {hours_since:.1f}h "
                            f"ago (< {RECONCILE_INTERVAL_HOURS}h interval)."
                        )
                        return

                # Overlap by an hour so nothing falls between the window and the
                # previous scan's wall clock.
                since_hours = max(
                    FIRST_RUN_SINCE_HOURS if last_run_raw is None else 26,
                    int(hours_since) + 1 if hours_since is not None
                    else FIRST_RUN_SINCE_HOURS,
                )
                modified_since = (
                    timezone.now() - timedelta(hours=since_hours)
                ).isoformat()
                self.stdout.write(
                    f"Reconciliation: scanning tasks modified in last "
                    f"{since_hours}h across {len(project_gids)} project(s)."
                )
            except Exception:
                redis.delete(RECONCILE_LOCK_KEY)
                raise
        elif options["since_hours"] is not None:
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
            try:
                result = sync_project_tasks(
                    project_gid,
                    modified_since=modified_since,
                    include_emails=include_emails,
                    notify=True,
                    publish=False,
                    dry_run=options["dry_run"],
                )
            except Exception as error:  # noqa: BLE001 - one project must not abort the rest
                self.stderr.write(
                    f"Project {project_gid}: ERROR {error}"
                )
                continue
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

        if reconcile:
            try:
                if not options["dry_run"]:
                    redis.set(
                        RECONCILE_LAST_RUN_KEY, timezone.now().isoformat()
                    )
            finally:
                redis.delete(RECONCILE_LOCK_KEY)

        self.stdout.write(
            "Backfill complete: scanned={scanned} created={created} "
            "updated={updated} unchanged={unchanged} skipped={skipped}".format(
                **total
            )
        )
