"""Serializers for the bookings app.
"""

from rest_framework import serializers
from django.utils import timezone
from bookings.models import Booking, AvailableSlot
from bookings.choices import BookingStatus
from users.models import BrokerProfile
from users.choices import UserRole

class ClientBookingCreateSerializer(serializers.ModelSerializer):
    """Allows an authenticated client to book a slot with their designated broker."""

    broker = serializers.PrimaryKeyRelatedField(
        queryset=BrokerProfile.objects.filter(user__is_active=True),
        required=False,
        allow_null=True
    )
    slot_time = serializers.DateTimeField(required=False, allow_null=True)
    slot_id = serializers.PrimaryKeyRelatedField(
        queryset=AvailableSlot.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    consultation_type = serializers.CharField(max_length=100, default="Strategy Consultation")
    meeting_platform = serializers.CharField(max_length=50, default="Google Meet")
    notes = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "broker",
            "slot_time",
            "slot_id",
            "consultation_type",
            "meeting_platform",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]
        validators = []

    def validate_slot_time(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Booking slot must be in the future.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        if user.role != UserRole.CLIENT:
            raise serializers.ValidationError("Only clients can book consultation slots.")

        client_profile = user.client_profile

        # Claim flow: client picked an existing published slot.
        slot = validated_data.pop("slot_id", None)
        if slot is not None:
            if slot.slot_time <= timezone.now():
                raise serializers.ValidationError({"slot_id": "This slot is no longer available."})
            if Booking.objects.filter(
                broker=slot.broker,
                slot_time=slot.slot_time,
                status__in=[BookingStatus.SCHEDULED, BookingStatus.CONFIRMED],
            ).exists():
                raise serializers.ValidationError({"slot_id": "This slot has already been booked."})

            consultation_type = slot.consultation_type or validated_data.pop("consultation_type", None)
            meeting_platform = slot.meeting_platform or validated_data.pop("meeting_platform", None)
            notes = validated_data.pop("notes", "")

            booking = Booking.objects.create(
                broker=slot.broker,
                client=client_profile,
                slot_time=slot.slot_time,
                consultation_type=consultation_type,
                meeting_platform=meeting_platform,
                notes=notes,
                status=BookingStatus.SCHEDULED,
            )
            slot.delete()
            return booking

        # Direct flow: client picks a raw slot_time + optional broker.
        slot_time = validated_data.get("slot_time")
        if not slot_time:
            raise serializers.ValidationError({
                "slot_time": "Provide a slot_time or claim an available slot with slot_id."
            })

        selected_broker = validated_data.pop("broker", None)

        designated_broker = selected_broker
        if not designated_broker:
            # Fallback 1: Loan application broker
            latest_app = client_profile.loan_applications.first()
            if latest_app and latest_app.broker:
                designated_broker = latest_app.broker
            # Fallback 2: Inviting broker
            elif user.invited_by and user.invited_by.role == UserRole.BROKER:
                designated_broker = getattr(user.invited_by, "broker_profile", None)
            # Fallback 3: First active broker
            else:
                designated_broker = BrokerProfile.objects.filter(user__is_active=True).first()

        if not designated_broker:
            raise serializers.ValidationError({"broker": "No available broker found for booking."})

        # Check if broker already has a booking at this time
        if Booking.objects.filter(
            broker=designated_broker,
            slot_time=slot_time,
            status__in=[BookingStatus.SCHEDULED, BookingStatus.CONFIRMED]
        ).exists():
             raise serializers.ValidationError({"slot_time": "The selected broker already has a meeting scheduled at this time."})

        return Booking.objects.create(
            broker=designated_broker,
            client=client_profile,
            status=BookingStatus.SCHEDULED,
            **validated_data
        )
class BookingDetailSerializer(serializers.ModelSerializer):
    """Serializer for displaying booking details on calendars/dashboards."""

    broker_name = serializers.SerializerMethodField()
    broker_email = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "broker_id",
            "broker_name",
            "broker_email",
            "client_id",
            "client_name",
            "client_email",
            "slot_time",
            "consultation_type",
            "meeting_platform",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_broker_name(self, obj):
        if obj.broker and obj.broker.user:
            u = obj.broker.user
            return f"{u.first_name} {u.last_name}".strip() or u.email
        return "Unknown Broker"

    def get_broker_email(self, obj):
        return obj.broker.user.email if obj.broker and obj.broker.user else None

    def get_client_name(self, obj):
        if obj.client and obj.client.user:
            u = obj.client.user
            return f"{u.first_name} {u.last_name}".strip() or u.email

        return "Unknown Client"

    def get_client_email(self, obj):
        return obj.client.user.email if obj.client and obj.client.user else None

class BookingStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating status (cancel, confirm, reschedule)."""

    class Meta:
        model = Booking
        fields = ["status", "slot_time", "notes"]

class BrokerOptionSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email")

    class Meta:
        model = BrokerProfile
        fields = ["user_id", "name", "email", "license_no"]

    def get_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.email


class AvailableSlotCreateSerializer(serializers.ModelSerializer):
    """Allows an authenticated broker to publish an open consultation slot."""

    slot_time = serializers.DateTimeField(required=True)
    consultation_type = serializers.CharField(max_length=100, default="Initial Strategy Consultation")
    meeting_platform = serializers.CharField(max_length=50, default="Google Meet")

    class Meta:
        model = AvailableSlot
        fields = ["id", "slot_time", "consultation_type", "meeting_platform", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_slot_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Slot must be in the future.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        if user.role != UserRole.BROKER:
            raise serializers.ValidationError("Only brokers can publish available slots.")

        broker = user.broker_profile
        slot_time = validated_data["slot_time"]

        if AvailableSlot.objects.filter(broker=broker, slot_time=slot_time).exists():
            raise serializers.ValidationError({"slot_time": "You already have an available slot at this time."})

        return AvailableSlot.objects.create(broker=broker, **validated_data)


class AvailableSlotSerializer(serializers.ModelSerializer):
    """Serializer for displaying an open available slot."""

    broker_name = serializers.SerializerMethodField()

    class Meta:
        model = AvailableSlot
        fields = [
            "id",
            "broker_id",
            "broker_name",
            "slot_time",
            "consultation_type",
            "meeting_platform",
            "created_at",
        ]
        read_only_fields = ["id", "broker_id", "created_at"]

    def get_broker_name(self, obj):
        if obj.broker and obj.broker.user:
            u = obj.broker.user
            return f"{u.first_name} {u.last_name}".strip() or u.email
        return "Unknown Broker"


class AvailableSlotClaimSerializer(serializers.Serializer):
    """Lets an authenticated client claim an available slot into a Booking."""

    consultation_type = serializers.CharField(required=False, allow_blank=True, max_length=100)
    meeting_platform = serializers.CharField(required=False, allow_blank=True, max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        slot = self.context["slot"]
        if slot.slot_time <= timezone.now():
            raise serializers.ValidationError("This slot is no longer available.")
        return attrs
    