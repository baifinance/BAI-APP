from __future__ import annotations

import hashlib
import inspect
import json
import logging
import os
import re
from datetime import datetime, timezone as datetime_timezone

import asana
from asana.rest import ApiException
from django.conf import settings
from otp.utils import get_redis_client

logger = logging.getLogger(__name__)

class AsanaProfileError(RuntimeError):
    """ Raised when the Asana profile lookup failes"""

LOAN_STATUSES = {
    "Pending",
    "Appointment Booked",
    "Under Review",
    "Revisit",
    "Proceeding",
    "Collection of Documents",
    "Assessment",
    "Docs for Sign",
    "For Lodgment",
    "Submitted",
    "Conditional Approval",
    "Conversion to Unconditional Approval",
    "Unconditional Approval",
    "Settlement",
    "Settled",
    "Withdraw"
}


def get_project_gids():
    """Return the ordered, deduplicated list of Asana project GIDs to search.

    Sources (in priority order):
      1. Comma-separated ``ASANA_PROJECT_GIDS`` setting.
      2. Legacy ``ASANA_PROJECT_GID`` setting.
      3. Distinct ``asana_project_gid`` values already stored on
         :class:`~loans.models.LoanApplication` rows.
    """
    gids = []

    env_gids = getattr(settings, "ASANA_PROJECT_GIDS", "") or ""
    for raw in str(env_gids).split(","):
        gid = raw.strip()
        if gid and gid not in gids:
            gids.append(gid)

    legacy = getattr(settings, "ASANA_PROJECT_GID", "") or ""
    for raw in str(legacy).split(","):
        gid = raw.strip()
        if gid and gid not in gids:
            gids.append(gid)

    if not gids:
        try:
            from loans.models import LoanApplication

            gids = list(
                LoanApplication.objects.exclude(
                    asana_project_gid__isnull=True
                )
                .exclude(asana_project_gid="")
                .values_list("asana_project_gid", flat=True)
                .distinct()
            )
        except Exception:  # noqa: BLE001 - DB may not be ready at import time
            logger.exception("Could not resolve Asana project GIDs from DB")
            gids = []

    return gids


