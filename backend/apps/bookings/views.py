# bookings/views.py
# -----------------------------------------------------------------------
# Define your booking-related API views here.
#
# Examples:
#   - BookingListView          – GET  /api/bookings/
#   - BookingDetailView        – GET  /api/bookings/<id>/
#   - BookingCreateView        – POST /api/bookings/
#   - BookingUpdateView        – PUT  /api/bookings/<id>/
#   - BookingCancelView        – POST /api/bookings/<id>/cancel/
#
# Use DRF generics or viewsets:
#   from rest_framework import generics, viewsets
# -----------------------------------------------------------------------
 # apps/bookings/views.py

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from users.choices import UserRole
from users.models import BrokerProfile
from bookings.models import Booking, AvailableSlot
from bookings.choices import BookingStatus
from bookings.serializers import (
    ClientBookingCreateSerializer,
    BookingDetailSerializer,
    BookingStatusUpdateSerializer,
    BrokerOptionSerializer,
    AvailableSlotCreateSerializer,
    AvailableSlotSerializer,
    AvailableSlotClaimSerializer,
)

class AvailableSlotsView(APIView):
    """Returns the logged-in user's designated broker's published available slots for a given date."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = "".join(request.query_params.get("date", "").split()) # YYYY-MM-DD
        if not date_str:
            return Response(
                {"error": "Query parameter 'date' (YYYY-MM-DD) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        broker_id = request.query_params.get("broker_id") or request.query_params.get("broker")
        if broker_id:
            broker_id = "".join(broker_id.split())
        user = request.user
        designated_broker = None

        if broker_id:
            designated_broker = BrokerProfile.objects.filter(user_id=broker_id, user__is_active=True).first()
            if not designated_broker:
                return Response (
                    {"error": f"Broker with id '{broker_id}' not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif user.role == UserRole.CLIENT:
            client_profile = user.client_profile
            latest_app = client_profile.loan_applications.first()
            if latest_app and latest_app.broker:
                designated_broker = latest_app.broker
            elif user.invited_by and user.invited_by.role == UserRole.BROKER:
                designated_broker = getattr(user.invited_by, "broker_profile", None)
        elif user.role == UserRole.BROKER:
            designated_broker = user.broker_profile

        if not designated_broker:
            designated_broker = BrokerProfile.objects.filter(user__is_active=True).first()

        if not designated_broker:
            return Response({"date": date_str, "broker_id": None, "broker_name": None, "available_slots": []})

        # Real published slots for the broker on the requested date.
        slots = AvailableSlot.objects.filter(
            broker=designated_broker,
            slot_time__date=date_str,
            slot_time__gt=timezone.now(),
        )
        available_slots = [s.slot_time.strftime("%H:%M") for s in slots]

        return Response({
            "date": date_str,
            "broker_id": str(designated_broker.user_id),
            "broker_name": f"{designated_broker.user.first_name} {designated_broker.user.last_name}".strip() or designated_broker.user.email,
            "available_slots": available_slots,
        })

class BookingListCreateView(generics.ListCreateAPIView):
    """List bookings for the logged-in user or allow client to book a consultation."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientBookingCreateSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.BROKER:
            return Booking.objects.filter(broker__user=user)
        elif user.role == UserRole.CLIENT:
            return Booking.objects.filter(client__user=user)
        elif user.role == UserRole.LOAN_PROCESSING:
            return Booking.objects.all()
        return Booking.objects.none()


class BookingDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update (cancel/reschedule/confirm) a booking."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return BookingStatusUpdateSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.BROKER:
            return Booking.objects.filter(broker__user=user)
        elif user.role == UserRole.CLIENT:
            return Booking.objects.filter(client__user=user)
        elif user.role == UserRole.LOAN_PROCESSING:
            return Booking.objects.all()
        return Booking.objects.none()

class BrokerListView(generics.ListAPIView):
    """Returns a list of active brokers for dropdown selection."""
    permission_classes = [IsAuthenticated]
    serializer_class = BrokerOptionSerializer
    queryset = BrokerProfile.objects.filter(user__is_active=True)


class SlotListCreateView(generics.ListCreateAPIView):
    """List an authenticated broker's published available slots, or publish a new one."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AvailableSlotCreateSerializer
        return AvailableSlotSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.BROKER:
            return AvailableSlot.objects.filter(broker__user=user)
        elif user.role == UserRole.CLIENT:
            # A client can see their designated broker's published slots.
            broker = None
            client_profile = user.client_profile
            latest_app = client_profile.loan_applications.first()
            if latest_app and latest_app.broker:
                broker = latest_app.broker
            elif user.invited_by and user.invited_by.role == UserRole.BROKER:
                broker = getattr(user.invited_by, "broker_profile", None)
            if not broker:
                broker = BrokerProfile.objects.filter(user__is_active=True).first()
            if not broker:
                return AvailableSlot.objects.none()
            return AvailableSlot.objects.filter(broker=broker)
        elif user.role == UserRole.LOAN_PROCESSING:
            return AvailableSlot.objects.all()
        return AvailableSlot.objects.none()


class SlotDeleteView(generics.DestroyAPIView):
    """Allow a broker to delete one of their own published available slots."""
    permission_classes = [IsAuthenticated]
    serializer_class = AvailableSlotSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.BROKER:
            return AvailableSlot.objects.filter(broker__user=user)
        elif user.role == UserRole.LOAN_PROCESSING:
            return AvailableSlot.objects.all()
        return AvailableSlot.objects.none()