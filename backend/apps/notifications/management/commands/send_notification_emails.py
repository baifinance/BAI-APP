from django.core.management.base import BaseCommand

from notifications.email import send_due_notification_emails


class Command(BaseCommand):
    help = "Send queued notification emails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of outbox rows to process.",
        )

    def handle(self, *args, **options):
        sent, attempted = send_due_notification_emails(limit=options["limit"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Notification email outbox: {sent} sent, {attempted} attempted."
            )
        )
