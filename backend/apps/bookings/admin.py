# bookings/admin.py
# -----------------------------------------------------------------------
# Register your booking-related models with the Django admin here.
#
# Example:
#   from .models import Booking
#   admin.site.register(Booking)
# -----------------------------------------------------------------------

from django.contrib import admin  # noqa: F401

from .models import AvailableSlot

admin.site.register(AvailableSlot)
