"""Model fields for the asana_integration app."""

from django.db import models

from asana_integration.crypto import decrypt_secret, encrypt_secret


class EncryptedCharField(models.CharField):
    """A ``CharField`` transparently encrypted at rest with Fernet.

    Python code reads and writes plaintext; the database only ever holds
    ciphertext. Legacy plaintext values are tolerated on read.
    """

    description = "CharField encrypted at rest (Fernet)"

    def from_db_value(self, value, expression, connection):
        return decrypt_secret(value)

    def to_python(self, value):
        return decrypt_secret(value)

    def get_prep_value(self, value):
        if value is None or value == "":
            return value
        return encrypt_secret(value)
