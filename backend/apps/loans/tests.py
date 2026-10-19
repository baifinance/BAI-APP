from unittest import mock

from rest_framework.test import APITestCase

from otp.utils import get_redis_client
from users.models import ClientProfile, User
from users.services import record_loan_status_change


def _make_user(email, role="client"):
    return User.objects.create_user(
        email=email,
        username=email,
        password="pw12345678",
        role=role,
        is_active=True,
    )


class RecordLoanStatusChangeTests(APITestCase):
    def setUp(self):
        self.user = _make_user("client@example.com")
        self.profile = ClientProfile.objects.create(user=self.user)

    def test_records_and_dedupes_consecutive(self):
        record_loan_status_change(self.user, "Pending")
        record_loan_status_change(self.user, "Pending")
        record_loan_status_change(self.user, "Under Review")

        self.profile.refresh_from_db()
        self.assertEqual(
            set(self.profile.loan_status_history), {"Pending", "Under Review"}
        )
        self.assertEqual(self.profile.loan_status, "Under Review")

    def test_no_status_is_noop(self):
        self.assertIsNone(record_loan_status_change(self.user, ""))

    def test_non_client_is_noop(self):
        broker = _make_user("broker@example.com", role="broker")
        self.assertIsNone(record_loan_status_change(broker, "Pending"))

    def test_change_busts_asana_profile_cache(self):
        redis = get_redis_client()
        key = f"asana_profile:{self.user.email.lower()}"
        redis.setex(key, 60, '{"loan_status": "Pending"}')

        record_loan_status_change(self.user, "Under Review")

        self.assertIsNone(redis.get(key))


class CurrentLoanStatusViewTests(APITestCase):
    def setUp(self):
        self.user = _make_user("client@example.com")
        ClientProfile.objects.create(
            user=self.user,
            loan_status_history={"Pending": "2026-08-10T00:00:00+00:00"},
        )
        self.client.force_authenticate(self.user)

    @mock.patch(
        "loans.views.get_client_asana_profile",
        return_value={"loan_status": "Under Review"},
    )
    def test_falls_back_to_asana_when_unrecorded(self, _mock):
        resp = self.client.get("/api/loans/current-status/")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["loan_status"], "Under Review")
        self.assertEqual(
            resp.data["status_history"],
            [{"status": "Pending", "changed_at": "2026-08-10T00:00:00+00:00"}],
        )


class CurrentLoanStatusOtpGateTests(APITestCase):
    def setUp(self):
        self.user = _make_user("mfa-client@example.com")
        self.user.mfa_enabled = True
        self.user.save(update_fields=["mfa_enabled"])
        ClientProfile.objects.create(user=self.user, loan_status="Pending")
        self.client.force_authenticate(self.user)

    def tearDown(self):
        get_redis_client().delete(f"otp_verified:{self.user.id}")

    def test_blocked_until_otp_verified(self):
        resp = self.client.get("/api/loans/current-status/")
        self.assertEqual(resp.status_code, 403)

        from otp.utils import mark_otp_verified

        mark_otp_verified(self.user.id)

        resp = self.client.get("/api/loans/current-status/")
        self.assertEqual(resp.status_code, 200)


class CurrentLoanStatusDbFirstTests(APITestCase):
    def setUp(self):
        self.user = _make_user("dbfirst@example.com")
        ClientProfile.objects.create(user=self.user, loan_status="Settled")
        self.client.force_authenticate(self.user)

    @mock.patch(
        "loans.views.get_client_asana_profile",
        return_value={"loan_status": "Pending"},
    )
    def test_prefers_stored_status(self, _mock):
        resp = self.client.get("/api/loans/current-status/")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["loan_status"], "Settled")


class AsanaWebhookHistoryTests(APITestCase):
    def setUp(self):
        self.user = _make_user("client@example.com")
        self.profile = ClientProfile.objects.create(user=self.user)

    @mock.patch("asana_integration.services.asana.publish_stream_notification")
    @mock.patch(
        "asana_integration.services.asana._task_email",
        return_value="client@example.com",
    )
    def test_records_history(self, _email, _publish):
        from asana_integration.services.asana import handle_task_moved_event

        handle_task_moved_event(
            {
                "action": "changed",
                "change": {
                    "field": "memberships",
                    "new_section": {"name": "Under Review"},
                },
                "resource": {"gid": "123"},
            }
        )

        self.profile.refresh_from_db()
        self.assertIn("Under Review", self.profile.loan_status_history)
