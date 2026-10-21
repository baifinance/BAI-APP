import json
from unittest.mock import patch

import redis

from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from users.models import User
from .services import issue_otp
from .utils import clear_otp, create_login_challenge, verify_otp, store_otp
from otp import utils as utils_mod

TEST_REDIS_URL = "redis://localhost:6379/15"

class OtpUtilTest(TestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        utils_mod._redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        utils_mod.get_redis_client().flushdb()

    def tearDown(self):
        utils_mod.get_redis_client().flushdb()

    @override_settings(OTP_LOGIN_EXPIRY=120)
    def test_lockout_after_three_failures(self):
        email = "lock@bai.finance"
        create_login_challenge(email)
        self.assertFalse(verify_otp(email, "000000", purpose="login_2fa")[0])
        self.assertFalse(verify_otp(email, "000000", purpose="login_2fa")[0])
        ok, msg = verify_otp(email, "000000", purpose="login_2fa")
        self.assertFalse(ok)
        self.assertIn("locked", msg.lower())
        self.assertFalse(ok)
        self.assertIn("locked", msg.lower())

    @override_settings(OTP_LOGIN_EXPIRY=120)
    def test_expired_otp(self):
        email = "expire@bai.finance"
        create_login_challenge(email)
        utils_mod.get_redis_client().expire(f"otp:login_2fa:{email.lower()}", -1)
        self.assertFalse(verify_otp(email, "123456", purpose="login_2fa")[0])

    def test_stored_otp_is_hashed_and_verifiable(self):
        email = "hash@bai.finance"
        store_otp(email, "135790", purpose="login", ttl=120)

        raw = utils_mod.get_redis_client().get(f"otp:login:{email.lower()}")
        self.assertNotEqual(json.loads(raw)["code"], "135790")

        self.assertFalse(verify_otp(email, "000000", purpose="login")[0])
        self.assertTrue(verify_otp(email, "135790", purpose="login")[0])

    def test_new_code_resets_failed_attempts(self):
        email = "resend@bai.finance"
        store_otp(email, "111111", purpose="login", ttl=120)
        self.assertFalse(verify_otp(email, "000000", purpose="login")[0])
        self.assertFalse(verify_otp(email, "000000", purpose="login")[0])

        store_otp(email, "222222", purpose="login", ttl=120)
        self.assertFalse(verify_otp(email, "000000", purpose="login")[0])

        ok, _ = verify_otp(email, "222222", purpose="login")
        self.assertTrue(ok)

    def test_clear_otp_removes_code_and_attempts(self):
        email = "clear@bai.finance"
        store_otp(email, "333333", purpose="login", ttl=120)
        self.assertFalse(verify_otp(email, "000000", purpose="login")[0])

        clear_otp(email, purpose="login")

        client = utils_mod.get_redis_client()
        self.assertIsNone(client.get(f"otp:login:{email.lower()}"))
        self.assertIsNone(client.get(f"otp:login:{email.lower()}:attempts"))

    @patch("otp.services.send_otp_email", side_effect=Exception("smtp down"))
    def test_issue_otp_clears_state_when_delivery_fails(self, _send):
        email = "delivery@bai.finance"

        with self.assertRaises(Exception):
            issue_otp(email, purpose="login")

        client = utils_mod.get_redis_client()
        self.assertIsNone(client.get(f"otp:login:{email.lower()}"))
        self.assertIsNone(client.get(f"otp:login:{email.lower()}:attempts"))


class OtpSendFailureTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        utils_mod._redis_client = redis.from_url(TEST_REDIS_URL)

    def setUp(self):
        utils_mod.get_redis_client().flushdb()
        self.user = User.objects.create_user(
            email="otp-send@bai.finance",
            username="otp-send@bai.finance",
            password="pw12345678",
            role="client",
            is_active=True,
        )

    def tearDown(self):
        utils_mod.get_redis_client().flushdb()

    def _assert_no_otp(self, purpose):
        client = utils_mod.get_redis_client()
        key = f"otp:{purpose}:{self.user.email.lower()}"
        self.assertIsNone(client.get(key))
        self.assertIsNone(client.get(f"{key}:attempts"))

    @patch("otp.services.send_otp_email", side_effect=Exception("smtp down"))
    def test_public_send_failure_returns_generic_response_and_clears_state(self, _send):
        resp = self.client.post(
            "/api/otp/send/",
            {"email": self.user.email, "purpose": "login"},
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.data["detail"],
            "If an account exists for this email, a code has been sent.",
        )
        self._assert_no_otp("login")

    @patch("otp.services.send_otp_email", side_effect=Exception("smtp down"))
    def test_mfa_enable_send_failure_returns_503_and_clears_state(self, _send):
        self.client.force_authenticate(self.user)

        resp = self.client.post("/api/users/profile/mfa/enable/send/")

        self.assertEqual(resp.status_code, 503)
        self._assert_no_otp("mfa_enable")
