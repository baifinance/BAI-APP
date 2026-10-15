"""Strong password validator — OWASP A07 / ASVS 2.1.7."""

import re

from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    """Require 12+ chars with upper, lower, digit, and special character."""

    def validate(self, password, user=None):
        missing = []
        if len(password or "") < 12:
            missing.append("at least 12 characters")
        if not re.search(r"[A-Z]", password or ""):
            missing.append("an uppercase letter (A-Z)")
        if not re.search(r"[a-z]", password or ""):
            missing.append("a lowercase letter (a-z)")
        if not re.search(r"[0-9]", password or ""):
            missing.append("a number (0-9)")
        if not re.search(r"[^A-Za-z0-9]", password or ""):
            missing.append("a special character (e.g. !@#$%)")
        if missing:
            raise ValidationError(
                "Password must contain " + ", ".join(missing) + ".",
                code="password_too_weak",
            )

    def get_help_text(self):
        return "Your password must be 12+ characters with upper, lower, number, and special character."