class AsanaProfileService:
    """
    Asana integration using the official Asana Python SDK.
    
    It searches tasks in one configured project, matches the email parsed from
    each task description, and can move a task between project sections.
    """

    def __init__(self, project_gid=None):
        access_token = getattr(
            settings,
            "ASANA_ACCESS_TOKEN",
            "",
        )

        if project_gid is None:
            configured_gids = get_project_gids()
            project_gid = configured_gids[0] if configured_gids else ""

        if not access_token:
            raise AsanaProfileError(
                "ASANA_ACCESS_TOKEN is not configured."
            )

        if not project_gid:
            raise AsanaProfileError(
                "PROJECT_GID is not configured."
            )

        configuration = asana.Configuration()
        configuration.access_token = access_token

        self.api_client = asana.ApiClient(configuration)

        try:
            self._request_timeout = float(os.getenv("ASANA_REQUEST_TIMEOUT", "10"))
        except (TypeError, ValueError):
            self._request_timeout = 10.0
        self._request_timeout = min(max(self._request_timeout, 2.0), 30.0)
        _call_api = self.api_client.call_api
        _timeout_index = list(
            inspect.signature(_call_api).parameters
        ).index("_request_timeout")

        def _call_api_with_timeout(*args, **kwargs):
            if "_request_timeout" in kwargs:
                if kwargs["_request_timeout"] is None:
                    kwargs["_request_timeout"] = self._request_timeout
            elif len(args) <= _timeout_index:
                kwargs["_request_timeout"] = self._request_timeout
            elif args[_timeout_index] is None:
                args = (
                    args[:_timeout_index]
                    + (self._request_timeout,)
                    + args[_timeout_index + 1:]
                )
            return _call_api(*args, **kwargs)

        self.api_client.call_api = _call_api_with_timeout

        self.tasks_api = asana.TasksApi(self.api_client)
        self.sections_api = asana.SectionsApi(self.api_client)
        self.projects_api = asana.ProjectsApi(self.api_client)
        self.project_gid = project_gid

    def find_profile_by_email(self, email):
        """
        Search the configured Asana project and return the first task 
        whose description email matches the supplied email.

        Kept for backward compatibility: searches ``self.project_gid`` only.
        Use :meth:`find_profiles_by_email` to search all configured projects.
        """
        return self._find_first_in_project(self.project_gid, email)

    def find_profiles_by_email(self, email):
        """
        Search every configured Asana project and return a list of public
        profiles whose task description email matches ``email``.

        Each returned dict includes ``asana_project_gid`` and
        ``asana_project_name`` so callers can group results by loan project.
        """
        normalized_email = self.normalize_email(email)
        results = []

        for project_gid in get_project_gids():
            profile = self._find_first_in_project(project_gid, email)
            if profile is not None:
                profile["asana_project_gid"] = project_gid
                results.append(profile)

        return results

    def _find_first_in_project(self, project_gid, email):
        """Return the first matching public profile within one project, or None."""
        normalized_email = self.normalize_email(email)

        options = {
            "limit": 100,
            "opt_fields": (
                "gid,"
                "name,"
                "notes,"
                "created_at,"
                "memberships.project.gid,"
                "memberships.section.gid,"
                "memberships.section.name"
            ),
        }

        try:
            tasks = self.tasks_api.get_tasks_for_project(
                project_gid,
                options,
            )

            for task in tasks:
                profile = self.parse_task(task, project_gid)
                task_emails = {
                    self.normalize_email(value)
                    for value in profile.get("emails", [])
                }

                if normalized_email in task_emails:
                    public = self.to_public_profile(profile)
                    public["email"] = normalized_email
                    public["asana_task_gid"] = profile.get("asana_task_gid")
                    public["asana_task_name"] = profile.get("asana_task_name")
                    public["asana_project_gid"] = project_gid
                    public["asana_project_name"] = (
                        profile.get("asana_project_name")
                        or self._project_name(project_gid)
                    )
                    return public

        except ApiException as error:
            logger.warning(
                "ASANA API request failed: project=%s status=%s reason=%s",
                project_gid,
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )
            raise AsanaProfileError(
                "unable to retrieve the client profile from Asana."
            ) from error

        return None

    def _project_name(self, project_gid):
        """Return the Asana project name, cached to avoid repeat API calls."""
        if not project_gid:
            return None

        cache_key = f"asana_project_name:{project_gid}"
        try:
            cached = get_redis_client().get(cache_key)
            if cached is not None:
                return cached.decode() or None
        except Exception:  # cache is best-effort
            logger.warning(
                "Could not read cached Asana project name for %s",
                project_gid,
                exc_info=True,
            )

        try:
            project = self.projects_api.get_project(
                project_gid, {"opt_fields": "name"}
            )
        except ApiException as error:
            logger.warning(
                "ASANA project lookup failed: project=%s status=%s reason=%s",
                project_gid,
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )
            return None

        name = project.get("name") if project else None
        if name:
            try:
                get_redis_client().setex(cache_key, 86400, name)
            except Exception:  # cache is best-effort
                logger.warning(
                    "Could not cache Asana project name for %s",
                    project_gid,
                    exc_info=True,
                )
        return name

    def move_task_to_status(self, email, loan_status, *, task_gid=None, project_gid=None):
        """
        Move the client's task to the Asana section matching ``loan_status``.

        Resolution order:
          1. ``task_gid`` (exact task) - project is taken from memberships.
          2. ``project_gid`` (search only that project).
          3. Legacy email-only search across ``self.project_gid``.

        Raises ``ValueError`` when the task/section is missing or the legacy
        email-only search matches multiple applications (ambiguous).
        """
        if loan_status not in LOAN_STATUSES:
            raise ValueError(f"Unsupported loan status: {loan_status}")

        normalized_email = self.normalize_email(email)

        if task_gid:
            return self._move_task_by_gid(task_gid, loan_status, normalized_email)

        if project_gid:
            return self._move_task_in_project(
                project_gid, loan_status, normalized_email
            )

        # Legacy path: email-only search within the configured project.
        return self._move_task_in_project(
            self.project_gid, loan_status, normalized_email, legacy_ambiguous=True
        )

    def _move_task_by_gid(self, task_gid, loan_status, normalized_email):
        """Move a specific task, resolving its project from memberships."""
        task_options = {
            "opt_fields": (
                "gid,name,notes,"
                "memberships.project.gid,"
                "memberships.section.gid,"
                "memberships.section.name"
            ),
        }

        try:
            task = self.tasks_api.get_task(task_gid, task_options)
        except ApiException as error:
            logger.warning(
                "ASANA get_task failed: task=%s status=%s reason=%s",
                task_gid,
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )
            raise AsanaProfileError(
                "Unable to retrieve the Asana task."
            ) from error

        profile = self.parse_task(task, None)
        task_emails = {
            self.normalize_email(value)
            for value in profile.get("emails", [])
        }
        if normalized_email not in task_emails:
            raise ValueError(
                f"No Asana task found for client email: {normalized_email}"
            )

        target_project_gid = None
        for membership in (task.get("memberships") or []):
            project = (membership.get("project") or {})
            if project.get("gid"):
                target_project_gid = project["gid"]
                break

        if not target_project_gid:
            target_project_gid = self.project_gid

        return self._move_task_in_project(
            target_project_gid, loan_status, normalized_email,
            task_gid=task_gid, task=task,
        )

    def _move_task_in_project(
        self, project_gid, loan_status, normalized_email,
        task_gid=None, task=None, legacy_ambiguous=False
    ):
        """Locate and move a task within one project."""
        task_options = {
            "limit": 100,
            "opt_fields": (
                "gid,name,notes,"
                "memberships.project.gid,"
                "memberships.section.gid,"
                "memberships.section.name"
            ),
        }
        section_options = {
            "limit": 100,
            "opt_fields": "gid,name",
        }

        try:
            if task is None:
                tasks = self.tasks_api.get_tasks_for_project(
                    project_gid,
                    task_options,
                )

                matching_tasks = []
                for candidate in tasks:
                    candidate_profile = self.parse_task(candidate, project_gid)
                    candidate_emails = {
                        self.normalize_email(value)
                        for value in candidate_profile.get("emails", [])
                    }
                    if normalized_email in candidate_emails:
                        matching_tasks.append(candidate)

                if legacy_ambiguous and len(matching_tasks) > 1:
                    raise ValueError(
                        "Multiple Asana tasks match this email across configured "
                        "projects. Specify application_id, task_gid, or project_gid."
                    )

                if not matching_tasks:
                    raise ValueError(
                        f"No Asana task found for client email: {normalized_email}"
                    )

                task = matching_tasks[0]

            target_section = None
            sections = self.sections_api.get_sections_for_project(
                project_gid,
                section_options,
            )

            for section in sections:
                if section.get("name") == loan_status:
                    target_section = section
                    break

            if target_section is None:
                raise ValueError(
                    f"No Asana section found for loan status: {loan_status}"
                )

            current_section = next(
                (
                    membership.get("section") or {}
                    for membership in (task.get("memberships") or [])
                    if (membership.get("section") or {}).get("gid")
                ),
                {},
            )

            if current_section.get("gid") == target_section["gid"]:
                return {
                    "task_gid": task["gid"],
                    "project_gid": project_gid,
                    "loan_status": loan_status,
                    "section_gid": target_section["gid"],
                }

            self.sections_api.add_task_for_section(
                target_section["gid"],
                {"body": {"task": task["gid"]}},
            )

            return {
                "task_gid": task["gid"],
                "project_gid": project_gid,
                "loan_status": loan_status,
                "section_gid": target_section["gid"],
            }

        except ApiException as error:
            logger.warning(
                "ASANA status update failed: project=%s status=%s reason=%s",
                project_gid,
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )
            raise AsanaProfileError(
                "Unable to update the client loan status in Asana."
            ) from error

    @classmethod
    def parse_task(cls, task, project_gid=None):
        """
        Convert an Asana task into a normalized profile dictionary.
        """
        notes = (task.get("notes") or "").strip()

        profile = cls.parse_description(notes)

        profile["asana_task_gid"] = task.get("gid")
        profile["asana_task_name"] = task.get("name")
        profile["asana_created_at"] = task.get("created_at")
        profile["raw"] = notes

        memberships = task.get("memberships") or []

        scoped = (
            [
                membership
                for membership in memberships
                if (membership.get("project") or {}).get("gid") == project_gid
            ]
            if project_gid
            else memberships
        )

        section = next(
            (
               membership.get("section") or {}
               for membership in scoped
               if (membership.get("section") or {}).get("name")
            ),
            {}
        )
        section_name = section.get("name")

        if section_name:
            profile["asana_section"] = section_name
            profile["asana_section_gid"] = section.get("gid")
            profile["loan_status"] = (
                section_name if section_name in LOAN_STATUSES else None
            )

        return profile

    @classmethod
    def parse_description(cls, text):
        """
        Parse labeled values from an Asana task description.

        Example:
            Fullname: John Smith
            Email: john@example.com
            Mobile: 09152842125
        """
        if not text:
            return {}

        label_pattern = re.compile(
            r"(?i)"
            r"(?:"
            r"(?P<fullname>full name|opportunity|(?<!\w)name)"
            r"|(?P<dob>date of birth|(?<!\w)dob\b)"
            r"|(?P<email>"
            r"applicant(?:'s)? email(?: address)?|"
            r"email address|"
            r"(?<!\w)e-?mail(?: address)?"
            r")(?:\s*#?\s*\d+)?"
            r"|(?P<mobile>"
            r"mobile number|"
            r"mobile no\.?|"
            r"(?<!\w)mobile\b|"
            r"contact number|"
            r"contact no\.?|"
            r"(?<!\w)phone\b"
            r")"
            r"|(?P<address>current address|home address|(?<!\w)address\b)"
            r"|(?P<visa_subclass>visa subclass)"
            r"|(?P<visa_expiry>visa expiry)"
            r"|(?P<visa>(?<!\w)visa\b)"
            r"|(?P<loan_amount>loan amount)"
            r"|(?P<goal>"
            r"goal/reason for goal|"
            r"reason for goal|"
            r"(?<!\w)goal\b"
            r")"
            r"|(?P<source>referred by|(?<!\w)source\b)"
            r"|(?P<inquiry>inquiry description|(?<!\w)inquiry\b)"
            r")"
            r"\s*:"
        )

        matches = list(label_pattern.finditer(text))
        fields = {}
        emails = []

        for index, match in enumerate(matches):
            key = next(
                group_name
                for group_name, value in match.groupdict().items()
                if value is not None
            )

            if index + 1 < len(matches):
                next_start = matches[index + 1].start()
            else:
                next_start = len(text)

            value = text[match.end() : next_start]
            value = re.sub(r"\s+", " ", value)
            value = value.strip(" \t\r\n•·-─")

            if not value:
                continue

            if key == "email":
                for found in re.findall(
                    r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}",
                    value,
                    re.IGNORECASE,
                ):
                    normalized = found.casefold()
                    if normalized not in emails:
                        emails.append(normalized)
                continue

            fields.setdefault(key, value)

        if emails:
            fields["email"] = emails[0]
            fields["emails"] = emails

        return fields

    @staticmethod
    def normalize_email(email):
        return email.strip().casefold()

    @staticmethod
    def to_public_profile(profile):
        """
        Return only approved fields.

        Do not expose the original raw description or task metadata.
        """

        allowed_fields = (
            "fullname",
            "dob",
            "email",
            "address",
            "mobile",
            "visa_subclass",
            "visa_expiry",
            "visa",
            "loan_amount",
            "goal",
            "source",
            "inquiry",
            "loan_status",
            "asana_created_at",
        )

        return {
            key: profile[key]
            for key in allowed_fields
            if profile.get(key)
        }

