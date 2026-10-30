import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asana
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from asana_integration.services.asana import get_project_gids

DEFAULT_HOOK_KEY = "asana"
HOOK_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")


def _split_projects(value):
    """Split a comma-separated --project value into a list of non-empty GIDs."""
    if not value:
        return []
    return [g.strip() for g in str(value).split(",") if g.strip()]


class Command(BaseCommand):
    help = (
        "Register, list, or delete Asana webhooks for loan-status events. "
        "Each environment uses its own --hook label (stored in the target URL as "
        "?hook=<label>) so several deployments can keep separate signing secrets. "
        "Pass --project <gid> (repeatable or comma-separated) to register one "
        "webhook per project with ?project=<gid> in the target. Set "
        "ASANA_WEBHOOK_HANDSHAKE_ENABLED=True in .env before registering so "
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
            "--project",
            dest="projects",
            action="append",
            help="Asana project GID to register a webhook for. Repeatable or "
            "comma-separated. Defaults to ASANA_PROJECT_GIDS / ASANA_PROJECT_GID.",
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
            help="Delete an existing webhook by GID. Pass --hook/--project to also "
            "clear that label's stored secret.",
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
        if not settings.ASANA_ACCESS_TOKEN:
            raise CommandError("ASANA_ACCESS_TOKEN is not configured.")
        if not settings.ASANA_WEBHOOK_ENABLED:
            raise CommandError("Set ASANA_WEBHOOK_ENABLED=True in .env first.")

        hook = self._validate_hook(options["hook"])

        project_values = []
        for value in options["projects"] or []:
            project_values.extend(_split_projects(value))
        if not project_values:
            project_values = get_project_gids()
        if not project_values:
            raise CommandError(
                "No Asana project GIDs configured. Pass --project <gid>, set "
                "ASANA_PROJECT_GIDS/ASANA_PROJECT_GID, or create a LoanApplication "
                "with asana_project_gid so the command can fall back to the DB."
            )

        client = self._client()
        api = asana.WebhooksApi(client)

        if options["webhook_gid"]:
            api.delete_webhook(options["webhook_gid"])
            self.stdout.write(
                self.style.SUCCESS(f"Deleted webhook {options['webhook_gid']}")
            )
            project = None
            if options["projects"]:
                first = _split_projects(options["projects"][0])
                if first:
                    project = first[0]
            secret_key = f"{hook}:{project}" if project else hook
            from asana_integration.models import AsanaWebhookSecret

            AsanaWebhookSecret.objects.filter(key=secret_key).delete()
            self.stdout.write(f"Cleared stored secret for hook '{secret_key}'")
            return

        if options["list_webhooks"]:
            first_project = project_values[0] if project_values else None
            self._list_webhooks(client, api, project_gid=first_project)
            return

        target = options["target"]
        if not target:
            raise CommandError("--target is required to register a webhook.")

        if not settings.ASANA_WEBHOOK_HANDSHAKE_ENABLED:
            raise CommandError(
                "Set ASANA_WEBHOOK_HANDSHAKE_ENABLED=True in .env, restart, and "
                "re-run so Asana's X-Hook-Secret handshake is accepted."
            )

        filters = [
            {"resource_type": "task", "action": "changed"},
            {"resource_type": "task", "action": "added"},
            {"resource_type": "task", "action": "removed"},
        ]

        for project_gid in project_values:
            target_with_query = self._with_hook(target, hook)
            parts = urlsplit(target_with_query)
            query = dict(parse_qsl(parts.query, keep_blank_values=True))
            query["project"] = project_gid
            target_with_query = urlunsplit(
                (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
            )

            result = api.create_webhook(
                {
                    "data": {
                        "resource": project_gid,
                        "target": target_with_query,
                        "filters": filters,
                    }
                },
                {},
            )

            gid = result.get("gid") or result.get("data", {}).get("gid") or "unknown"
            secret_key = f"{hook}:{project_gid}"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Registered webhook {gid} [{hook}:{project_gid}] -> {target_with_query}"
                )
            )

    def _list_webhooks(self, client, api, project_gid=None):
        project_gid = project_gid or settings.ASANA_PROJECT_GID
        project = asana.ProjectsApi(client).get_project(
            project_gid, {"opt_fields": "workspace"}
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
            query = dict(parse_qsl(urlsplit(target).query))
            hook = query.get("hook", DEFAULT_HOOK_KEY)
            project = query.get("project", "")
            self.stdout.write(
                f"{item.get('gid')}  hook={hook}  project={project}  "
                f"active={item.get('active')}  target={target}"
            )
            if item.get("last_failure_at"):
                self.stdout.write(
                    f"  last_failure_at={item['last_failure_at']} "
                    f"{str(item.get('last_failure_content') or '')[:200]}"
                )
