import logging
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from notifications.choices import NotificationType
from notifications.models import EmailDelivery, EmailSuppression, NotificationPreference
from notifications.tokens import make_email_preferences_token

logger = logging.getLogger(__name__)

CRITICAL_NOTIFICATION_TYPES = {
    NotificationType.LOAN_STATUS,
    NotificationType.MFA,
    NotificationType.BOOKING,
    NotificationType.SYSTEM,
}


def is_critical(notification_type):
    return notification_type in CRITICAL_NOTIFICATION_TYPES


def notification_path_for_user(user):
    role = getattr(user, "role", None)
    if role == "client":
        return "/client/notifications"
    if role == "broker":
        return "/broker/notifications"
    if role == "loan_processing":
        return "/loan-processing/notifications"
    if role == "compliance":
        return "/compliance/notifications"
    return "/login"


def notification_url(user):
    base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    return f"{base.rstrip('/')}{notification_path_for_user(user)}"


def email_preferences_url(user):
    base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    token = make_email_preferences_token(user)
    return (
        f"{base.rstrip('/')}/notifications/email-preferences"
        f"?token={quote(token)}"
    )


def _preference_allows(user, notification_type):
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if is_critical(notification_type):
        return preference.email_critical_enabled
    return preference.email_optional_enabled


def enqueue_notification_email(notification):
    """Queue an outbox row when the user has opted into this notification class."""
    if not getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False):
        return None

    recipient = notification.recipient
    email = (getattr(recipient, "email", "") or "").strip()
    if not email:
        return None

    if EmailSuppression.objects.filter(email__iexact=email).exists():
        return None

    if not _preference_allows(recipient, notification.notification_type):
        return None

    delivery, created = EmailDelivery.objects.get_or_create(
        notification=notification,
        defaults={
            "recipient_email": email,
            "next_attempt_at": timezone.now(),
        },
    )
    return delivery if created else None


def _render_email(delivery):
    notification = delivery.notification
    user = notification.recipient
    action_url = notification_url(user)
    unsubscribe_url = email_preferences_url(user)
    subject = f"BAI Finance: {notification.title}"

    text_body = (
        f"{notification.title}\n\n"
        f"{notification.message}\n\n"
        f"View in BAI Finance: {action_url}\n\n"
        f"Manage notification emails: {unsubscribe_url}\n"
    )

    html_body = render_to_string(
        "notifications/notification_email.html",
        {
            "subject": subject,
            "title": notification.title,
            "message": notification.message,
            "action_url": action_url,
            "unsubscribe_url": unsubscribe_url,
            "current_year": timezone.now().year,
        },
    )

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[delivery.recipient_email],
    )
    message.attach_alternative(html_body, "text/html")
    return message


def _claim_delivery(delivery):
    """Atomically claim a pending row so only one worker sends it.

    The outbox is drained both inline and by a scheduled job. Claiming via a
    conditional UPDATE (no extra column/migration) moves ``next_attempt_at``
    into the future; a concurrent worker's UPDATE then matches no rows.
    """
    now = timezone.now()
    claim_until = now + timedelta(
        minutes=getattr(settings, "NOTIFICATION_EMAIL_CLAIM_MINUTES", 10)
    )
    claimed = EmailDelivery.objects.filter(
        pk=delivery.pk,
        status=EmailDelivery.Status.PENDING,
    ).filter(
        Q(next_attempt_at__isnull=True) | Q(next_attempt_at__lte=now)
    ).update(next_attempt_at=claim_until)
    if not claimed:
        return False
    delivery.next_attempt_at = claim_until
    return True


def send_email_delivery(delivery):
    """Attempt one outbox row. Returns True when it was sent."""
    if delivery.status != EmailDelivery.Status.PENDING:
        return False

    if not _claim_delivery(delivery):
        return False

    if EmailSuppression.objects.filter(
        email__iexact=delivery.recipient_email
    ).exists():
        delivery.status = EmailDelivery.Status.SKIPPED
        delivery.last_error = "Recipient is suppressed."
        delivery.save(update_fields=["status", "last_error", "updated_at"])
        return False

    notification = delivery.notification
    if not _preference_allows(notification.recipient, notification.notification_type):
        delivery.status = EmailDelivery.Status.SKIPPED
        delivery.last_error = "Notification class is disabled by the recipient."
        delivery.save(update_fields=["status", "last_error", "updated_at"])
        return False

    try:
        _render_email(delivery).send(fail_silently=False)
    except Exception as exc:
        delivery.attempts += 1
        delivery.last_error = str(exc)[:2000]
        max_attempts = getattr(settings, "NOTIFICATION_EMAIL_MAX_ATTEMPTS", 5)
        if delivery.attempts >= max_attempts:
            delivery.status = EmailDelivery.Status.FAILED
            delivery.next_attempt_at = None
        else:
            delay_minutes = min(60, 2 ** delivery.attempts)
            delivery.next_attempt_at = timezone.now() + timedelta(
                minutes=delay_minutes
            )
        delivery.save(
            update_fields=[
                "attempts",
                "last_error",
                "status",
                "next_attempt_at",
                "updated_at",
            ]
        )
        logger.warning(
            "Notification email delivery %s failed (attempt %s): %s",
            delivery.pk,
            delivery.attempts,
            exc,
        )
        return False

    delivery.attempts += 1
    delivery.status = EmailDelivery.Status.SENT
    delivery.sent_at = timezone.now()
    delivery.next_attempt_at = None
    delivery.last_error = ""
    delivery.save(
        update_fields=[
            "attempts",
            "status",
            "sent_at",
            "next_attempt_at",
            "last_error",
            "updated_at",
        ]
    )
    return True


def send_due_notification_emails(limit=None):
    """Drain pending outbox rows that are due. Returns (sent, attempted)."""
    batch_size = limit or getattr(settings, "NOTIFICATION_EMAIL_BATCH_SIZE", 50)
    max_attempts = getattr(settings, "NOTIFICATION_EMAIL_MAX_ATTEMPTS", 5)
    now = timezone.now()

    due = EmailDelivery.objects.filter(
        status=EmailDelivery.Status.PENDING,
        attempts__lt=max_attempts,
    ).filter(
        Q(next_attempt_at__isnull=True) | Q(next_attempt_at__lte=now)
    ).order_by("created_at")[:batch_size]

    sent = 0
    attempted = 0
    for delivery in due:
        attempted += 1
        if send_email_delivery(delivery):
            sent += 1
    return sent, attempted
