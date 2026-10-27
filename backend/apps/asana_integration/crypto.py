"""Symmetric encryption for the Asana webhook signing secret.

The secret is sensitive: anyone holding it can forge webhook deliveries. It is
encrypted at rest with Fernet (AES-128-CBC + HMAC-SHA256). The key material
comes from ``ASANA_SECRET_ENC_KEY`` and falls back to ``SECRET_KEY`` in
development; production should set a dedicated value so rotating ``SECRET_KEY``
does not strand existing ciphertext.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

# Marks a value as ciphertext so legacy/plaintext rows keep working (and so
# decryption is idempotent if applied to an already-decrypted value).
CIPHER_PREFIX = "fernet:"


def _fernet() -> Fernet:
    material = getattr(settings, "ASANA_SECRET_ENC_KEY", "") or settings.SECRET_KEY
    key = base64.urlsafe_b64encode(hashlib.sha256(str(material).encode()).digest())
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    """Return ``fernet:<token>`` for ``value``."""
    token = _fernet().encrypt(str(value).encode()).decode()
    return f"{CIPHER_PREFIX}{token}"


def decrypt_secret(value: str) -> str:
    """Decrypt a value produced by :func:`encrypt_secret`.

    Values without the cipher prefix are returned unchanged so pre-existing
    plaintext rows (and migration-time reads) are handled gracefully.
    """
    if not value or not value.startswith(CIPHER_PREFIX):
        return value

    token = value[len(CIPHER_PREFIX):].encode()
    try:
        return _fernet().decrypt(token).decode()
    except InvalidToken as exc:
        raise ImproperlyConfigured(
            "Could not decrypt the Asana webhook secret — is "
            "ASANA_SECRET_ENC_KEY (or SECRET_KEY) unchanged?"
        ) from exc