_ASANA_PROFILE_CACHE_TTL = 60


def get_client_asana_profile(email):
    """
    Return a client profile from Asana when feature is enabled.

    Results are cached in Redis briefly so the blocking Asana lookup does
    not run on every login for the same client.
    """

    enabled = getattr(
        settings,
        "ASANA_PROFILE_LOOKUP_ENABLED",
        False
    )

    if not enabled:
        return None

    cache_key = f"asana_profile:{email.lower()}"
    cached = get_redis_client().get(cache_key)
    if cached is not None:
        try:
            return json.loads(cached)
        except (TypeError, ValueError):
            return None

    service = AsanaProfileService()
    profiles = service.find_profiles_by_email(email)
    profile = profiles[0] if profiles else None
    if profile is not None:
        get_redis_client().setex(
            cache_key, _ASANA_PROFILE_CACHE_TTL, json.dumps(profile)
        )
    return profile


_TASK_EMAIL_CACHE_TTL = 60 * 15
_SECTION_NAME_CACHE_TTL = 60 * 15

_section_name_cache = {}


def _section_name(section_gid):
    """Resolve an Asana section GID to its name, cached in Redis + process."""
    if not section_gid:
        return ""
    cache_key = f"asana_section:{section_gid}"
    cached = get_redis_client().get(cache_key)
    if cached is not None:
        return cached.decode()
    if section_gid in _section_name_cache:
        return _section_name_cache[section_gid]
    try:
        section = AsanaProfileService().sections_api.get_section(
            section_gid,
            {"opt_fields": "name"},
        )
    except ApiException as error:
        logger.warning(
            "Failed to resolve Asana section %s: status=%s reason=%s",
            section_gid,
            getattr(error, "status", None),
            getattr(error, "reason", str(error)),
        )
        return ""
    name = (section or {}).get("name") or ""
    if name:
        get_redis_client().setex(cache_key, _SECTION_NAME_CACHE_TTL, name)
        _section_name_cache[section_gid] = name
    return name


