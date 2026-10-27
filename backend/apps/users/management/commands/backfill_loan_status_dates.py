"""One-off backfill of the "Pending" loan-status date for client profiles.

Prefers the accurate Asana task ``created_at`` (when the client was added in
Asana) and falls back to the local account creation time.
"""

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import ClientProfile


class Command(BaseCommand):
    help = "Set the 'Pending' loan-status date for client profiles that lack one."

    def add_arguments(self, parser):
        parser.add_argument(
            "--use-local-created",
            action="store_true",
            help="Skip Asana and use the local account creation date.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite an existing 'Pending' entry.",
        )

    def handle(self, *args, **options):
        use_local = options["use_local_created"]
        force = options["force"]

        service = None
        if not use_local and getattr(settings, "ASANA_PROFILE_LOOKUP_ENABLED", False):
            from asana_integration.services.asana import AsanaProfileService

            service = AsanaProfileService()

        updated = skipped = 0

        for profile in ClientProfile.objects.select_related("user"):
            history = dict(profile.loan_status_history or {})
            if "Pending" in history and not force:
                skipped += 1
                continue

            when = None
            if service is not None:
                from asana_integration.services.asana import AsanaProfileError

                try:
                    asana = service.find_profile_by_email(profile.user.email)
                except AsanaProfileError as error:
                    self.stderr.write(
                        f"Asana lookup failed for {profile.user_id}: {error}"
                    )
                    asana = None
                if asana:
                    when = asana.get("asana_created_at")

            if not when:
                when = (
                    profile.user.created_at.isoformat()
                    if profile.user.created_at
                    else timezone.now().isoformat()
                )

            history["Pending"] = when
            profile.loan_status_history = history
            profile.save(update_fields=["loan_status_history"])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {updated} profile(s); skipped {skipped}."
            )
        )
