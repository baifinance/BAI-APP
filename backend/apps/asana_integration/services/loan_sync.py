from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone as datetime_timezone

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from asana_integration.services.asana import (
    AsanaProfileError,
    AsanaProfileService,
    get_project_gids,
)
from asana_integration.statuses import LOAN_STATUSES, canonical_loan_status
from loans.choices import ApplicationStatus
from loans.models import LoanApplication
from notifications.choices import NotificationType
from notifications.models import Notification
from notifications.services import create_notification, publish_stream_notification
from users.choices import UserRole
from users.models import ClientProfile
from users.services import (
    _map_asana_status_to_application_status,
    apply_application_status_change,
)
from otp.utils import get_redis_client

logger = logging.getLogger(__name__)

TASK_OPT_FIELDS = (
    "gid,name,notes,created_at,modified_at,completed,"
    "memberships.project.gid,memberships.section.gid,"
    "memberships.section.name"
)


@dataclass
class SyncResult:
    scanned: int = 0
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    skipped: int = 0
    applications: list[str] = field(default_factory=list)
    clients: list[int] = field(default_factory=list)

    def merge(self, other):
        self.scanned += other.scanned
        self.created += other.created
        self.updated += other.updated
        self.unchanged += other.unchanged
        self.skipped += other.skipped
        self.applications.extend(other.applications)
        self.clients.extend(other.clients)
        return self


def parse_timestamp(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime_timezone.utc)
    return parsed


def resolve_project_gid(task, project_gid=None):
    if project_gid:
        return str(project_gid)

    configured = set(get_project_gids())
    memberships = task.get("memberships") or []
    for membership in memberships:
        gid = (membership.get("project") or {}).get("gid")
        if gid and (not configured or str(gid) in configured):
            return str(gid)

    if configured:
        return next(iter(configured))
    return None


def build_task_snapshot(task, project_gid=None):
    resolved_project_gid = resolve_project_gid(task, project_gid)
    profile = AsanaProfileService.parse_task(task, resolved_project_gid)
    emails = profile.get("emails") or []
    if not emails and profile.get("email"):
        emails = [profile["email"]]

    return {
        "task_gid": task.get("gid"),
        "task_name": task.get("name"),
        "project_gid": resolved_project_gid,
        "section": profile.get("asana_section"),
        "emails": [
            AsanaProfileService.normalize_email(email)
            for email in emails
            if email
        ],
        "created_at": parse_timestamp(task.get("created_at")),
        "modified_at": parse_timestamp(task.get("modified_at")),
    }


def resolve_client_profiles(emails):
    normalized = []
    for email in emails or []:
        value = AsanaProfileService.normalize_email(email)
        if value and value not in normalized:
            normalized.append(value)
    if not normalized:
        return []

    query = Q()
    for email in normalized:
        query |= Q(user__email__iexact=email)

    profiles = (
        ClientProfile.objects.filter(
            query,
            user__role=UserRole.CLIENT,
            user__is_active=True,
        )
        .select_related("user")
        .order_by("user_id")
    )
    by_email = {
        profile.user.email.casefold(): profile
        for profile in profiles
    }
    seen = set()
    resolved = []
    for email in normalized:
        profile = by_email.get(email)
        if profile is not None and profile.pk not in seen:
            seen.add(profile.pk)
            resolved.append(profile)
    return resolved


def list_project_tasks(service, project_gid, *, modified_since=None):
    options = {
        "limit": 100,
        "opt_fields": TASK_OPT_FIELDS,
    }
    if modified_since:
        options["project"] = project_gid
        options["modified_since"] = modified_since
        return service.tasks_api.get_tasks(options)
    return service.tasks_api.get_tasks_for_project(project_gid, options)


def _notify_status_change(profile, application, section):
    title = "Loan status updated"
    message = f"Your loan status has been updated to {section.replace('_', ' ').title()}."
    now = timezone.now()
    recent = Notification.objects.filter(
        recipient=profile.user,
        notification_type=NotificationType.LOAN_STATUS,
        title=title,
        message=message,
        created_at__gte=now - timedelta(minutes=1),
    ).exists()
    if recent:
        return

    notification = create_notification(
        recipient=profile.user,
        notification_type=NotificationType.LOAN_STATUS,
        title=title,
        message=message,
    )
    publish_stream_notification(
        profile.user_id,
        notification,
        loan_status=section,
        application_id=str(application.id),
    )


