"""Token revocation helpers."""

from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)


def revoke_user_tokens(user):
    """Blacklist every outstanding refresh token issued to ``user``.

    Access tokens already handed out stop working once they expire; the
    blacklist prevents the (longer-lived) refresh token from minting new ones.
    """
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
