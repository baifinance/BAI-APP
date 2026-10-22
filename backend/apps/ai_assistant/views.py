import logging
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle, ScopedRateThrottle

from authentication.permissions import IsOtpVerified

from .models import ChatMessage, Conversation, ConversationCounter
from .serializers import (
    ConversationEndRequestSerializer,
    ConversationSessionResponseSerializer,
    RAGChatRequestSerializer,
    RAGChatResponseSerializer,
)
from .services.rag_service import get_rag_service

logger = logging.getLogger(__name__)


class AiUserThrottle(UserRateThrottle):
    scope = "ai"


class SessionStartThrottle(ScopedRateThrottle):
    scope = "session"


class TranscriptEndThrottle(ScopedRateThrottle):
    scope = "transcript"


ROLE_LABELS = {
    ChatMessage.ROLE_CUSTOMER: "Customer",
    ChatMessage.ROLE_ASSISTANT: "Bank Assistant",
    ChatMessage.ROLE_SYSTEM: "System",
}


def _display_name(user) -> str:
    first = (getattr(user, "first_name", "") or "").strip()
    last = (getattr(user, "last_name", "") or "").strip()
    middle = ""
    try:
        profile = getattr(user, "client_profile", None)
        middle = (getattr(profile, "middle_name", "") or "").strip()
    except Exception:
        middle = ""
    if not middle:
        try:
            from users.models import ClientProfile
            row = ClientProfile.objects.filter(pk=user.pk).values("middle_name").first()
            middle = ((row or {}).get("middle_name") or "").strip()
        except Exception:
            middle = ""
    tokens = middle.split()
    initial = f" {tokens[-1][0].upper()}." if tokens else ""
    full = f"{first}{initial} {last}".replace("  ", " ").strip()
    return full or getattr(user, "email", "Customer")


def _allocate_code() -> str:
    with transaction.atomic():
        counter, _ = ConversationCounter.objects.select_for_update().get_or_create(
            id=1, defaults={"last_number": 10024}
        )
        counter.last_number += 1
        counter.save(update_fields=["last_number"])
        return f"CONV-{counter.last_number}"


def _render_transcript(conversation: Conversation, messages, customer_name: str) -> str:
    date_str = conversation.started_at.astimezone().strftime("%B %d, %Y")
    lines = [
        f"Conversation ID: {conversation.code}",
        f"Customer: {customer_name}",
        f"Date: {date_str}",
        "",
    ]
    for m in messages:
        ts = m.created_at.astimezone().strftime("%H:%M:%S")
        lines.append(f"[{ts}] {ROLE_LABELS.get(m.role, m.role)}:")
        lines.append(m.text.strip())
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


# Fields masked when AI_REDACT_PROFILE_PII is on (the assistant can still
# reason about loan amount/goal/status, which are not individually identifying).
_REDACTED_PROFILE_FIELDS = {
    "Name",
    "Email",
    "Mobile",
    "Address",
    "DOB",
    "Visa",
    "Visa expiry",
}


def _build_profile_context(user) -> str | None:
    if not getattr(settings, "AI_PROFILE_CONTEXT_ENABLED", False):
        return None
    if getattr(user, "role", None) != "client":
        return None
    try:
        profile = getattr(user, "client_profile", None)
    except Exception:
        profile = None
    if profile is None:
        try:
            from users.models import ClientProfile
            profile = ClientProfile.objects.filter(pk=user.pk).first()
        except Exception:
            profile = None
    if profile is None:
        return None
    parts = []
    name = f"{getattr(user, 'first_name', '')} {getattr(profile, 'middle_name', '') or ''} {getattr(user, 'last_name', '')}".replace("  ", " ").strip()
    fields = [
        ("Name", name or None),
        ("Email", getattr(user, "email", None)),
        ("Mobile", getattr(profile, "mobile", None)),
        ("Address", getattr(profile, "address", None)),
        ("DOB", getattr(profile, "dob", None)),
        ("Visa", getattr(profile, "visa", None)),
        ("Visa subclass", getattr(profile, "visa_subclass", None)),
        ("Visa expiry", getattr(profile, "visa_expiry", None)),
        ("Loan amount", getattr(profile, "loan_amount", None)),
        ("Goal", getattr(profile, "goal", None)),
        ("Loan status", getattr(profile, "loan_status", None)),
    ]
    redact = getattr(settings, "AI_REDACT_PROFILE_PII", True)
    for label, value in fields:
        if value:
            if redact and label in _REDACTED_PROFILE_FIELDS:
                value = "[redacted]"
            parts.append(f"{label}: {value}")
    return "\n".join(parts) if parts else None


