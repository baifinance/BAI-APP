from django.urls import include, path, re_path
from bookings.views import BrokerListView
from health.views import HealthView
from authentication.views import (
    LoginView,
    LogoutView,
    PasswordChangeView,
    DisabledPasswordResetView,
)

urlpatterns = [
    # Django admin is intentionally disabled. Administration is done through the
    # application's role-based portals and the Django shell instead.

    # Custom login response; keep distinct name to avoid colliding with dj_rest_auth's rest_login.
    path("api/auth/login/", LoginView.as_view(), name="custom-login"),

    # Custom logout/password-change so MFA verification is revoked.
    path("api/auth/logout/", LogoutView.as_view(), name="custom-logout"),
    path("api/auth/password/change/", PasswordChangeView.as_view(), name="custom-password-change"),

    # Retire dj-rest-auth's token-email password reset; OTP flow is canonical.
    # re_path matches with/without trailing slash so dj-rest-auth's optional-slash
    # route can't be reached as a bypass.
    re_path(
        r"^api/auth/password/reset/?$",
        DisabledPasswordResetView.as_view(),
        name="disabled-password-reset",
    ),
    re_path(
        r"^api/auth/password/reset/confirm/?$",
        DisabledPasswordResetView.as_view(),
        name="disabled-password-reset-confirm",
    ),

    # dj-rest-auth (login, logout, user, password, etc.)
    path("api/auth/", include("dj_rest_auth.urls")),

     # Your auth app (compliance accounts + invitations)
    path("api/auth/", include("authentication.urls")),

    # Bookings
    path("api/bookings/", include("bookings.urls")),
    # Your API
    path("api/users/", include("users.urls")),
    path("api/brokers/", BrokerListView.as_view(), name="broker-list"),

    # Loans
    path("api/loans/", include("loans.urls")),

    #Notifications
    path( "api/notifications/", include("notifications.urls")),
    
    # Add OTP Urls
    path("api/otp/", include("otp.urls")),
    
    # Audit trail (read-only, compliance/superuser)
    path("api/audit/", include("audit.urls")),

    # AI Assistant (RAG)
    path("api/ai/", include("ai_assistant.urls")),

    # Asana webhook
    path("api/asana/", include("asana_integration.urls")),

    # Health
    path("healthz", HealthView.as_view(), name="healthz"),
]