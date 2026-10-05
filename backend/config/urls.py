from django.contrib import admin
from django.urls import include, path
from bookings.views import BrokerListView
from health.views import HealthView
from authentication.views import LoginView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Custom login response; keep distinct name to avoid colliding with dj_rest_auth's rest_login.
    path("api/auth/login/", LoginView.as_view(), name="custom-login"),

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
    
    # AI Assistant (RAG)
    path("api/ai/", include("ai_assistant.urls")),

    # Asana webhook
    path("api/asana/", include("asana_integration.urls")),

    # Health
    path("healthz", HealthView.as_view(), name="healthz"),
]