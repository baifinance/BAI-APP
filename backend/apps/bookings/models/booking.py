"""Booking model – represents a scheduled appointment between a broker and a client."""

import uuid

from django.db import models

from bookings.choices import BookingStatus


class Booking(models.Model):
    """A scheduled appointment linking a broker to a client at a specific time.

    Each booking tracks its lifecycle through :class:`BookingStatus` and
    enforces a unique constraint so a broker cannot hold two bookings in
    the same time slot.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    broker = models.ForeignKey(
        "users.BrokerProfile",
        on_delete=models.PROTECT,
        related_name="bookings",
    )

    client = models.ForeignKey(
        "users.ClientProfile",
        on_delete=models.PROTECT,
        related_name="bookings",
    )

    slot_time = models.DateTimeField()
    consultation_type = models.CharField(max_length=100, default="Initial Strategy Consultation")
    meeting_platform = models.CharField(max_length=50, default="Google Meet")
    notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.SCHEDULED,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bookings"
        ordering = ["slot_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["broker", "slot_time"],
                name="unique_broker_booking_slot",
            ),
        ]

    def __str__(self):
        """Return a human-readable summary of the booking."""
        return f"{self.broker_id} with {self.client_id} at {self.slot_time}"