def _ensure_primary(profile, application):
    if application.is_primary:
        return
    primaries = LoanApplication.objects.filter(
        client=profile,
        is_primary=True,
    ).exclude(pk=application.pk)
    if primaries.exists():
        return
    application.is_primary = True
    application.save(update_fields=["is_primary"])


def _apply_snapshot_status(application, section, status_at, *, created):
    if not section:
        return application, False

    canonical = canonical_loan_status(section)
    if canonical is None:
        application.asana_status = section
        application.status = _map_asana_status_to_application_status(section)
        application.asana_synced_at = timezone.now()
        application.save(
            update_fields=["asana_status", "status", "asana_synced_at"]
        )
        return application, False

    if created:
        return apply_application_status_change(
            application,
            canonical,
            when=status_at,
        )
    return apply_application_status_change(
        application,
        canonical,
        asana_event_at=status_at,
    )


def sync_task_snapshot(
    snapshot,
    *,
    project_name=None,
    event_at=None,
    include_emails=None,
    notify=False,
    publish=False,
    dry_run=False,
):
    result = SyncResult(scanned=1)
    emails = snapshot.get("emails") or []
    if include_emails is not None:
        allowed = {
            AsanaProfileService.normalize_email(email)
            for email in include_emails
        }
        emails = [email for email in emails if email in allowed]

    profiles = resolve_client_profiles(emails)
    if not profiles:
        result.skipped = 1
        logger.info(
            "Asana task %s has no active client for emails %s",
            snapshot.get("task_gid"),
            emails,
        )
        return result

    section = snapshot.get("section")
    status_at = (
        event_at
        or snapshot.get("modified_at")
        or snapshot.get("created_at")
        or timezone.now()
    )

    for profile in profiles:
        if dry_run:
            exists = LoanApplication.objects.filter(
                client=profile,
                asana_project_gid=snapshot.get("project_gid"),
                asana_task_gid=snapshot.get("task_gid"),
            ).exists()
            if exists:
                result.updated += 1
            else:
                result.created += 1
            result.clients.append(profile.pk)
            continue

        created = False
        changed = False
        metadata_changed = False

        with transaction.atomic():
            application = (
                LoanApplication.objects.select_for_update()
                .filter(
                    client=profile,
                    asana_project_gid=snapshot.get("project_gid"),
                    asana_task_gid=snapshot.get("task_gid"),
                )
                .first()
            )

            if application is None:
                has_any = LoanApplication.objects.filter(client=profile).exists()
                application = LoanApplication.objects.create(
                    client=profile,
                    asana_project_gid=snapshot.get("project_gid"),
                    asana_project_name=project_name,
                    asana_task_gid=snapshot.get("task_gid"),
                    asana_task_name=snapshot.get("task_name"),
                    asana_created_at=snapshot.get("created_at"),
                    asana_status=None,
                    asana_status_history={},
                    status=ApplicationStatus.DRAFT,
                    is_primary=not has_any,
                    created_by=None,
                    amount=None,
                )
                created = True
            else:
                update_fields = []
                if (
                    project_name
                    and application.asana_project_name != project_name
                ):
                    application.asana_project_name = project_name
                    update_fields.append("asana_project_name")
                if (
                    snapshot.get("task_name")
                    and application.asana_task_name != snapshot.get("task_name")
                ):
                    application.asana_task_name = snapshot.get("task_name")
                    update_fields.append("asana_task_name")
                if (
                    snapshot.get("created_at")
                    and application.asana_created_at != snapshot.get("created_at")
                ):
                    application.asana_created_at = snapshot.get("created_at")
                    update_fields.append("asana_created_at")
                if update_fields:
                    application.asana_synced_at = timezone.now()
                    application.save(
                        update_fields=update_fields + ["asana_synced_at"]
                    )
                    metadata_changed = True

            application, changed = _apply_snapshot_status(
                application,
                section,
                status_at,
                created=created,
            )
            _ensure_primary(profile, application)

        result.applications.append(str(application.id))
        result.clients.append(profile.pk)

        if created:
            result.created += 1
            if publish:
                publish_stream_notification(
                    profile.user_id,
                    application_id=str(application.id),
                )
        elif changed or metadata_changed:
            result.updated += 1
        else:
            result.unchanged += 1

        if changed:
            status_section = canonical_loan_status(section)
            if status_section:
                if notify:
                    _notify_status_change(profile, application, status_section)
                elif publish:
                    publish_stream_notification(
                        profile.user_id,
                        loan_status=status_section,
                        application_id=str(application.id),
                    )

    result.clients = list(dict.fromkeys(result.clients))
    return result


