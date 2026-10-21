from django.test import override_settings
from rest_framework.test import APITestCase

from users.models import User

SEEDED_EMAIL = "compliance@bai.finance"
SEEDED_PASSWORD = "SuperSecretPassword123!"


def _make_user(email, role="client"):
    return User.objects.create_user(
        email=email,
        username=email,
        password="pw12345678",
        role=role,
        is_active=True,
    )


class UserDetailsPrivilegeEscalationTests(APITestCase):
    """The dj-rest-auth user-details endpoint must never mutate security fields."""

    URL = "/api/auth/user/"

    def setUp(self):
        self.user = _make_user("client@example.com")
        self.client.force_authenticate(self.user)

    def test_get_returns_user_fields(self):
        resp = self.client.get(self.URL)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id"], str(self.user.id))
        self.assertEqual(resp.data["email"], self.user.email)
        self.assertEqual(resp.data["role"], "client")

    def test_cannot_escalate_role(self):
        resp = self.client.patch(self.URL, {"role": "loan_processing"}, format="json")

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "client")

    def test_cannot_disable_mfa_without_password(self):
        self.user.mfa_enabled = True
        self.user.save(update_fields=["mfa_enabled"])

        resp = self.client.patch(self.URL, {"mfa_enabled": False}, format="json")

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIs(self.user.mfa_enabled, True)

    def test_cannot_change_is_active(self):
        resp = self.client.patch(self.URL, {"is_active": False}, format="json")

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIs(self.user.is_active, True)

    def test_cannot_change_email(self):
        resp = self.client.patch(
            self.URL, {"email": "attacker@example.com"}, format="json"
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "client@example.com")

    def test_client_still_denied_staff_endpoint(self):
        self.client.patch(self.URL, {"role": "loan_processing"}, format="json")

        resp = self.client.get("/api/users/")
        self.assertEqual(resp.status_code, 403)


class ProfileUpdateStillWorksTests(APITestCase):
    """Name edits must keep working through the profile endpoint."""

    def setUp(self):
        self.user = _make_user("client2@example.com")
        self.client.force_authenticate(self.user)

    def test_patch_first_last_name(self):
        resp = self.client.patch(
            "/api/users/profile/",
            {"first_name": "Jane", "last_name": "Doe"},
            format="json",
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Jane")
        self.assertEqual(self.user.last_name, "Doe")


class SeededAccountTests(APITestCase):
    @override_settings(TURNSTILE_ENABLED=False)
    def test_published_seed_credentials_cannot_login(self):
        resp = self.client.post(
            "/api/auth/login/",
            {
                "username": SEEDED_EMAIL,
                "password": SEEDED_PASSWORD,
            },
        )

        self.assertNotEqual(resp.status_code, 200)

    def test_seeded_account_is_neutralized(self):
        user = User.objects.filter(email__iexact=SEEDED_EMAIL).first()

        if user is not None:
            self.assertFalse(user.is_active)
            self.assertFalse(user.is_staff)
            self.assertFalse(user.is_superuser)
            self.assertFalse(user.has_usable_password())
