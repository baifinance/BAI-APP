from django.urls import path
from bookings.views import (
        AvailableSlotsView,
        BookingListCreateView,
        BookingDetailView,
        BrokerListView,
        SlotListCreateView,
        SlotDeleteView,
    )

urlpatterns = [
    path("", BookingListCreateView.as_view(), name="booking-list-create"),
    path("available-slots/", AvailableSlotsView.as_view(), name="booking-available-slots"),
    path("slots/", SlotListCreateView.as_view(), name="slot-list-create"),
    path("slots/<uuid:pk>/", SlotDeleteView.as_view(), name="slot-delete"),
    path("<uuid:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("brokers/", BrokerListView.as_view(), name="broker-list")
]