def sync_task_by_gid(
    task_gid,
    project_gid=None,
    *,
    service=None,
    include_emails=None,
    notify=False,
    publish=False,
):
    service = service or AsanaProfileService(project_gid)
    try:
        task = service.tasks_api.get_task(
            task_gid,
            {"opt_fields": TASK_OPT_FIELDS},
        )
    except Exception as error:
        logger.warning(
            "Failed to fetch Asana task %s: %s",
            task_gid,
            error,
        )
        raise AsanaProfileError(
            "Unable to retrieve the Asana task."
        ) from error

    snapshot = build_task_snapshot(task, project_gid)
    if not snapshot.get("project_gid"):
        raise AsanaProfileError("Unable to resolve the Asana project.")

    project_name = service._project_name(snapshot["project_gid"])
    return sync_task_snapshot(
        snapshot,
        project_name=project_name,
        include_emails=include_emails,
        notify=notify,
        publish=publish,
    )


def apply_task_status(
    project_gid,
    task_gid,
    section,
    event_at,
    *,
    project_name=None,
    notify=True,
    publish=True,
):
    section = canonical_loan_status(section)
    if section is None:
        return []

    applications = list(
        LoanApplication.objects.filter(
            asana_project_gid=project_gid,
            asana_task_gid=task_gid,
        ).select_related("client__user")
    )
    if not applications:
        return []

    changed_applications = []
    for application in applications:
        if project_name and application.asana_project_name != project_name:
            application.asana_project_name = project_name
            application.save(update_fields=["asana_project_name"])
        application, changed = apply_application_status_change(
            application,
            section,
            asana_event_at=event_at,
        )
        if changed:
            changed_applications.append(application)
            if notify:
                _notify_status_change(
                    application.client,
                    application,
                    section,
                )
            elif publish:
                publish_stream_notification(
                    application.client.user_id,
                    loan_status=section,
                    application_id=str(application.id),
                )
    return changed_applications


def sync_project_tasks(
    project_gid,
    *,
    modified_since=None,
    include_emails=None,
    notify=False,
    publish=False,
    dry_run=False,
):
    service = AsanaProfileService(project_gid)
    try:
        project_name = service._project_name(project_gid)
    except Exception as error:  # noqa: BLE001 - one project must not abort the scan
        logger.warning(
            "Failed to resolve Asana project name %s: %s",
            project_gid,
            error,
        )
        project_name = None
    result = SyncResult()

    for task in list_project_tasks(
        service,
        project_gid,
        modified_since=modified_since,
    ):
        snapshot = build_task_snapshot(task, project_gid)
        emails = snapshot.get("emails") or []
        if include_emails is not None:
            allowed = {
                AsanaProfileService.normalize_email(email)
                for email in include_emails
            }
            if not any(email in allowed for email in emails):
                result.scanned += 1
                result.skipped += 1
                continue
        result.merge(
            sync_task_snapshot(
                snapshot,
                project_name=project_name,
                include_emails=include_emails,
                notify=notify,
                publish=publish,
                dry_run=dry_run,
            )
        )
    return result


def sync_client_applications(email, *, publish=True):
    """Scan every configured project for all tasks containing ``email``.

    Unlike a first-match profile lookup, this ensures joint applications and
    secondary tasks are discovered even when they are not the first matching
    task in a project.
    """
    result = SyncResult()
    project_gids = get_project_gids()
    for project_gid in project_gids:
        try:
            result.merge(
                sync_project_tasks(
                    project_gid,
                    include_emails={email},
                    notify=False,
                    publish=publish,
                )
            )
            get_redis_client().setex(
                f"asana:login-sync-ok:{email}:{project_gid}",
                3600,
                "1",
            )
        except Exception as error:  # noqa: BLE001 - one project must not abort the rest
            logger.exception(
                "Login sync failed for project %s email=%s: %s",
                project_gid,
                email,
                error,
            )
    return result


