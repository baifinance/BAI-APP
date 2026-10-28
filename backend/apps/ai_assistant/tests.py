from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from ai_assistant.views import _build_profile_context
from otp.utils import get_redis_client, mark_otp_verified
from loans.models import LoanApplication
from users.models import ClientProfile, User


def _make_client(email="ai@example.com"):
    user = User.objects.create_user(
        email=email,
        username=email,
        password="pw12345678",
        role="client",
        is_active=True,
    )
    ClientProfile.objects.create(
        user=user,
        mobile="0400111222",
        address="1 Example St",
        dob="1990-01-01",
        loan_amount="750000",
        goal="Refinance investment property",
        loan_status="Under Review",
    )
    return user


class ProfileContextEgressTests(TestCase):
    def setUp(self):
        self.user = _make_client()

    @override_settings(AI_PROFILE_CONTEXT_ENABLED=False)
    def test_disabled_returns_none(self):
        self.assertIsNone(_build_profile_context(self.user))

    def test_profile_context_is_off_by_default(self):
        self.assertIsNone(_build_profile_context(self.user))

    @override_settings(AI_PROFILE_CONTEXT_ENABLED=True)
    def test_enabled_includes_loan_context(self):
        ctx = _build_profile_context(self.user)
        self.assertIsNotNone(ctx)
        self.assertIn("750000", ctx)
        self.assertIn("Under Review", ctx)

    @override_settings(
        AI_PROFILE_CONTEXT_ENABLED=True,
        AI_REDACT_PROFILE_PII=True,
    )
    def test_redaction_masks_identifying_fields(self):
        ctx = _build_profile_context(self.user)

        self.assertIsNotNone(ctx)
        self.assertIn("[redacted]", ctx)
        self.assertNotIn("0400111222", ctx)
        self.assertNotIn("1 Example St", ctx)
        self.assertNotIn("1990-01-01", ctx)
        # Loan context is retained so the assistant stays useful.
        self.assertIn("750000", ctx)

    @override_settings(AI_PROFILE_CONTEXT_ENABLED=True)
    def test_includes_all_loan_applications(self):
        profile = ClientProfile.objects.get(user=self.user)
        LoanApplication.objects.create(
            client=profile,
            asana_project_name="Home Purchase — Sydney",
            asana_task_name="SYD-101",
            amount=950000.00,
            asana_status="Under Review",
            status="under_review",
            is_primary=True,
        )
        LoanApplication.objects.create(
            client=profile,
            asana_project_name="Refinance — Melbourne",
            asana_task_name="MEL-202",
            amount=500000.00,
            asana_status="Pending",
            status="draft",
            is_primary=False,
        )

        ctx = _build_profile_context(self.user)
        self.assertIsNotNone(ctx)
        self.assertIn("Loan applications:", ctx)
        self.assertIn("Home Purchase — Sydney", ctx)
        self.assertIn("Refinance — Melbourne", ctx)
        self.assertIn("950000", ctx)
        self.assertIn("500000", ctx)
        self.assertIn("Under Review", ctx)
        self.assertIn("Pending", ctx)
        self.assertIn("(primary)", ctx)

    def test_non_client_has_no_profile_context(self):
        broker = User.objects.create_user(
            email="broker@example.com",
            username="broker@example.com",
            password="pw12345678",
            role="broker",
            is_active=True,
        )
        self.assertIsNone(_build_profile_context(broker))


class AiOtpGateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ai-mfa@example.com",
            username="ai-mfa@example.com",
            password="pw12345678",
            role="client",
            is_active=True,
            mfa_enabled=True,
        )
        self.client.force_authenticate(self.user)

    def tearDown(self):
        get_redis_client().delete(f"otp_verified:{self.user.id}")

    def test_session_start_blocked_until_otp_verified(self):
        resp = self.client.post("/api/ai/chat/session/start/")
        self.assertEqual(resp.status_code, 403)

        mark_otp_verified(self.user.id)

        resp = self.client.post("/api/ai/chat/session/start/")
        self.assertEqual(resp.status_code, 201)
