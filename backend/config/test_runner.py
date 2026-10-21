"""Test runner that keeps notification email off the real SMTP server.

``.env`` points ``EMAIL_BACKEND`` at real SMTP so the dev server can deliver
mail, and ``EMAIL_NOTIFICATIONS_ENABLED=True`` makes every published
notification queue and send an email. Django only swaps in the in-memory
backend when the configured backend is the dummy one, so without this the test
suite would deliver real emails to whatever address each fixture uses and each
notification would pay the SMTP round trip.

Tests still exercise the whole notification path (queue, render, status
bookkeeping, opt-out checks) — only the transport changes.
"""

from django.test.runner import DiscoverRunner


class NotificationSafeTestRunner(DiscoverRunner):
    """Force the in-memory email backend for the whole test run."""

    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)

        from django.conf import settings

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
