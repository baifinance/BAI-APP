from __future__ import annotations

import logging
import re

import asana
from asana.rest import ApiException
from django.conf import settings

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
    "For Lodgement",
    "Submitted",
    "Conditional Approval",
    "Settlement",
    "Settled",
    "Withdraw"
}


class AsanaProfileService:
    """
    Asana integration using the official Asana Python SDK.
    
    It searches tasks in one configured project, matches the email parsed from
    each task description, and can move a task between project sections.
    """

    def __init__(self):
        access_token = getattr(
            settings,
            "ASANA_ACCESS_TOKEN",
            "",
        )

        project_gid = getattr(
            settings,
            "ASANA_PROJECT_GID",
            "",
        )

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
        self.tasks_api = asana.TasksApi(self.api_client)
        self.sections_api = asana.SectionsApi(self.api_client)
        self.project_gid = project_gid

    def find_profile_by_email(self, email):
        """
        Search the configured Asana project and return the first task 
        whose description email matches the supplied email.
        """
        normalized_email = self.normalize_email(email)

        options = {
            "limit": 100,
            "opt_fields": (
                "gid,"
                "name,"
                "notes,"
                "memberships.section.gid,"
                "memberships.section.name"
            ),
        }

        try:
            tasks = self.tasks_api.get_tasks_for_project(
                self.project_gid,
                options,
            )

            for task in tasks:
                profile = self.parse_task(task)

                task_email = self.normalize_email(
                    profile.get("email", "")
                )

                if task_email == normalized_email:
                    return self.to_public_profile(profile)

        except ApiException as error:
            logger.warning(
                "ASANA API request failed: status=%s reason %s",
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )

            raise AsanaProfileError(
                "unable to retrieve the client profile from Asana."
            ) from error

        return None

    def move_task_to_status(self, email, loan_status):
        """
        Move the client's task to the Asana section matching ``loan_status``.

        The task is located by the email in its description, and the target
        section is located by its exact name in the configured project.
        """
        if loan_status not in LOAN_STATUSES:
            raise ValueError(f"Unsupported loan status: {loan_status}")

        normalized_email = self.normalize_email(email)
        task_options = {
            "limit": 100,
            "opt_fields": "gid,name,notes,memberships.section.gid,memberships.section.name",
        }
        section_options = {
            "limit": 100,
            "opt_fields": "gid,name",
        }

        try:
            matching_task = None
            tasks = self.tasks_api.get_tasks_for_project(
                self.project_gid,
                task_options,
            )

            for task in tasks:
                profile = self.parse_task(task)
                if self.normalize_email(profile.get("email", "")) == normalized_email:
                    matching_task = task
                    break

            if matching_task is None:
                raise ValueError(
                    f"No Asana task found for client email: {email}"
                )

            target_section = None
            sections = self.sections_api.get_sections_for_project(
                self.project_gid,
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
                    for membership in (matching_task.get("memberships") or [])
                    if (membership.get("section") or {}).get("gid")
                ),
                {},
            )

            if current_section.get("gid") == target_section["gid"]:
                return {
                    "task_gid": matching_task["gid"],
                    "loan_status": loan_status,
                    "section_gid": target_section["gid"],
                }

            self.sections_api.add_task_for_section(
                target_section["gid"],
                {"body": {"task": matching_task["gid"]}},
            )

            return {
                "task_gid": matching_task["gid"],
                "loan_status": loan_status,
                "section_gid": target_section["gid"],
            }

        except ApiException as error:
            logger.warning(
                "ASANA status update failed: status=%s reason=%s",
                getattr(error, "status", None),
                getattr(error, "reason", str(error)),
            )
            raise AsanaProfileError(
                "Unable to update the client loan status in Asana."
            ) from error

    @classmethod
    def parse_task(cls, task):
        """
        Convert an Asana task into a normalized profile dictionary.
        """
        notes = (task.get("notes") or "").strip()

        profile = cls.parse_description(notes)

        profile["asana_task_gid"] = task.get("gid")
        profile["asana_task_name"] = task.get("name")
        profile["raw"] = notes

        memberships = task.get("memberships") or []

        if memberships:
            section = memberships[0].get("section") or {}
            section_name = section.get("name")
            if section_name:
                profile["asana_section"] = section_name
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
            r"|(?P<email>email address|(?<!\w)e?-?mail\b)"
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

            if value:
                fields.setdefault(key, value)

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
            "loan_status"
        )

        return {
            key: profile[key]
            for key in allowed_fields
            if profile.get(key)
        }

def get_client_asana_profile(email):
    """
    Return a client profile from Asana when feature is enabled.
    """

    enabled = getattr(
        settings,
        "ASANA_PROFILE_LOOKUP_ENABLED",
        False
    )

    if not enabled:
        return None

    service = AsanaProfileService()
    return service.find_profile_by_email(email)