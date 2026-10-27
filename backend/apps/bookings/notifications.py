from django.utils import timezone

from bookings.choices import BookingStatus
from notifications.choices import NotificationType
from notifications.services import create_notification, publish_stream_notification


def _display_name(user):
    if user is None:
        return "BAI Finance"
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _when(booking):
    return timezone.localtime(booking.slot_time).strftime("%d %b %Y at %H:%M")


def _notify(recipient, booking, title, message):
    notification = create_notification(
        recipient=recipient,
        notification_type=NotificationType.BOOKING,
        title=title,
        message=message,
        related_object=booking,
    )
    publish_stream_notification(recipient.pk, notification)


def notify_booking_created(booking):
    broker_user = booking.broker.user
    client_user = booking.client.user

    _notify(
        broker_user,
        booking,
        "New booking",
        (
            f"{_display_name(client_user)} booked a {booking.consultation_type} "
            f"on {_when(booking)} via {booking.meeting_platform}."
        ),
    )
    _notify(
        client_user,
        booking,
        "Booking confirmed",
        (
            f"Your {booking.consultation_type} with {_display_name(broker_user)} "
            f"is scheduled for {_when(booking)} via {booking.meeting_platform}."
        ),
    )


def notify_booking_updated(booking, previous_status, previous_slot_time, actor=None):
    broker_user = booking.broker.user
    client_user = booking.client.user

    if booking.status == BookingStatus.CANCELLED:
        title = "Booking cancelled"
        verb = "cancelled"
    elif booking.status == BookingStatus.CONFIRMED:
        title = "Booking confirmed"
        verb = "confirmed"
    elif booking.slot_time != previous_slot_time:
        title = "Booking rescheduled"
        verb = "rescheduled"
    else:
        title = "Booking updated"
        verb = "updated"

    for recipient, other in (
        (broker_user, client_user),
        (client_user, broker_user),
    ):
        if actor is not None and recipient.pk == actor.pk:
            continue
        _notify(
            recipient,
            booking,
            title,
            (
                f"The {booking.consultation_type} with {_display_name(other)} "
                f"was {verb}. Current time: {_when(booking)} "
                f"({booking.meeting_platform})."
            ),
        )