_EVENT_FINGERPRINT_TTL = 60 * 60 * 24


def _event_fingerprint(event):
    """Return a stable SHA-256 digest for one webhook event payload."""
    canonical = json.dumps(
        event,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(canonical).hexdigest()


def claim_event(event):
    """Claim an event for processing, returning ``(digest, claimed)``.

    Exact retries of the same delivery share a fingerprint, so only the first
    copy is processed. Redis failures never block processing; the stale-event
    guard in ``apply_loan_status_change`` remains the durable backstop.
    """
    digest = _event_fingerprint(event)
    try:
        claimed = get_redis_client().set(
            f"asana:webhook:{digest}",
            "1",
            nx=True,
            ex=_EVENT_FINGERPRINT_TTL,
        )
    except Exception:
        logger.exception("Could not claim Asana webhook event %s", digest)
        return digest, True
    return digest, bool(claimed)


def release_event(digest):
    """Release a fingerprint so a failed event can be retried."""
    if not digest:
        return
    try:
        get_redis_client().delete(f"asana:webhook:{digest}")
    except Exception:
        logger.exception("Could not release Asana webhook event %s", digest)


def _parse_event_created_at(event):
    """Parse the top-level Asana event ``created_at`` timestamp."""
    raw = event.get("created_at")
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime_timezone.utc)
    return parsed


