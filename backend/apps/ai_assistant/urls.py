from django.urls import path
from .views import RAGChatView

app_name = "ai_assistant"

urlpatterns = [
    path("chat/", RAGChatView.as_view(), name="rag-chat"),
]
