"""AvailableSlot model – an open consultation slot published by a broker for clients to claim."""

import uuid

from django.db import models


class AvailableSlot(models.Model):
    """An unclaimed consultation slot a broker has published for clients.

    A client claims one of these slots, which then converts it into a
    :class:`Booking`. The unique constraint prevents a broker from
    publishing two slots at the exact same time.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    broker = models.ForeignKey(
        "users.BrokerProfile",
        on_delete=models.PROTECT,
        related_name="available_slots",
    )

    slot_time = models.DateTimeField()

    consultation_type = models.CharField(max_length=100, default="Initial Strategy Consultation")
    meeting_platform = models.CharField(max_length=50, default="Google Meet")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "available_slots"
        ordering = ["slot_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["broker", "slot_time"],
                name="unique_broker_available_slot_time",
            ),
        ]

    def __str__(self):
        """Return a human-readable summary of the slot."""
        return f"{self.broker_id} at {self.slot_time}"
