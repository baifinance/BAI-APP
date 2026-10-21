import re
from unittest.mock import patch

import redis

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from authentication.views import (
    InvitationResendView,
    InvitationRevokeView,
    InviteThrottle,
    LoanProcessingAccountCreateView,
    SendInviteView,
)
from audit.views import AuditLogListView
from authentication.permissions import IsOtpVerified
from otp import utils as otp_utils
from users.active_views import ActiveUserListView
from users.choices import UserRole
from users.models import User
from users.views import UserListView

TEST_REDIS_URL = "redis://localhost:6379/15"

@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ASANA_PROFILE_LOOKUP_ENABLED=False,
    TURNSTILE_ENABLED=False,
)
class LoginOtpFlowTest(APITestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        otp_utils._redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        otp_utils.get_redis_client().flushdb()
        self.client = APIClient()
        self.email = "expertbake@gmail.com"
        self.password = "0909185525544"
        self.user =  User.objects.create_user(
            email=self.email,
            username=self.email,
            password=self.password,
            role="client",
            is_active=True,
            is_staff=False
        )

    def tearDown(self):
        otp_utils.get_redis_client().flushdb()

    def _login(self):
        return self.client.post(
            "/api/auth/login/",
            { "username": self.email, "password": self.password },
        )

    def test_mfa_login_blocks_then_unblocks(self):
        self.user.mfa_enabled = True
        self.user.save()

        resp = self._login()
        self.assertEqual(resp.status_code, 200)
        self.assertIs(resp.data.get("otp_required"), True)

        # MFA login must not leave behind a usable session before verification.
        for cookie_name in (
            "jwt-access-token",
            "jwt-refresh-token",
            "user-role",
        ):
            self.assertEqual(resp.cookies[cookie_name].value, "")

        # Browsers process the Set-Cookie deletions; the test client retains
        # the empty values, which JWTCookieAuthentication would try to parse.
        self.client.cookies.clear()

        resp = self.client.get("/api/bookings/")
        self.assertIn(resp.status_code, (401, 403))

        # OTPs are stored hashed; read the live code from the delivered email.
        code = re.search(
            r"verification code is: (\d+)", mail.outbox[-1].body
        ).group(1)

        resp = self.client.post(
            "/api/otp/verify/",
            {"email": self.email, "code" : code, "purpose": "login_2fa"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIs(resp.data.get("verified"), True)
        self.assertNotEqual(resp.cookies["jwt-access-token"].value, "")
        self.assertNotEqual(resp.cookies["jwt-refresh-token"].value, "")
        self.assertEqual(resp.cookies["user-role"].value, "client")

        resp = self.client.get("/api/bookings/")
        self.assertEqual(resp.status_code, 200)

    def test_otp_email_has_warning_separator(self):
        self.user.mfa_enabled = True
        self.user.save()

        self._login()

        self.assertIn(
            "seconds\n\nIf you did not request this",
            mail.outbox[-1].body,
        )

    @patch("otp.services.send_otp_email", side_effect=Exception("smtp down"))
    def test_mfa_login_send_failure_returns_503_and_clears_otp(self, _send):
        self.user.mfa_enabled = True
        self.user.save()

        resp = self._login()

        self.assertEqual(resp.status_code, 503)
        client = otp_utils.get_redis_client()
        key = f"otp:login_2fa:{self.email.lower()}"
        self.assertIsNone(client.get(key))
        self.assertIsNone(client.get(f"{key}:attempts"))

    def test_plain_login_skips(self):
        self.user.mfa_enabled = False
        self.user.save()

        resp = self._login()
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("otp_required", resp.data)

        resp = self.client.get("/api/bookings/")
        self.assertEqual(resp.status_code, 200)

    def test_login_sets_httponly_role_cookie(self):
        resp = self._login()
        self.assertEqual(resp.status_code, 200)

        cookie = resp.cookies.get("user-role")
        self.assertIsNotNone(cookie)
        self.assertEqual(cookie.value, "client")
        self.assertTrue(cookie["httponly"])

    def test_token_email_password_reset_disabled(self):
        resp = self.client.post("/api/auth/password/reset/", {"email": self.email})

        self.assertEqual(resp.status_code, 410)

    def test_password_reset_disabled_without_trailing_slash(self):
        resp = self.client.post("/api/auth/password/reset", {"email": self.email})

        self.assertEqual(resp.status_code, 410)

    def test_password_reset_confirm_disabled(self):
        resp = self.client.post(
            "/api/auth/password/reset/confirm/",
            {"uid": "x", "token": "y", "new_password1": "a", "new_password2": "a"},
        )

        self.assertEqual(resp.status_code, 410)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ASANA_PROFILE_LOOKUP_ENABLED=False,
    TURNSTILE_ENABLED=False,
)
class LoanProcessingAccountCreateTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.actor = User.objects.create_user(
            email="lp-admin@example.com",
            username="lp-admin@example.com",
            password="test-pass-123",
            role=UserRole.LOAN_PROCESSING,
            is_active=True,
        )
        self.client.force_authenticate(self.actor)

    def test_create_loan_processing_account(self):
        resp = self.client.post(
            "/api/auth/loan-processing/",
            {
                "email": "New.LP@Example.com ",
                "first_name": "New",
                "last_name": "Processor",
            },
        )

        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(email="new.lp@example.com")
        self.assertEqual(user.role, UserRole.LOAN_PROCESSING)
        self.assertEqual(user.invited_by, self.actor)
        self.assertFalse(user.is_active)

    def test_create_rejects_duplicate_email_case_insensitively(self):
        User.objects.create_user(
            email="existing@example.com",
            username="existing@example.com",
            password="test-pass-123",
            role=UserRole.CLIENT,
        )

        resp = self.client.post(
            "/api/auth/loan-processing/",
            {"email": "EXISTING@example.com"},
        )

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            User.objects.filter(email__iexact="existing@example.com").count(),
            1,
        )


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ASANA_PROFILE_LOOKUP_ENABLED=False,
    TURNSTILE_ENABLED=False,
)
class StaffOtpGateTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        otp_utils._redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        otp_utils.get_redis_client().flushdb()
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="mfa-staff@example.com",
            username="mfa-staff@example.com",
            password="test-pass-123",
            role=UserRole.LOAN_PROCESSING,
            is_active=True,
            mfa_enabled=True,
        )
        self.client.force_authenticate(self.staff)

    def tearDown(self):
        otp_utils.get_redis_client().flushdb()

    def test_staff_endpoints_require_otp_verification(self):
        for url in (
            "/api/users/",
            "/api/users/active/",
        ):
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 403)
                self.assertEqual(
                    resp.data.get("detail"),
                    "OTP verification required.",
                )

        resp = self.client.post(
            "/api/auth/loan-processing/",
            {"email": "new-staff@example.com"},
        )
        self.assertEqual(resp.status_code, 403)

        resp = self.client.post(
            "/api/auth/invitations/send/",
            {"email": "invite@example.com", "role": "client"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_staff_endpoints_unlock_after_otp_verification(self):
        otp_utils.mark_otp_verified(self.staff.id)

        self.assertEqual(self.client.get("/api/users/").status_code, 200)
        self.assertEqual(self.client.get("/api/users/active/").status_code, 200)

    def test_non_mfa_staff_is_not_blocked(self):
        self.staff.mfa_enabled = False
        self.staff.save(update_fields=["mfa_enabled"])

        self.assertEqual(self.client.get("/api/users/").status_code, 200)

    def test_all_staff_views_declare_otp_gate(self):
        views = (
            LoanProcessingAccountCreateView,
            SendInviteView,
            InvitationResendView,
            InvitationRevokeView,
            UserListView,
            ActiveUserListView,
            AuditLogListView,
        )
        for view in views:
            with self.subTest(view=view.__name__):
                self.assertIn(IsOtpVerified, view.permission_classes)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ASANA_PROFILE_LOOKUP_ENABLED=False,
    TURNSTILE_ENABLED=False,
)
class InviteThrottleTest(APITestCase):
    """Guards against the ScopedRateThrottle no-op/shadowing regressions."""

    def setUp(self):
        cache.clear()

    def test_validate_endpoint_enforces_invite_scope(self):
        responses = [
            self.client.get("/api/auth/invitations/validate/", {"token": "x"})
            for _ in range(21)
        ]
        self.assertEqual(responses[0].status_code, 200)
        self.assertEqual(responses[-1].status_code, 429)

    def test_send_invite_uses_scoped_invite_throttle(self):
        self.assertIs(SendInviteView.throttle_classes[0], InviteThrottle)
        self.assertEqual(InviteThrottle.scope, "invite")
        self.assertEqual(SendInviteView.throttle_scope, "invite")