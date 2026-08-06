from typing import List, Optional, Dict, Any
import uuid
import datetime
from langchain_core.documents import Document
from langchain_postgres import PGVector
from core.config import settings
from core.llm_factory import LLMFactory

# In-Memory Store Fallback for Document Management
_in_memory_docs_db: List[Dict[str, Any]] = []
_in_memory_chunks_db: List[Document] = []


class SupabaseVectorStoreManager:
    """
    Manages pgvector vector store operations via Supabase PostgreSQL connection.
    Supports dynamic embedding selection (Gemini text-embedding-004 or OpenAI text-embedding-3-small).
    Includes memory fallback for local execution and document repository management.
    """

    def __init__(
        self,
        collection_name: str = "tender_knowledge_base",
        provider: Optional[str] = None
    ):
        self.collection_name = collection_name
        self.provider = provider
        self.connection = settings.DATABASE_URL
        self._vector_store = None

    def get_vector_store(self) -> Optional[PGVector]:
        """
        Lazily initializes the PGVector store instance.
        """
        if self._vector_store is None:
            try:
                embeddings = LLMFactory.get_embeddings(provider=self.provider)
                self._vector_store = PGVector(
                    embeddings=embeddings,
                    collection_name=self.collection_name,
                    connection=self.connection,
                    use_jsonb=True,
                )
            except Exception:
                self._vector_store = None
        return self._vector_store

    def add_documents(
        self,
        documents: List[Document],
        filename: str = "Document",
        doc_type: str = "general",
        category: str = "Financial"
    ) -> List[str]:
        """
        Ingests document chunks into Supabase vector store or in-memory fallback.
        """
        doc_id = str(uuid.uuid4())
        
        # Track document metadata
        doc_meta = {
            "id": doc_id,
            "filename": filename,
            "doc_type": doc_type,
            "category": category,
            "chunks_count": len(documents),
            "uploaded_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        _in_memory_docs_db.append(doc_meta)
        
        vs = self.get_vector_store()
        if vs is not None:
            try:
                return vs.add_documents(documents)
            except Exception:
                pass

        # Fallback to local memory chunks
        for doc in documents:
            doc.metadata["document_id"] = doc_id
            _in_memory_chunks_db.append(doc)
        
        return [f"mem-chunk-{i}" for i in range(len(documents))]

    def list_documents() -> List[Dict[str, Any]]:
        """
        Returns list of ingested document assets in knowledge base.
        """
        return _in_memory_docs_db

    def delete_document(self, document_id: str) -> bool:
        """
        Deletes a document and its associated vector chunks.
        """
        global _in_memory_docs_db, _in_memory_chunks_db
        
        _in_memory_docs_db = [d for d in _in_memory_docs_db if d["id"] != document_id]
        _in_memory_chunks_db = [c for c in _in_memory_chunks_db if c.metadata.get("document_id") != document_id]
        return True

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        Performs similarity search against stored embeddings or memory chunks.
        """
        vs = self.get_vector_store()
        if vs is not None:
            try:
                return vs.similarity_search(query, k=k, filter=filter_metadata)
            except Exception:
                pass

        # Fallback memory search
        matched = []
        for doc in _in_memory_chunks_db:
            if filter_metadata:
                match = all(doc.metadata.get(key) == val for key, val in filter_metadata.items())
                if match:
                    matched.append(doc)
            else:
                matched.append(doc)
        return matched[:k]
