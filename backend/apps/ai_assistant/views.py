import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .serializers import RAGChatRequestSerializer, RAGChatResponseSerializer
from .services.rag_service import RAGService

logger = logging.getLogger(__name__)


class RAGChatView(APIView):
    """
    Endpoint for asking queries to the Bai Finance RAG Knowledge Base.
    POST /api/ai/chat/
    """
    permission_classes = [AllowAny]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.rag_service = RAGService()

    def post(self, request):
        serializer = RAGChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data["question"]
        domain_filter = serializer.validated_data.get("domain_filter") or None
        top_k = serializer.validated_data.get("top_k", 3)

        try:
            result = self.rag_service.query(
                question=question,
                domain_filter=domain_filter,
                top_k=top_k,
            )
            response_serializer = RAGChatResponseSerializer(data=result)
            response_serializer.is_valid(raise_exception=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error executing RAG query: %s", e)
            return Response(
                {"error": f"Failed to generate response: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
