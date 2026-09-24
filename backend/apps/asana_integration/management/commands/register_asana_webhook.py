import asana
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = "Register or delete the Asana webhook for loan-status events."

    def add_arguments(self, parser):
        parser.add_argument("--target", dest="target", help="Public HTTPS URL receiving events (e.g. https://<id>.ngrok-free.app/api/asana/webhook).")
        parser.add_argument("--delete", dest="webhook_gid", help="Delete an existing webhook by GID.")

    def handle(self, *args, **options):
        if not settings.ASANA_ACCESS_TOKEN or not settings.ASANA_PROJECT_GID:
            raise CommandError("ASANA_ACCESS_TOKEN / ASANA_PROJECT_GID are not configured.")
        if not settings.ASANA_WEBHOOK_ENABLED:
            raise CommandError("Set ASANA_WEBHOOK_ENABLED=True in .env first.")

        configuration = asana.Configuration()
        configuration.access_token = settings.ASANA_ACCESS_TOKEN
        api = asana.WebhooksApi(asana.ApiClient(configuration))

        if options["webhook_gid"]:
            api.delete_webhook(options["webhook_gid"])
            self.stdout.write(self.style.SUCCESS(f"Deleted webhook {options['webhook_gid']}"))
            return

        target = options["target"]
        if not target:
            raise CommandError("--target is required to register a webhook.")

        result = api.create_webhook({
            "data": {
                "resource": settings.ASANA_PROJECT_GID,
                "target": target,
                "filters": [
                    {"resource_type": "task", "action": "changed"},
                    {"resource_type": "task", "action": "added"},
                    {"resource_type": "task", "action": "removed"}
                ],
            }
        }, {})

        gid = (
            result.get("gid")
            or result.get("data", {}).get("gid")
            or "unknown"
        )
        self.stdout.write(self.style.SUCCESS(f"Registered webhook {gid} -> {target}"))