import json
import logging
import uuid
from urllib.parse import urlparse

from django.conf import settings

from notifications.models import NotificationPreference, PushSubscription
from notifications.email import notification_path_for_user

logger = logging.getLogger(__name__)


def _vapid_private_key():
    return getattr(settings, "VAPID_PRIVATE_KEY", "").replace("\\n", "\n")


def _payload_for_notification(notification):
    user = notification.recipient
    path = notification_path_for_user(user)
    base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    return {
        "title": notification.title,
        "body": notification.message,
        "url": f"{base.rstrip('/')}{path}",
        "notification_id": str(notification.pk),
        "tag": str(notification.pk),
    }


def _send_to_subscriptions(subscriptions, payload):
    from pywebpush import WebPushException, webpush

    sent = 0
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth,
                    },
                },
                data=json.dumps(payload),
                vapid_private_key=_vapid_private_key(),
                vapid_claims={
                    "sub": getattr(
                        settings,
                        "VAPID_ADMIN_EMAIL",
                        "mailto:no-reply@baifinance.com",
                    )
                },
                ttl=getattr(settings, "WEB_PUSH_TTL", 86400),
            )
            sent += 1
        except WebPushException as exc:
            response = getattr(exc, "response", None)
            if response is not None and response.status_code in (404, 410):
                subscription.delete()
            else:
                logger.warning(
                    "Web push failed for subscription %s: %s",
                    subscription.pk,
                    exc,
                )
        except Exception:
            logger.exception(
                "Unexpected web push failure for subscription %s", subscription.pk
            )
    return sent


def send_push_notification(notification):
    """Push a notification to every active browser subscription."""
    if not getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", False):
        return 0
    if not _vapid_private_key() or not getattr(settings, "VAPID_PUBLIC_KEY", ""):
        logger.warning("Web push enabled but VAPID keys are not configured.")
        return 0

    preference, _ = NotificationPreference.objects.get_or_create(
        user=notification.recipient
    )
    if not preference.push_enabled:
        return 0

    subscriptions = list(
        PushSubscription.objects.filter(user=notification.recipient)
    )
    if not subscriptions:
        return 0

    return _send_to_subscriptions(
        subscriptions,
        _payload_for_notification(notification),
    )


def send_test_push(user, endpoint=None):
    """Send a test payload to the current user's registered devices."""
    if not getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", False):
        return 0
    if not _vapid_private_key() or not getattr(settings, "VAPID_PUBLIC_KEY", ""):
        return 0

    subscriptions = PushSubscription.objects.filter(user=user)
    if endpoint:
        subscriptions = subscriptions.filter(endpoint=endpoint)
    subscriptions = list(subscriptions)
    if not subscriptions:
        logger.info("Test push skipped for user %s: no subscriptions", user.pk)
        return 0

    logger.info(
        "Test push requested for user %s: subscriptions=%d target=%s",
        user.pk,
        len(subscriptions),
        urlparse(endpoint).netloc if endpoint else "all devices",
    )
    sent = _send_to_subscriptions(
        subscriptions,
        {
            "title": "BAI Finance notifications are on",
            "body": "This device will receive BAI Finance alerts.",
            "url": notification_path_for_user(user),
            "tag": f"bai-test-{uuid.uuid4().hex[:12]}",
            "renotify": True,
        },
    )
    logger.info("Test push result for user %s: sent=%d", user.pk, sent)
    return sent
