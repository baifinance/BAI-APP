"""Helpers for issuing and clearing the app's authentication cookies."""

from django.conf import settings
from dj_rest_auth.jwt_auth import set_jwt_cookies, unset_jwt_cookies
from rest_framework_simplejwt.tokens import RefreshToken

ROLE_COOKIE = "user-role"


def set_role_cookie(response, user):
    """Set the server-authoritative routing cookie for ``user``."""
    refresh_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    response.set_cookie(
        ROLE_COOKIE,
        user.role,
        max_age=(
            int(refresh_lifetime.total_seconds())
            if refresh_lifetime
            else 60 * 60 * 24 * 7
        ),
        httponly=True,
        samesite=settings.REST_AUTH.get("JWT_AUTH_SAMESITE", "Lax"),
        secure=settings.REST_AUTH.get("JWT_AUTH_SECURE", False),
        path="/",
    )


def issue_session_cookies(response, user):
    """Issue JWT and role cookies for a fully authenticated user."""
    refresh = RefreshToken.for_user(user)
    set_jwt_cookies(response, str(refresh.access_token), str(refresh))
    set_role_cookie(response, user)


def clear_session_cookies(response):
    """Remove JWT and role cookies from a response."""
    unset_jwt_cookies(response)
    response.delete_cookie(ROLE_COOKIE, path="/")
