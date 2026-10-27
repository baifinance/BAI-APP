from django.conf import settings
from django.core import signing

EMAIL_PREFERENCES_SALT = "notifications.email-preferences"


def make_email_preferences_token(user):
    """Create a signed, expiring token for email preference links."""
    return signing.dumps(
        {"uid": str(user.pk)},
        salt=EMAIL_PREFERENCES_SALT,
    )


def read_email_preferences_token(token):
    """Return the user id encoded in a valid token, or ``None``."""
    try:
        payload = signing.loads(
            token,
            salt=EMAIL_PREFERENCES_SALT,
            max_age=getattr(settings, "NOTIFICATION_EMAIL_TOKEN_MAX_AGE", 2592000),
        )
    except (signing.BadSignature, signing.SignatureExpired, TypeError):
        return None
    return payload.get("uid")
