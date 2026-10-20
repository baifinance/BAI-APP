import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asana
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

DEFAULT_HOOK_KEY = "asana"
HOOK_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")


class Command(BaseCommand):
    help = (
        "Register, list, or delete the Asana webhook for loan-status events. "
        "Each environment uses its own --hook label (stored in the target URL as "
        "?hook=<label>) so several deployments can keep separate signing secrets. "
        "Set ASANA_WEBHOOK_HANDSHAKE_ENABLED=True in .env before registering so "
        "the incoming X-Hook-Secret handshake is accepted, then turn it back off."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target",
            dest="target",
            help="Public HTTPS URL receiving events (e.g. "
            "https://<id>.ngrok-free.app/api/asana/webhook).",
        )
        parser.add_argument(
            "--hook",
            dest="hook",
            help="Secret label for this environment (default: asana). Appended to "
            "--target as ?hook=<label>.",
        )
        parser.add_argument(
            "--list",
            dest="list_webhooks",
            action="store_true",
            help="List registered webhooks with their target and health.",
        )
        parser.add_argument(
            "--delete",
            dest="webhook_gid",
            help="Delete an existing webhook by GID. Pass --hook to also clear "
            "that label's stored secret.",
        )

    def _validate_hook(self, hook):
        key = (hook or DEFAULT_HOOK_KEY).strip().lower()
        if not HOOK_KEY_RE.match(key):
            raise CommandError(
                "Invalid --hook label. Use 1-32 lowercase letters, digits, '-' or "
                "'_' (must start with a letter or digit)."
            )
        return key

    def _with_hook(self, target, hook):
        parts = urlsplit(target)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        existing = query.get("hook")
        if existing and existing.strip().lower() != hook:
            raise CommandError(
                f"--target already contains hook={existing!r}, which differs from "
                f"--hook {hook!r}."
            )
        query["hook"] = hook
        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )

    def _client(self):
        configuration = asana.Configuration()
        configuration.access_token = settings.ASANA_ACCESS_TOKEN
        return asana.ApiClient(configuration)

    def handle(self, *args, **options):
        if not settings.ASANA_ACCESS_TOKEN or not settings.ASANA_PROJECT_GID:
            raise CommandError(
                "ASANA_ACCESS_TOKEN / ASANA_PROJECT_GID are not configured."
            )
        if not settings.ASANA_WEBHOOK_ENABLED:
            raise CommandError("Set ASANA_WEBHOOK_ENABLED=True in .env first.")

        client = self._client()
        api = asana.WebhooksApi(client)

        if options["webhook_gid"]:
            api.delete_webhook(options["webhook_gid"])
            self.stdout.write(
                self.style.SUCCESS(f"Deleted webhook {options['webhook_gid']}")
            )
            if options["hook"]:
                key = self._validate_hook(options["hook"])
                from asana_integration.models import AsanaWebhookSecret

                AsanaWebhookSecret.objects.filter(key=key).delete()
                self.stdout.write(f"Cleared stored secret for hook '{key}'")
            return

        if options["list_webhooks"]:
            self._list_webhooks(client, api)
            return

        target = options["target"]
        if not target:
            raise CommandError("--target is required to register a webhook.")

        hook = self._validate_hook(options["hook"])
        target = self._with_hook(target, hook)

        if not settings.ASANA_WEBHOOK_HANDSHAKE_ENABLED:
            raise CommandError(
                "Set ASANA_WEBHOOK_HANDSHAKE_ENABLED=True in .env, restart, and "
                "re-run so Asana's X-Hook-Secret handshake is accepted."
            )

        result = api.create_webhook(
            {
                "data": {
                    "resource": settings.ASANA_PROJECT_GID,
                    "target": target,
                    "filters": [
                        {"resource_type": "task", "action": "changed"},
                        {"resource_type": "task", "action": "added"},
                        {"resource_type": "task", "action": "removed"},
                    ],
                }
            },
            {},
        )

        gid = result.get("gid") or result.get("data", {}).get("gid") or "unknown"
        self.stdout.write(
            self.style.SUCCESS(f"Registered webhook {gid} [{hook}] -> {target}")
        )

    def _list_webhooks(self, client, api):
        project = asana.ProjectsApi(client).get_project(
            settings.ASANA_PROJECT_GID, {"opt_fields": "workspace"}
        )
        workspace_gid = (project.get("workspace") or {}).get("gid")
        if not workspace_gid:
            raise CommandError("Could not resolve the project's workspace.")

        webhooks = list(
            api.get_webhooks(
                workspace_gid,
                {
                    "opt_fields": "target,active,last_failure_at,"
                    "last_failure_content"
                },
            )
        )
        if not webhooks:
            self.stdout.write("No webhooks registered.")
            return

        for item in webhooks:
            target = item.get("target") or ""
            hook = dict(parse_qsl(urlsplit(target).query)).get(
                "hook", DEFAULT_HOOK_KEY
            )
            self.stdout.write(
                f"{item.get('gid')}  hook={hook}  active={item.get('active')}  "
                f"target={target}"
            )
            if item.get("last_failure_at"):
                self.stdout.write(
                    f"  last_failure_at={item['last_failure_at']} "
                    f"{str(item.get('last_failure_content') or '')[:200]}"
                )
