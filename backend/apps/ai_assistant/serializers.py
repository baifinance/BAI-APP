from rest_framework import serializers


class RAGChatRequestSerializer(serializers.Serializer):
    question = serializers.CharField(
        required=True,
        allow_blank=False,
        help_text="User query for the Bai Finance AI assistant."
    )
    domain_filter = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        default=None,
        help_text="Optional domain metadata filter (e.g. corporate_overview, mortgage_lending, legal_migration, customer_support)."
    )
    top_k = serializers.IntegerField(
        required=False,
        default=3,
        min_value=1,
        max_value=10,
        help_text="Number of knowledge base document chunks to retrieve."
    )


class RAGChatResponseSerializer(serializers.Serializer):
    answer = serializers.CharField(help_text="Generated response from LLM.")
    sources = serializers.ListField(
        child=serializers.CharField(),
        help_text="Retrieved context chunks used to construct the answer."
    )