def _invalidate_task_cache(task_gid):
    try:
        get_redis_client().delete(
            f"asana_task:{task_gid}",
            f"asana_task_name:{task_gid}",
        )
    except Exception:
        logger.warning("Could not invalidate Asana task cache", exc_info=True)


def _task_project_gid(task_gid):
    try:
        task = AsanaProfileService().tasks_api.get_task(
            task_gid,
            {"opt_fields": "memberships.project.gid"},
        )
    except (ApiException, AsanaProfileError, ValueError):
        logger.warning("Could not resolve Asana project for task %s", task_gid)
        return None

    configured = set(get_project_gids())
    for membership in task.get("memberships") or []:
        gid = (membership.get("project") or {}).get("gid")
        if gid and (not configured or str(gid) in configured):
            return str(gid)
    return None


def process_webhook_event_job(event, digest, project_gid=None):
    """RQ job wrapper.

    Releases the webhook fingerprint on permanent failure so Asana can
    redeliver the event instead of silently dropping it.
    """
    try:
        handle_task_moved_event(event, project_gid=project_gid)
    except Exception:
        release_event(digest)
        raise


def _sync_task_event(task_gid, project_gid, *, notify):
    from asana_integration.services.loan_sync import sync_task_by_gid

    result = sync_task_by_gid(
        task_gid,
        project_gid,
        notify=notify,
        publish=True,
    )
    logger.info(
        "Asana task synced: task=%s created=%s updated=%s unchanged=%s skipped=%s",
        task_gid,
        result.created,
        result.updated,
        result.unchanged,
        result.skipped,
    )
    return result


