"""JWT authentication classes that enforce the account lifecycle status."""

from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from users.choices import UserStatus


def _require_active_status(user):
    if user.status != UserStatus.ACTIVE:
        raise AuthenticationFailed(
            "This account is not active.",
            code="account_inactive",
        )
    return user


class ActiveUserJWTAuthentication(JWTAuthentication):
    """Reject bearer tokens belonging to inactive or suspended accounts."""

    def get_user(self, validated_token):
        return _require_active_status(super().get_user(validated_token))


class ActiveUserJWTCookieAuthentication(JWTCookieAuthentication):
    """Reject cookie tokens belonging to inactive or suspended accounts."""

    def get_user(self, validated_token):
        return _require_active_status(super().get_user(validated_token))
