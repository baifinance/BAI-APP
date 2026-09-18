from __future__ import annotations

import logging
import re

import asana
from asana.rest import ApiException
from django.conf import settings

logger = logging.getLogger(__name__)

class AsanaProfileError(RuntimeError):
    """ Raised when the Asana profile lookup failes"""

class AsanaProfileService:
    """
    Read-only Asana integration using the official Asana Python SDK.
    
    It searches tasks in one configured project and matches the email parsed from each task description
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
            profile["asana_section"] = section.get("name")

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