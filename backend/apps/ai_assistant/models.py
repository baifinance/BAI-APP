"""Conversation transcript models for bank-style chat records."""

from django.conf import settings
from django.db import models


class ConversationCounter(models.Model):
    """Single-row atomic counter for CONV-##### codes (race-safe)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    last_number = models.PositiveIntegerField(default=10024)

    class Meta:
        db_table = "conversation_counter"

    def __str__(self):
        return f"ConversationCounter: {self.last_number}"


class Conversation(models.Model):
    """A single client support chat session (CONV-#####)."""

    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OPEN)
    close_reason = models.CharField(max_length=10, null=True, blank=True)
    transcript_sent = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.code} ({self.status})"


class ChatMessage(models.Model):
    """One transcript line: customer, assistant, or system event."""

    ROLE_CUSTOMER = "customer"
    ROLE_ASSISTANT = "assistant"
    ROLE_SYSTEM = "system"
    ROLE_CHOICES = (
        (ROLE_CUSTOMER, "Customer"),
        (ROLE_ASSISTANT, "Bank Assistant"),
        (ROLE_SYSTEM, "System"),
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["conversation", "created_at"])]

    def __str__(self):
        return f"{self.conversation.code} [{self.role}]"
