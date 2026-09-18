import json
import redis

from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from otp import utils as otp_utils
from users.models import User

TEST_REDIS_URL = "redis://localhost:6379/15"

@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ASANA_PROFILE_LOOKUP_ENABLED=False,
)
class LoginOtpFlowTest(APITestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        otp_utils.redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        otp_utils.redis_client.flushdb()
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
        otp_utils.redis_client.flushdb()

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

        stored = otp_utils.redis_client.get(f"otp:login_2fa:{self.email.lower()}")
        code = json.loads(stored)["code"]

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