from django.urls import path
from .views import ConversationEndView, ConversationStartView, RAGChatView

app_name = "ai_assistant"

urlpatterns = [
    path("chat/", RAGChatView.as_view(), name="rag-chat"),
    path("chat/session/start/", ConversationStartView.as_view(), name="chat-session-start"),
    path("chat/session/end/", ConversationEndView.as_view(), name="chat-session-end"),
]
