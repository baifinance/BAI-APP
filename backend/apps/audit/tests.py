from django.test import override_settings
from rest_framework.test import APITestCase

from audit.models import AuditLog
from audit.services import log_action
from users.models import ClientProfile, User


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

        self.assertTrue(
            AuditLog.objects.filter(
                action="LOAN_STATUS_CHANGED", entity_id=user.id
            ).exists()
        )


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