def audit_project_tasks(project_gid, *, modified_since=None, full=False):
    service = AsanaProfileService(project_gid)
    stats = defaultdict(int)
    unlabeled_samples = []

    for task in list_project_tasks(
        service,
        project_gid,
        modified_since=None if full else modified_since,
    ):
        stats["scanned"] += 1
        profile = AsanaProfileService.parse_task(task, project_gid)
        emails = [
            AsanaProfileService.normalize_email(email)
            for email in (profile.get("emails") or [])
            if email
        ]
        if not emails and profile.get("email"):
            emails = [AsanaProfileService.normalize_email(profile["email"])]
        raw = task.get("notes") or ""
        detected_emails = re.findall(
            r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", raw, re.IGNORECASE
        )
        detected = {email.casefold() for email in detected_emails}

        if emails:
            stats["labeled"] += 1
            profiles = resolve_client_profiles(emails)
            if profiles:
                stats["labeled_valid"] += 1
            else:
                stats["labeled_invalid"] += 1
            if len(emails) > 1:
                stats["joint"] += 1
        elif detected:
            stats["unlabeled_with_email"] += 1
            if len(unlabeled_samples) < 10:
                unlabeled_samples.append(
                    {
                        "task_gid": task.get("gid"),
                        "task_name": task.get("name"),
                        "emails": sorted(detected),
                    }
                )
        else:
            stats["unlabeled_no_email"] += 1

    return {
        "project_gid": project_gid,
        "stats": dict(stats),
        "unlabeled_samples": unlabeled_samples,
    }


def repair_primaries(project_gids=None):
    """Ensure exactly one primary application per client."""
    apps = LoanApplication.objects.filter(is_primary=True)
    if project_gids:
        apps = apps.filter(asana_project_gid__in=project_gids)

    duplicate_clients = (
        apps.values("client_id")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
    )
    for row in duplicate_clients:
        primaries = (
            LoanApplication.objects.filter(
                client_id=row["client_id"], is_primary=True
            )
            .order_by("created_at", "id")
        )
        keep = primaries.first()
        primaries.exclude(pk=keep.pk).update(is_primary=False)

    clients_without_primary = ClientProfile.objects.filter(
        user__role=UserRole.CLIENT,
        user__is_active=True,
        loan_applications__isnull=False,
    ).exclude(
        loan_applications__is_primary=True
    )
    if project_gids:
        clients_without_primary = clients_without_primary.filter(
            loan_applications__asana_project_gid__in=project_gids
        )
    for profile in clients_without_primary.distinct():
        preferred = (
            LoanApplication.objects.filter(client=profile)
            .filter(asana_status=profile.loan_status)
            .order_by("created_at", "id")
            .first()
        )
        target = preferred or (
            LoanApplication.objects.filter(client=profile)
            .order_by("created_at", "id")
            .first()
        )
        if target:
            target.is_primary = True
            target.save(update_fields=["is_primary"])


def enqueue_login_sync(user, response):
    """Best-effort post-login sync for clients with missing applications.

    Enqueues a background RQ job to scan all Asana projects for the user's
    email and create any missing LoanApplication rows. Never blocks the login
    response.
    """
    if not getattr(settings, "ASANA_LOGIN_SYNC_ENABLED", False):
        return False
    if getattr(user, "role", None) != UserRole.CLIENT:
        return False

    try:
        project_gids = get_project_gids()
        all_synced = bool(project_gids) and all(
            get_redis_client().get(
                f"asana:login-sync-ok:{user.email}:{project_gid}"
            )
            for project_gid in project_gids
        )
        if all_synced:
            # Every configured project was synced recently; nothing to do.
            return False

        # Not every project has been synced recently (markers expired or a
        # previous scan failed partway). Clear any stale per-user gate so a
        # fresh scan is enqueued rather than silently skipped.
        get_redis_client().delete(f"asana:login-sync:{user.id}")

        from asana_integration.queue import enqueue_login_sync_job

        enqueue_login_sync_job(user.id, user.email)
        response.data["applications_sync_queued"] = True
        return True
    except Exception:  # noqa: BLE001 - login must not fail because of sync
        logger.exception("Login sync fallback failed for user %s", user.id)
        return False
