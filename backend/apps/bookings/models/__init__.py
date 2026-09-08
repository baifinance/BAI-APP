"""Data models for the bookings app.

Exports:
    Booking       – appointment between a broker and a client.
    AvailableSlot – open consultation slot published by a broker.
"""

from .booking import Booking
from .available_slot import AvailableSlot

__all__ = ["Booking", "AvailableSlot"]
