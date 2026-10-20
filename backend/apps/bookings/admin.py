# bookings/admin.py
# -----------------------------------------------------------------------
# Register your booking-related models with the Django admin here.
#
# Example:
#   from .models import Booking
#   admin.site.register(Booking)
# -----------------------------------------------------------------------

from django.contrib import admin

from .models import AvailableSlot, Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "broker", "client", "slot_time", "status", "created_at")
    list_filter = ("status", "consultation_type", "meeting_platform")
    search_fields = ("broker__user__email", "client__user__email")
    readonly_fields = ("id", "created_at", "updated_at")


admin.site.register(AvailableSlot)
