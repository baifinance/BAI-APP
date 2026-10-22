import redis

from django.test import RequestFactory, override_settings
from rest_framework.test import APITestCase

from audit.models import AuditLog
from audit.services import log_action
from otp import utils as otp_utils
from users.models import ClientProfile, User

TEST_REDIS_URL = "redis://localhost:6379/15"


def _make_user(email, role, **extra):
    return User.objects.create_user(
        email=email,
        username=email,
        password="pw12345678",
        role=role,
        is_active=True,
        **extra,
    )


class LogActionTests(APITestCase):
    def test_records_actor_and_ip(self):
        user = _make_user("actor@example.com", "client")

        row = log_action(
            "TEST_ACTION",
            actor=user,
            entity_type="User",
            entity_id=user.id,
            request=None,
        )

        self.assertIsNotNone(row)
        self.assertEqual(row.action, "TEST_ACTION")
        self.assertEqual(row.actor, user)

    def test_anonymous_actor_becomes_null(self):
        from django.contrib.auth.models import AnonymousUser

        row = log_action("ANON_ACTION", actor=AnonymousUser())
        self.assertIsNone(row.actor)


class LoginAuditTests(APITestCase):
    def setUp(self):
        self.user = _make_user("client@example.com", "client")

    @override_settings(TURNSTILE_ENABLED=False)
    def test_successful_login_is_audited(self):
        self.client.post(
            "/api/auth/login/",
            {"username": self.user.email, "password": "pw12345678"},
        )
        self.assertTrue(AuditLog.objects.filter(action="LOGIN_SUCCEEDED").exists())

    @override_settings(TURNSTILE_ENABLED=False)
    def test_failed_login_is_audited(self):
        self.client.post(
            "/api/auth/login/",
            {"username": self.user.email, "password": "wrong-password"},
        )
        self.assertTrue(AuditLog.objects.filter(action="LOGIN_FAILED").exists())


class LoanStatusAuditTests(APITestCase):
    def test_status_change_is_audited(self):
        from users.services import record_loan_status_change

        user = _make_user("client@example.com", "client")
        ClientProfile.objects.create(user=user)

        record_loan_status_change(user, "Under Review")

        row = AuditLog.objects.get(
            action="LOAN_STATUS_CHANGED",
            entity_id=user.id,
        )
        self.assertIsNone(row.actor)

    def test_status_change_records_supplied_actor(self):
        from users.services import record_loan_status_change

        user = _make_user("client@example.com", "client")
        staff = _make_user("staff@example.com", "loan_processing")
        ClientProfile.objects.create(user=user)

        record_loan_status_change(user, "Under Review", actor=staff)

        row = AuditLog.objects.get(
            action="LOAN_STATUS_CHANGED",
            entity_id=user.id,
        )
        self.assertEqual(row.actor, staff)


class AuditLogReadApiTests(APITestCase):
    URL = "/api/audit/logs/"

    def setUp(self):
        self.client_user = _make_user("client@example.com", "client")
        self.compliance = _make_user("compliance@example.com", "compliance")
        self.superuser = _make_user("root@example.com", "loan_processing", is_superuser=True)

        log_action("SEED_ACTION", entity_type="User")
        log_action("OTHER_ACTION", entity_type="Invitation")

    def test_client_forbidden(self):
        self.client.force_authenticate(self.client_user)
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_compliance_can_read(self):
        self.client.force_authenticate(self.compliance)
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 2)

    def test_superuser_can_read(self):
        self.client.force_authenticate(self.superuser)
        self.assertEqual(self.client.get(self.URL).status_code, 200)

    def test_action_filter(self):
        self.client.force_authenticate(self.compliance)
        resp = self.client.get(self.URL, {"action": "SEED_ACTION"})
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["action"], "SEED_ACTION")

    def test_valid_entity_id_filter(self):
        self.client.force_authenticate(self.compliance)
        log_action("ENTITY_ACTION", entity_type="User", entity_id=self.compliance.id)

        resp = self.client.get(self.URL, {"entity_id": str(self.compliance.id)})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["action"], "ENTITY_ACTION")

    def test_blank_filters_are_ignored(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(self.URL, {"action": "", "entity_id": ""})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 2)

    def test_invalid_entity_id_returns_400(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(self.URL, {"entity_id": "not-a-uuid"})

        self.assertEqual(resp.status_code, 400)

    def test_invalid_actor_returns_400(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(self.URL, {"actor": "not-a-uuid"})

        self.assertEqual(resp.status_code, 400)

    def test_invalid_since_returns_400(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(self.URL, {"since": "not-a-date"})

        self.assertEqual(resp.status_code, 400)

    def test_invalid_until_returns_400(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(self.URL, {"until": "not-a-date"})

        self.assertEqual(resp.status_code, 400)

    def test_since_after_until_returns_400(self):
        self.client.force_authenticate(self.compliance)

        resp = self.client.get(
            self.URL,
            {
                "since": "2026-10-21T12:00:00Z",
                "until": "2026-10-21T11:00:00Z",
            },
        )

        self.assertEqual(resp.status_code, 400)


class AuditOtpGateTests(APITestCase):
    URL = "/api/audit/logs/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        otp_utils._redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        otp_utils.get_redis_client().flushdb()
        self.compliance = _make_user(
            "mfa-compliance@example.com",
            "compliance",
            mfa_enabled=True,
        )
        self.client.force_authenticate(self.compliance)

    def tearDown(self):
        otp_utils.get_redis_client().flushdb()

    def test_audit_reader_requires_otp_verification(self):
        resp = self.client.get(self.URL)

        self.assertEqual(resp.status_code, 403)
        self.assertEqual(
            resp.data.get("detail"),
            "OTP verification required.",
        )

    def test_audit_reader_unlocks_after_otp_verification(self):
        otp_utils.mark_otp_verified(self.compliance.id)

        self.assertEqual(self.client.get(self.URL).status_code, 200)


class AuditHardeningTests(APITestCase):
    def _request(self, **extra):
        return RequestFactory().get("/", **extra)

    def test_forwarded_for_is_ignored_by_default(self):
        request = self._request(
            REMOTE_ADDR="203.0.113.9",
            HTTP_X_FORWARDED_FOR="198.51.100.7",
        )

        row = log_action("IP_ACTION", request=request)

        self.assertEqual(row.ip_address, "203.0.113.9")

    @override_settings(AUDIT_TRUST_X_FORWARDED_FOR=True)
    def test_forwarded_for_is_used_when_trusted(self):
        request = self._request(
            REMOTE_ADDR="203.0.113.9",
            HTTP_X_FORWARDED_FOR="198.51.100.7, 10.0.0.1",
        )

        row = log_action("IP_ACTION", request=request)

        self.assertEqual(row.ip_address, "198.51.100.7")

    def test_invalid_ip_is_dropped(self):
        request = self._request(REMOTE_ADDR="not-an-ip")

        row = log_action("IP_ACTION", request=request)

        self.assertIsNone(row.ip_address)

    def test_rows_are_immutable(self):
        row = log_action("IMMUTABLE_ACTION")
        row.action = "TAMPERED"

        with self.assertRaises(ValueError):
            row.save()
        with self.assertRaises(ValueError):
            row.delete()
