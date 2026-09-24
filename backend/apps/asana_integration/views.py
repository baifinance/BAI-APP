import json
import logging

from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asana_integration.services.asana import handle_task_moved_event

logger = logging.getLogger(__name__)

class AsanaWebhookReceiver(APIView):
    """
    POST /api/asana/webhook/

    Handles the Asana webhook handshake (X-Hook-Secret echo) and event
    deliveries for loan-status (section move) notifications.
    """

    permission_classes = [AllowAny]
    throttle_classes = [] # note: never 429 a webhook burst (would kill it)
    pagination_class = None

    def post(self, request):
        secret = request.headers.get("X-Hook-Secret")
        if secret:
            response = HttpResponse(status=200)
            response["X-Hook-Secret"] = secret
            return response

        if not getattr(settings, "ASANA_WEBHOOK_ENABLED", False):
            return HttpResponse(status=200)
        
        try:
            payload = json.loads(request.body or b"{}")
        except json.JSONDecodeError:
            return HttpResponse(status=200)
        
        for event in payload.get("events") or []:
            try:
                logger.info("RAW EVENT: %s", json.dumps(event, sort_keys=True))
                handle_task_moved_event(event)
            except Exception: #noqa: BLE001 - keep the webhook alive
                logger.exception("Failed to process Asana event: %s", event)

        return HttpResponse(status=200)