import os
import hashlib
import logging
from typing import List, Dict, Optional, Any

import requests
from requests.adapters import HTTPAdapter, Retry
import chromadb
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_COLLECTION_NAME = "bai_finance_knowledge_base"
DEFAULT_GROQ_MODEL = "llama3-8b-8192" # Valid Groq default

class RAGService:
    """Service to handle vector embedding, ChromaDB retrieval, and Groq LLM generation."""

    def __init__(self, collection_name: str = DEFAULT_COLLECTION_NAME):
        self.collection_name = collection_name
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.jina_api_key = os.getenv("JINA_API_KEY")
        
        # Groq client
        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None
        
        self._embedder = None
        self._collection = None

        # Setup persistent HTTP session with retry logic for API resilience
        self.http_session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
        self.http_session.mount("https://", HTTPAdapter(max_retries=retries))

    def _get_chroma_client(self):
        chroma_api_key = os.getenv("CHROMA_API_KEY")
        chroma_tenant = os.getenv("CHROMA_TENANT")
        chroma_database = os.getenv("CHROMA_DATABASE")

        if chroma_api_key and chroma_tenant and chroma_database:
            return chromadb.CloudClient(
                api_key=chroma_api_key,
                tenant=chroma_tenant,
                database=chroma_database,
            )
            
        persist_dir = os.path.join(settings.BASE_DIR, "data", "chromadb")
        os.makedirs(persist_dir, exist_ok=True)
        return chromadb.PersistentClient(path=persist_dir)

    @property
    def collection(self):
        if self._collection is None:
            client = self._get_chroma_client()
            self._collection = client.get_or_create_collection(name=self.collection_name)
        return self._collection

    def get_embedding(self, text: str) -> List[float]:
        """Generate a single embedding vector."""
        return self.get_embeddings_batch([text])[0]

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding helper with chunking to avoid payload limits."""
        if not texts:
            return []

        if self.jina_api_key:
            return self._get_jina_embeddings(texts)
        
        return self._get_local_embeddings(texts)

    def _get_jina_embeddings(self, texts: List[str]) -> List[List[float]]:
        # Jina API allows up to 2048 elements per batch, but standardizing chunk sizes prevents timeout errors
        chunk_size = 100 
        all_embeddings = []
        
        for i in range(0, len(texts), chunk_size):
            chunk = texts[i:i + chunk_size]
            response = self.http_session.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.jina_api_key}",
                },
                json={"model": "jina-embeddings-v2-base-en", "input": chunk},
                timeout=30,
            )
            response.raise_for_status() # Let the retry adapter handle transient errors
            all_embeddings.extend([item["embedding"] for item in response.json()["data"]])
            
        return all_embeddings

    def _get_local_embeddings(self, texts: List[str]) -> List[List[float]]:
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer
            # Changed to a 768d model to match Jina's dimensions. 
            # If you stick to MiniLM (384d), ChromaDB will crash on fallback!
            self._embedder = SentenceTransformer("all-mpnet-base-v2") 
        return self._embedder.encode(texts).tolist()

    def query(self, question: str, domain_filter: Optional[str] = None, top_k: int = 3) -> Dict[str, Any]:
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
            "Format your output cleanly using standard Markdown (e.g., ### for headers, * for bullet points, **bold** for emphasis). "
            "Do NOT use HTML tags. "
            "If the answer cannot be determined from context, politely state: "
            "'I can only answer questions related to Bai Finance\'s services, home loans, legal advisory, and operations. Feel free to ask me anything about those!'"
        )

        groq_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        completion = self.groq_client.chat.completions.create(
            model=groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Retrieved Context:\n{context}\n\nUser Question: {question}"},
            ],
            temperature=0.1,
        )

        return {
            "answer": completion.choices[0].message.content,
            "sources": retrieved_docs,
        }

    def ingest_documents(self, documents: List[str], metadatas: List[Dict] = None, ids: List[str] = None):
        """Index or re-index documents into ChromaDB."""
        if not documents:
            return 0

        # Generate deterministic IDs using SHA256 hashes of the text to prevent duplicates
        if ids is None:
            ids = [hashlib.sha256(doc.encode('utf-8')).hexdigest() for doc in documents]

        # Process in batches to respect DB limits (Chroma default max batch is often ~5461)
        batch_size = 500
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            batch_metadatas = metadatas[i:i + batch_size] if metadatas else None
            
            embeddings = self.get_embeddings_batch(batch_docs)

            # upsert handles both insertions and updates safely without crashing on existing IDs
            self.collection.upsert(
                documents=batch_docs,
                embeddings=embeddings,
                metadatas=batch_metadatas,
                ids=batch_ids,
            )
            
        return len(documents)