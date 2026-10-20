import re
import redis

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from authentication.views import InviteThrottle, SendInviteView
from otp import utils as otp_utils
from users.models import User

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

        resp = self.client.get("/api/bookings/")
        self.assertEqual(resp.status_code, 403)

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

        resp = self.client.get("/api/bookings/")
        self.assertEqual(resp.status_code, 200)

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