import os
import logging
import requests
import chromadb
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_COLLECTION_NAME = "bai_finance_knowledge_base"


class RAGService:
    """Service to handle vector embedding, ChromaDB retrieval, and Groq LLM generation."""

    def __init__(self, collection_name: str = DEFAULT_COLLECTION_NAME):
        self.collection_name = collection_name
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.jina_api_key = os.getenv("JINA_API_KEY")
        self.chroma_api_key = os.getenv("CHROMA_API_KEY")
        self.chroma_tenant = os.getenv("CHROMA_TENANT")
        self.chroma_database = os.getenv("CHROMA_DATABASE")

        # Groq client
        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None
        self._embedder = None
        self._collection = None

    def _get_chroma_client(self):
        if self.chroma_api_key and self.chroma_tenant and self.chroma_database:
            return chromadb.CloudClient(
                api_key=self.chroma_api_key,
                tenant=self.chroma_tenant,
                database=self.chroma_database,
            )
        # Persistent local ChromaDB storage fallback
        persist_dir = os.path.join(settings.BASE_DIR, "data", "chromadb")
        os.makedirs(persist_dir, exist_ok=True)
        return chromadb.PersistentClient(path=persist_dir)

    @property
    def collection(self):
        if self._collection is None:
            client = self._get_chroma_client()
            self._collection = client.get_or_create_collection(name=self.collection_name)
        return self._collection

    def get_embedding(self, text: str) -> list[float]:
        """Generate embedding vector using Jina API (768d) or local SentenceTransformer fallback."""
        if self.jina_api_key:
            response = requests.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.jina_api_key}",
                },
                json={"model": "jina-embeddings-v2-base-en", "input": [text]},
                timeout=15,
            )
            if response.status_code == 200:
                return response.json()["data"][0]["embedding"]
            raise ValueError(f"Jina API Error ({response.status_code}): {response.text}")

        # Fallback only when JINA_API_KEY is not set
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
        return self._embedder.encode([text])[0].tolist()

    def get_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embedding helper."""
        if self.jina_api_key:
            response = requests.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.jina_api_key}",
                },
                json={"model": "jina-embeddings-v2-base-en", "input": texts},
                timeout=30,
            )
            if response.status_code == 200:
                return [item["embedding"] for item in response.json()["data"]]
            raise ValueError(f"Jina API Batch Error ({response.status_code}): {response.text}")

        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
        return self._embedder.encode(texts).tolist()

    def query(self, question: str, domain_filter: str = None, top_k: int = 3) -> dict:
        """Query knowledge base and synthesize response via Groq."""
        if not self.groq_client:
            raise ValueError("GROQ_API_KEY is not configured.")

        query_vector = self.get_embedding(question)

        query_params = {
            "query_embeddings": [query_vector],
            "n_results": top_k,
        }
        if domain_filter:
            query_params["where"] = {"domain": domain_filter}

        results = self.collection.query(**query_params)
        retrieved_docs = results.get("documents", [[]])[0]
        context = "\n\n".join(retrieved_docs) if retrieved_docs else "No relevant context found."

        system_prompt = (
            "You are an expert AI assistant for Bai Finance Group of Companies. "
            "Answer user queries accurately relying strictly on the retrieved context below. "
            "If the answer cannot be determined from context, politely state: "
            "'I can only answer questions related to Bai Finance's services, home loans, legal advisory, and operations. Feel free to ask me anything about those!'"
        )

        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        completion = self.groq_client.chat.completions.create(
            model=groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Retrieved Context:\n{context}\n\nUser Question: {question}"},
            ],
            temperature=0.1,
        )

        answer = completion.choices[0].message.content
        return {
            "answer": answer,
            "sources": retrieved_docs,
        }

    def ingest_documents(self, documents: list[str], metadatas: list[dict] = None, ids: list[str] = None):
        """Index or re-index documents into ChromaDB."""
        if not documents:
            return 0

        embeddings = self.get_embeddings_batch(documents)
        doc_ids = ids if ids else [f"doc_{i+1:03d}" for i in range(len(documents))]

        self.collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas if metadatas else None,
            ids=doc_ids,
        )
        return len(documents)
