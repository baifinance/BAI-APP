import json

import redis

from django.test import TestCase, override_settings
from django.conf import settings

from .utils import create_login_challenge, verify_otp, store_otp
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
