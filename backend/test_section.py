"""Asana section / loan status tests + optional live task dump.

Run from the backend directory with the virtualenv active:

    python test_section.py             # offline: unit tests only
    python test_section.py --tasks     # tests + live Asana dump

The --tasks flag fetches every task in the configured Asana project and
prints them (gid, name, section, loan status, parsed fields) as JSON.
"""

import json
import os
import sys
import unittest


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "apps"))

env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings.development",
)

import django

django.setup()

from asana_integration.services.asana import (
    AsanaProfileError,
    AsanaProfileService,
)


def make_task(
    name="Maria Santos",
    notes="Fullname: Maria Santos\nEmail: maria@example.com",
    section_name="Origination (New Leads)",
):
    task = {
        "gid": "12345",
        "name": name,
        "notes": notes,
        "memberships": [],
    }
    if section_name is not None:
        task["memberships"].append(
            {
                "section": {
                    "gid": "9999",
                    "name": section_name,
                },
            }
        )
    return task


class TestParseTaskSection(unittest.TestCase):
    def test_returns_section_from_memberships(self):
        task = make_task(section_name="Origination (New Leads)")
        profile = AsanaProfileService.parse_task(task)
        self.assertEqual(profile["asana_section"], "Origination (New Leads)")

    def test_returns_prospects_section(self):
        task = make_task(section_name="Prospects")
        profile = AsanaProfileService.parse_task(task)
        self.assertEqual(profile["asana_section"], "Prospects")

    def test_keeps_task_metadata(self):
        task = make_task(name="Maria Santos")
        profile = AsanaProfileService.parse_task(task)
        self.assertEqual(profile["asana_task_gid"], "12345")
        self.assertEqual(profile["asana_task_name"], "Maria Santos")

    def test_no_section_key_when_memberships_empty(self):
        task = make_task(section_name=None)
        profile = AsanaProfileService.parse_task(task)
        self.assertNotIn("asana_section", profile)

    def test_picks_first_membership_when_multiple(self):
        task = make_task()
        task["memberships"].append({"section": {"gid": "8888", "name": "Other"}})
        profile = AsanaProfileService.parse_task(task)
        self.assertEqual(profile["asana_section"], "Origination (New Leads)")

    def test_loan_status_matches_section_name(self):
        for section_name in ("Under Review", "Revisit", "Collection of Documents"):
            with self.subTest(section=section_name):
                profile = AsanaProfileService.parse_task(
                    make_task(section_name=section_name)
                )
                self.assertEqual(profile["loan_status"], section_name)

    def test_loan_status_none_for_origination(self):
        task = make_task(section_name="Origination (New Leads)")
        profile = AsanaProfileService.parse_task(task)
        self.assertIsNone(profile["loan_status"])
        self.assertEqual(profile["asana_section"], "Origination (New Leads)")

    def test_loan_status_none_for_prospects(self):
        task = make_task(section_name="Prospects (Engage Broker Intro)")
        profile = AsanaProfileService.parse_task(task)
        self.assertIsNone(profile["loan_status"])

    def test_loan_status_none_for_unknown_section(self):
        task = make_task(section_name="Some Other Section")
        profile = AsanaProfileService.parse_task(task)
        self.assertIsNone(profile["loan_status"])

    def test_loan_status_withdraw(self):
        task = make_task(section_name="Withdraw")
        profile = AsanaProfileService.parse_task(task)
        self.assertEqual(profile["loan_status"], "Withdraw")

    def test_loan_status_absent_when_no_memberships(self):
        task = make_task(section_name=None)
        profile = AsanaProfileService.parse_task(task)
        self.assertNotIn("loan_status", profile)


class TestPublicProfileExposesLoanStatus(unittest.TestCase):
    def test_includes_loan_status_when_set(self):
        task = make_task(section_name="Under Review")
        profile = AsanaProfileService.parse_task(task)
        public = AsanaProfileService.to_public_profile(profile)
        self.assertEqual(public["loan_status"], "Under Review")

    def test_omits_none_loan_status(self):
        task = make_task(section_name="Origination (New Leads)")
        profile = AsanaProfileService.parse_task(task)
        public = AsanaProfileService.to_public_profile(profile)
        self.assertNotIn("loan_status", public)

    def test_does_not_expose_asana_section(self):
        task = make_task(section_name="Under Review")
        profile = AsanaProfileService.parse_task(task)
        public = AsanaProfileService.to_public_profile(profile)
        self.assertNotIn("asana_section", public)


def print_tasks():
    """Fetch all tasks in the configured Asana project and print them as JSON."""
    try:
        service = AsanaProfileService()
    except AsanaProfileError as error:
        print(f"\nSkipping task dump: {error}")
        return

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
        tasks = service.tasks_api.get_tasks_for_project(
            service.project_gid,
            options,
        )
    except Exception as error:
        print(f"\nFailed to fetch tasks from Asana: {error}")
        return

    profiles = []
    for task in tasks:
        profile = AsanaProfileService.parse_task(task)
        profile.pop("raw", None)
        profiles.append(profile)

    print("\n=== ASANA TASKS ===")
    print(json.dumps(profiles, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    tasks_mode = "--tasks" in sys.argv
    if tasks_mode:
        sys.argv.remove("--tasks")
    unittest.main(verbosity=2, exit=False)
    if tasks_mode:
        print_tasks()