"""Choice enumerations for the bookings app."""

from django.db import models


class BookingStatus(models.TextChoices):
    """Lifecycle states for a booking appointment."""

    SCHEDULED = "scheduled", "Scheduled"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class ConsultationType(models.TextChoices):
    """Allowlisted consultation types (values must match the UI selectors)."""

    INITIAL_STRATEGY = "Initial Strategy Consultation", "Initial Strategy Consultation"
    DOCUMENT_CLARIFICATION = "Document Clarification Meeting", "Document Clarification Meeting"
    PRE_APPROVAL_REVIEW = "Pre-Approval Review", "Pre-Approval Review"
    SETTLEMENT_PREP = "Settlement Prep Session", "Settlement Prep Session"


class MeetingPlatform(models.TextChoices):
    """Allowlisted meeting platforms (values must match the UI selectors)."""

    GOOGLE_MEET = "Google Meet", "Google Meet"
    ZOOM = "Zoom Video Call", "Zoom Video Call"
    PHONE = "Phone Call", "Phone Call"
    IN_OFFICE = "In-Office Consultation", "In-Office Consultation"