from django.urls import path

from asana_integration.views import AsanaWebhookReceiver

urlpatterns = [
    path("webhook/", AsanaWebhookReceiver.as_view(), name="asana-webhook")
]