def handle_task_moved_event(event, project_gid=None):
    """
    Process one Asana webhook event.

    Section moves update every application sharing the task. Notes and task
    additions fetch a fresh snapshot and create applications for every active
    client email on the task. Removed tasks are retained and logged.
    """

    event_at = _parse_event_created_at(event)
    if event_at is None:
        logger.warning(
            "Asana event skipped: missing or invalid created_at resource=%s",
            (event.get("resource") or {}).get("gid"),
        )
        return

    action = event.get("action")
    if action not in ("moved", "changed", "added", "removed"):
        logger.info(
            "Asana event skipped: action=%s resource=%s",
            action,
            (event.get("resource") or {}).get("gid"),
        )
        return

    resource = event.get("resource") or {}
    task_gid = resource.get("gid")
    if not task_gid:
        logger.info("Asana event skipped: no task gid")
        return

    parent = event.get("parent") or {}
    change = event.get("change") or {}
    field = change.get("field")

    if action == "removed":
        logger.info(
            "Asana task removed; retaining local applications: task=%s project=%s",
            task_gid,
            project_gid,
        )
        return

    if field in ("notes", "html_notes"):
        _invalidate_task_cache(task_gid)
        _sync_task_event(task_gid, project_gid, notify=True)
        return

    if action == "added" and parent.get("resource_type") != "section":
        _invalidate_task_cache(task_gid)
        _sync_task_event(task_gid, project_gid, notify=True)
        return

    if field == "name":
        _invalidate_task_cache(task_gid)
        _sync_task_event(task_gid, project_gid, notify=False)
        return

    is_section_event = (
        field == "memberships"
        or action == "moved"
        or (
            action == "added"
            and parent.get("resource_type") == "section"
        )
    )
    if not is_section_event:
        logger.info(
            "Asana event skipped: action=%s field=%s",
            action,
            field,
        )
        return

    section_name = (change.get("new_section") or {}).get("name") or ""
    if not section_name:
        new_value = change.get("new_value") or {}
        section_name = (
            new_value.get("name")
            or (new_value.get("resource") or {}).get("name")
            or ""
        )
    if not section_name:
        section_name = _section_name(parent.get("gid"))

    if not section_name:
        logger.info(
            "Asana event skipped: no section name action=%s",
            action,
        )
        return

    if section_name not in LOAN_STATUSES:
        logger.info(
            "Asana event ignored: action=%s section_name=%r",
            action,
            section_name,
        )
        return

    project_gid = project_gid or _task_project_gid(task_gid)
    if not project_gid:
        logger.warning(
            "Asana event skipped: no project for task %s",
            task_gid,
        )
        return

    from asana_integration.services.loan_sync import (
        apply_task_status,
        sync_task_by_gid,
    )
    from loans.models import LoanApplication

    logger.info(
        "Asana event received: action=%s task=%s section=%s project=%s",
        action,
        task_gid,
        section_name,
        project_gid,
    )

    project_name = None
    try:
        project_name = AsanaProfileService(
            project_gid=project_gid
        )._project_name(project_gid)
    except AsanaProfileError:
        pass

    has_applications = LoanApplication.objects.filter(
        asana_project_gid=project_gid,
        asana_task_gid=task_gid,
    ).exists()
    if not has_applications:
        sync_task_by_gid(
            task_gid,
            project_gid,
            notify=True,
            publish=True,
        )
        return

    changed = apply_task_status(
        project_gid,
        task_gid,
        section_name,
        event_at,
        project_name=project_name,
        notify=True,
        publish=True,
    )
    if not changed:
        logger.info(
            "Asana event ignored: status unchanged task=%s status=%s",
            task_gid,
            section_name,
        )


def _fetch_task_details(task_gid):
    """Return ``(email, name)`` for an Asana task, cached per task GID."""
    email_cache_key = f"asana_task:{task_gid}"
    name_cache_key = f"asana_task_name:{task_gid}"
    cached_email = get_redis_client().get(email_cache_key)
    cached_name = get_redis_client().get(name_cache_key)
    if cached_email is not None and cached_name is not None:
        return cached_email.decode(), (cached_name.decode() or None)

    try:
        service = AsanaProfileService()
        task = service.tasks_api.get_task(
            task_gid, {"opt_fields": "notes,name"}
        )
    except ApiException as error:
        logger.warning(
            "Failed to fetch Asana task %s: status=%s reason=%s",
            task_gid,
            getattr(error, "status", None),
            getattr(error, "reason", str(error)),
        )
        return None, None

    profile = service.parse_task(task, service.project_gid)
    email = profile.get("email")
    name = task.get("name")

    if email:
        email = service.normalize_email(email)
        get_redis_client().setex(
            email_cache_key, _TASK_EMAIL_CACHE_TTL, email
        )
    if name:
        get_redis_client().setex(
            name_cache_key, _TASK_EMAIL_CACHE_TTL, name
        )
    return email, name


def _task_email(task_gid):
    """Resolve the client email for an Asana task, cached per task GID."""
    email, _name = _fetch_task_details(task_gid)
    return email


def _task_name(task_gid):
    """Resolve the Asana task name, cached per task GID."""
    _email, name = _fetch_task_details(task_gid)
    return name