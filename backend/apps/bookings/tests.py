from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from bookings.choices import BookingStatus, ConsultationType, MeetingPlatform
from bookings.models import AvailableSlot, Booking
from users.models import BrokerProfile, ClientProfile, User


def _make_user(email, role):
    return User.objects.create_user(
        email=email,
        username=email,
        password="pw12345678",
        role=role,
        is_active=True,
    )


def _future(minutes=60):
    return timezone.now() + timedelta(minutes=minutes)


class BookingValidationTests(APITestCase):
    def setUp(self):
        self.client_user = _make_user("client@example.com", "client")
        self.client_profile = ClientProfile.objects.create(user=self.client_user)

        self.broker_user = _make_user("broker@example.com", "broker")
        self.broker = BrokerProfile.objects.create(
            user=self.broker_user, license_no="LIC-001"
        )

        self.other_broker_user = _make_user("broker2@example.com", "broker")
        self.other_broker = BrokerProfile.objects.create(
            user=self.other_broker_user, license_no="LIC-002"
        )

        self.other_client_user = _make_user("client2@example.com", "client")
        self.other_client = ClientProfile.objects.create(user=self.other_client_user)

        self.client.force_authenticate(self.client_user)

    def test_past_slot_time_rejected(self):
        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": (timezone.now() - timedelta(hours=1)).isoformat(),
             "broker": self.broker.pk},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("slot_time", resp.data)

    def test_broker_collision_rejected(self):
        t = _future()
        Booking.objects.create(
            broker=self.broker, client=self.other_client, slot_time=t
        )

        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": t.isoformat(), "broker": self.broker.pk},
        )
        self.assertEqual(resp.status_code, 400)

    def test_client_collision_rejected(self):
        t = _future()
        Booking.objects.create(
            broker=self.broker, client=self.client_profile, slot_time=t
        )

        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": t.isoformat(), "broker": self.other_broker.pk},
        )
        self.assertEqual(resp.status_code, 400)

    def test_invalid_consultation_type_rejected(self):
        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": _future().isoformat(), "broker": self.broker.pk,
             "consultation_type": "Something Invented"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("consultation_type", resp.data)

    def test_non_client_gets_403(self):
        self.client.force_authenticate(self.broker_user)
        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": _future().isoformat(), "broker": self.broker.pk},
        )
        self.assertEqual(resp.status_code, 403)

    def test_valid_direct_booking_created(self):
        resp = self.client.post(
            "/api/bookings/",
            {"slot_time": _future().isoformat(), "broker": self.broker.pk,
             "consultation_type": ConsultationType.PRE_APPROVAL_REVIEW,
             "meeting_platform": MeetingPlatform.ZOOM},
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        booking = Booking.objects.get(client=self.client_profile)
        self.assertEqual(booking.status, BookingStatus.SCHEDULED)

    def test_db_constraint_blocks_client_duplicate(self):
        t = _future()
        Booking.objects.create(broker=self.broker, client=self.client_profile, slot_time=t)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Booking.objects.create(
                    broker=self.other_broker, client=self.client_profile, slot_time=t
                )


class BookingStatusUpdateTests(APITestCase):
    def setUp(self):
        self.client_user = _make_user("client@example.com", "client")
        self.client_profile = ClientProfile.objects.create(user=self.client_user)
        self.broker_user = _make_user("broker@example.com", "broker")
        self.broker = BrokerProfile.objects.create(
            user=self.broker_user, license_no="LIC-001"
        )
        self.booking = Booking.objects.create(
            broker=self.broker, client=self.client_profile, slot_time=_future()
        )
        self.client.force_authenticate(self.client_user)
        self.url = f"/api/bookings/{self.booking.pk}/"

    def test_client_can_cancel(self):
        resp = self.client.patch(self.url, {"status": BookingStatus.CANCELLED})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.CANCELLED)

    def test_client_cannot_confirm(self):
        resp = self.client.patch(self.url, {"status": BookingStatus.CONFIRMED})
        self.assertEqual(resp.status_code, 403)

    def test_terminal_state_transition_rejected(self):
        self.booking.status = BookingStatus.CANCELLED
        self.booking.save(update_fields=["status"])
        self.client.force_authenticate(self.broker_user)

        resp = self.client.patch(self.url, {"status": BookingStatus.CONFIRMED})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("status", resp.data)

    def test_reschedule_to_past_rejected(self):
        self.client.force_authenticate(self.broker_user)
        resp = self.client.patch(
            self.url, {"slot_time": (timezone.now() - timedelta(hours=1)).isoformat()}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("slot_time", resp.data)

    def test_reschedule_clash_rejected(self):
        other = _future(minutes=120)
        Booking.objects.create(
            broker=self.broker, client=self.client_profile, slot_time=other
        )
        self.client.force_authenticate(self.broker_user)

        # Move the first booking onto the second's slot -> broker clash.
        resp = self.client.patch(self.url, {"slot_time": other.isoformat()})
        self.assertEqual(resp.status_code, 400)


class AvailableSlotValidationTests(APITestCase):
    def setUp(self):
        self.broker_user = _make_user("broker@example.com", "broker")
        self.broker = BrokerProfile.objects.create(
            user=self.broker_user, license_no="LIC-001"
        )
        self.client_user = _make_user("client@example.com", "client")
        ClientProfile.objects.create(user=self.client_user)

    def test_non_broker_publish_gets_403(self):
        self.client.force_authenticate(self.client_user)
        resp = self.client.post("/api/bookings/slots/", {"slot_time": _future().isoformat()})
        self.assertEqual(resp.status_code, 403)

    def test_invalid_platform_rejected(self):
        self.client.force_authenticate(self.broker_user)
        resp = self.client.post(
            "/api/bookings/slots/",
            {"slot_time": _future().isoformat(), "meeting_platform": "Telepathy"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("meeting_platform", resp.data)

    def test_duplicate_slot_rejected(self):
        t = _future()
        AvailableSlot.objects.create(broker=self.broker, slot_time=t)
        self.client.force_authenticate(self.broker_user)
        resp = self.client.post("/api/bookings/slots/", {"slot_time": t.isoformat()})
        self.assertEqual(resp.status_code, 400)
