"""Backfill LoanApplication rows from existing Asana tasks.

The multi-application feature creates rows from Asana webhooks. Existing
clients therefore have status history on ClientProfile but no application
rows until they move again. This command imports those tasks idempotently.
"""

from datetime import datetime, timezone as datetime_timezone

import asana
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from asana_integration.services.asana import (
    AsanaProfileError,
    AsanaProfileService,
    get_project_gids,
)
from loans.models import LoanApplication
from users.choices import UserRole
from users.models import ClientProfile, User
from users.services import _map_asana_status_to_application_status


def _parse_ts(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime_timezone.utc)
    return parsed


def _section_for_project(task, project_gid):
    for membership in task.get("memberships") or []:
        project = membership.get("project") or {}
        if str(project.get("gid")) != str(project_gid):
            continue
        section = membership.get("section") or {}
        name = (section.get("name") or "").strip()
        if name:
            return name
    return None


class Command(BaseCommand):
    help = "Backfill LoanApplication rows from existing Asana tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            action="append",
            default=[],
            help="Only backfill this client email. Repeatable.",
        )
        parser.add_argument(
            "--project",
            action="append",
            default=[],
            help=(
                "Asana project GID to scan. Repeatable or comma-separated. "
                "Defaults to ASANA_PROJECT_GIDS / ASANA_PROJECT_GID / DB projects."
            ),
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
        if projects:
            project_gids = projects
            scope_all_projects = False
        else:
            project_gids = get_project_gids()
            scope_all_projects = True
        if not project_gids:
            raise CommandError(
                "No Asana project GIDs configured. Pass --project or set "
                "ASANA_PROJECT_GIDS / ASANA_PROJECT_GID."
            )

        try:
            service = AsanaProfileService(project_gid=project_gids[0])
        except AsanaProfileError as error:
            raise CommandError(str(error)) from error

        projects_api = asana.ProjectsApi(service.api_client)
        project_names = {}
        for project_gid in project_gids:
            try:
                project = projects_api.get_project(
                    project_gid, {"opt_fields": "name"}
                )
                project_names[project_gid] = project.get("name")
            except asana.rest.ApiException as error:
                self.stderr.write(
                    f"Could not load project {project_gid}: {error}"
                )
                project_names[project_gid] = None

        task_options = {
            "limit": 100,
            "opt_fields": (
                "gid,name,notes,created_at,modified_at,completed,"
                "memberships.project.gid,memberships.section.gid,"
                "memberships.section.name"
            ),
        }

        users_by_email = {}
        grouped = {}
        scanned = 0
        skipped = 0

        for project_gid in project_gids:
            try:
                tasks = service.tasks_api.get_tasks_for_project(
                    project_gid, task_options
                )
                for task in tasks:
                    scanned += 1
                    try:
                        profile = service.parse_task(task, project_gid)
                    except Exception as error:
                        self.stderr.write(
                            f"Skipping task {task.get('gid')}: {error}"
                        )
                        skipped += 1
                        continue

                    email = service.normalize_email(profile.get("email", ""))
                    if not email or (emails and email not in emails):
                        skipped += 1
                        continue

                    if email not in users_by_email:
                        user = User.objects.filter(
                            email__iexact=email,
                            role=UserRole.CLIENT,
                            is_active=True,
                        ).first()
                        users_by_email[email] = (
                            ClientProfile.objects.filter(user=user).first()
                            if user
                            else None
                        )
                    client_profile = users_by_email[email]
                    if client_profile is None:
                        skipped += 1
                        continue

                    section = _section_for_project(task, project_gid)
                    if not section:
                        self.stderr.write(
                            f"Skipping task {task.get('gid')}: no section in "
                            f"project {project_gid}"
                        )
                        skipped += 1
                        continue

                    entry = {
                        "project_gid": project_gid,
                        "project_name": project_names.get(project_gid),
                        "task_gid": task.get("gid"),
                        "task_name": task.get("name"),
                        "section": section,
                        "created_at": _parse_ts(task.get("created_at")),
                        "modified_at": _parse_ts(task.get("modified_at")),
                    }
                    bucket = grouped.setdefault(
                        client_profile.pk,
                        {"profile": client_profile, "tasks": {}},
                    )
                    bucket["tasks"][
                        (project_gid, entry["task_gid"])
                    ] = entry
            except asana.rest.ApiException as error:
                self.stderr.write(
                    f"Could not list tasks for project {project_gid}: {error}"
                )

        if emails:
            missing = emails - set(users_by_email)
            for email in sorted(missing):
                self.stderr.write(f"No active client profile for {email}.")

        created = 0
        updated = 0
        for bucket in grouped.values():
            client_profile = bucket["profile"]
            tasks = list(bucket["tasks"].values())

            matching_primary = [
                entry
                for entry in tasks
                if entry["section"] == client_profile.loan_status
            ]
            primary_pool = matching_primary or tasks
            primary = min(
                primary_pool,
                key=lambda entry: (
                    entry["created_at"]
                    or datetime.max.replace(tzinfo=datetime_timezone.utc)
                ),
            )

            seen_ids = []
            for entry in tasks:
                is_primary = entry is primary
                existing = LoanApplication.objects.filter(
                    asana_project_gid=entry["project_gid"],
                    asana_task_gid=entry["task_gid"],
                ).first()

                history = dict(existing.asana_status_history or {}) if existing else {}
                if is_primary:
                    for status, changed_at in (
                        client_profile.loan_status_history or {}
                    ).items():
                        history.setdefault(status, changed_at)

                changed_at = (
                    entry["modified_at"]
                    or entry["created_at"]
                    or datetime.now(tz=datetime_timezone.utc)
                )
                previous = _parse_ts(history.get(entry["section"]))
                if previous is None or changed_at > previous:
                    history[entry["section"]] = changed_at.isoformat()

                fields = {
                    "client": client_profile,
                    "asana_project_name": entry["project_name"],
                    "asana_task_name": entry["task_name"],
                    "asana_status": entry["section"],
                    "asana_status_history": history,
                    "status": _map_asana_status_to_application_status(
                        entry["section"]
                    ),
                    "asana_created_at": entry["created_at"],
                    "is_primary": is_primary,
                }

                action = "UPDATE" if existing else "CREATE"
                if options["dry_run"]:
                    self.stdout.write(
                        f"WOULD {action} client={client_profile.user.email} "
                        f"project={entry['project_name'] or entry['project_gid']} "
                        f"task={entry['task_gid']} section={entry['section']} "
                        f"primary={is_primary}"
                    )
                    if existing:
                        seen_ids.append(existing.pk)
                    continue

                with transaction.atomic():
                    if existing is None:
                        existing = LoanApplication.objects.create(
                            asana_project_gid=entry["project_gid"],
                            asana_task_gid=entry["task_gid"],
                            **fields,
                        )
                        created += 1
                    else:
                        for key, value in fields.items():
                            setattr(existing, key, value)
                        existing.save()
                        updated += 1
                    seen_ids.append(existing.pk)

            if not options["dry_run"] and scope_all_projects:
                LoanApplication.objects.filter(
                    client=client_profile
                ).exclude(pk__in=seen_ids).update(is_primary=False)

        if options["dry_run"]:
            self.stdout.write(
                f"Dry run: scanned {scanned} tasks, skipped {skipped}, "
                f"matched {sum(len(b['tasks']) for b in grouped.values())} "
                f"across {len(grouped)} clients."
            )
        else:
            self.stdout.write(
                f"Backfill complete: scanned {scanned} tasks, skipped {skipped}, "
                f"created {created}, updated {updated}."
            )