class ConversationStartView(APIView):
    """POST /api/ai/chat/session/start/ -> open a transcript session."""

    permission_classes = [IsAuthenticated, IsOtpVerified]
    throttle_classes = [SessionStartThrottle]
    throttle_scope = "session"

    def post(self, request):
        code = _allocate_code()
        with transaction.atomic():
            # Silently drop prior open-but-empty sessions (started, never messaged, no email).
            empties = Conversation.objects.filter(
                user=request.user, status=Conversation.STATUS_OPEN
            )
            for prior in empties:
                if not prior.messages.filter(role=ChatMessage.ROLE_CUSTOMER).exists():
                    prior.status = Conversation.STATUS_CLOSED
                    prior.close_reason = "empty"
                    prior.ended_at = timezone.now()
                    prior.save(update_fields=["status", "close_reason", "ended_at"])
            conv = Conversation.objects.create(user=request.user, code=code)
            ChatMessage.objects.create(
                conversation=conv,
                role=ChatMessage.ROLE_SYSTEM,
                text=f"Authenticated user: {request.user.pk}\nAction: Open support session",
            )
        out = ConversationSessionResponseSerializer({"conversation_id": code})
        return Response(out.data, status=status.HTTP_201_CREATED)


class RAGChatView(APIView):
    """
    Endpoint for asking queries to the Bai Finance RAG Knowledge Base.
    POST /api/ai/chat/
    Requires login (expensive LLM) + input length validated via serializer.
    Client users get their own verified profile injected; other roles get KB only.
    """

    permission_classes = [IsAuthenticated, IsOtpVerified]
    throttle_classes = [AiUserThrottle]

    def post(self, request):
        serializer = RAGChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data["question"]
        domain_filter = serializer.validated_data.get("domain_filter") or None
        top_k = serializer.validated_data.get("top_k", 3)
        conv_code = (serializer.validated_data.get("conversation_id") or "").strip()

        conversation = None
        if getattr(request.user, "role", None) == "client":
            if not conv_code:
                return Response(
                    {"conversation_id": ["Open session required. Start a chat session first."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            conversation = Conversation.objects.filter(code=conv_code, user=request.user).first()
            if conversation is None:
                return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
            if conversation.status != Conversation.STATUS_OPEN:
                return Response({"detail": "Conversation is closed."}, status=status.HTTP_400_BAD_REQUEST)
        elif conv_code:
            conversation = Conversation.objects.filter(code=conv_code, user=request.user).first()

        try:
            profile_context = _build_profile_context(request.user)
            result = get_rag_service().query(
                question=question,
                domain_filter=domain_filter,
                top_k=top_k,
                profile_context=profile_context,
            )
            if conversation is not None:
                with transaction.atomic():
                    ChatMessage.objects.create(
                        conversation=conversation, role=ChatMessage.ROLE_CUSTOMER, text=question
                    )
                    if profile_context:
                        ChatMessage.objects.create(
                            conversation=conversation,
                            role=ChatMessage.ROLE_SYSTEM,
                            text="Action: Retrieve authorized application profile",
                        )
                    ChatMessage.objects.create(
                        conversation=conversation,
                        role=ChatMessage.ROLE_ASSISTANT,
                        text=result.get("answer", ""),
                    )
            response_serializer = RAGChatResponseSerializer(data=result)
            response_serializer.is_valid(raise_exception=True)
            data = dict(response_serializer.data)
            if conversation is not None:
                data["conversation_id"] = conversation.code
            return Response(data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error executing RAG query")
            # Generic error to avoid leaking internals (A10)
            return Response(
                {"error": "Failed to generate response. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationEndView(APIView):
    """POST /api/ai/chat/session/end/ -> close session + always email transcript."""

    permission_classes = [IsAuthenticated, IsOtpVerified]
    throttle_classes = [TranscriptEndThrottle]
    throttle_scope = "transcript"

    def post(self, request):
        serializer = ConversationEndRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["conversation_id"].strip()
        reason = serializer.validated_data.get("reason") or "manual"

        conversation = Conversation.objects.filter(code=code, user=request.user).first()
        if conversation is None:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        if conversation.status == Conversation.STATUS_CLOSED:
            return Response(
                {"conversation_id": code, "detail": "Already closed.", "emailed": conversation.transcript_sent},
                status=status.HTTP_200_OK,
            )

        messages = list(conversation.messages.all().order_by("created_at"))
        customer_name = _display_name(request.user)
        body = _render_transcript(conversation, messages, customer_name)

        try:
            send_mail(
                subject=f"Your BAI Support transcript {conversation.code}",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Transcript email failed for %s", conversation.code)
            return Response(
                {"error": "Unable to send transcript right now. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        conversation.status = Conversation.STATUS_CLOSED
        conversation.close_reason = reason if reason in ("manual", "idle") else "manual"
        conversation.ended_at = timezone.now()
        conversation.transcript_sent = True
        conversation.save(update_fields=["status", "close_reason", "ended_at", "transcript_sent"])

        try:
            from notifications.choices import NotificationType
            from notifications.services import create_notification, publish_stream_notification

            notification = create_notification(
                recipient=request.user,
                notification_type=NotificationType.COMMUNICATION,
                title="Transcript sent to email",
                message=(
                    f"Your support chat {conversation.code} transcript "
                    f"was sent to {request.user.email}."
                ),
                related_object=conversation,
            )
            publish_stream_notification(request.user.pk, notification=notification)
        except Exception:
            logger.warning("Transcript notification failed for %s", conversation.code)
        return Response(
            {"conversation_id": code, "emailed": True, "to": request.user.email},
            status=status.HTTP_200_OK,
        )
