from typing import List, Optional, Dict, Any
import uuid
import datetime
from langchain_core.documents import Document
from langchain_postgres import PGVector
from core.config import settings
from core.llm_factory import LLMFactory

# In-Memory Store Fallback for Document Management
_in_memory_docs_db: List[Dict[str, Any]] = [
    {
        "id": "doc-desire-01",
        "filename": "Desire_Energy_Corporate_Credentials_2026.pdf",
        "doc_type": "company_credentials",
        "category": "Company Profile",
        "chunks_count": 8,
        "uploaded_at": "2026-08-01 10:00:00"
    },
    {
        "id": "doc-desire-02",
        "filename": "Audited_Financials_Turnover_FY23_25.pdf",
        "doc_type": "company_credentials",
        "category": "Financial",
        "chunks_count": 6,
        "uploaded_at": "2026-08-02 11:30:00"
    },
    {
        "id": "doc-desire-03",
        "filename": "Jal_Jeevan_Mission_100k_Villages_Completion.pdf",
        "doc_type": "company_credentials",
        "category": "Past Experience",
        "chunks_count": 12,
        "uploaded_at": "2026-08-03 14:15:00"
    },
    {
        "id": "doc-desire-04",
        "filename": "AquaLogix_IoT_AI_Telemetry_Architecture.pdf",
        "doc_type": "company_credentials",
        "category": "Technical Capability",
        "chunks_count": 10,
        "uploaded_at": "2026-08-04 09:45:00"
    }
]

_in_memory_chunks_db: List[Document] = [
    Document(
        page_content="Desire Energy Solutions Pvt. Ltd., headquartered in Jaipur (Rajasthan), is a nationally recognized water infrastructure technology company managing water supply operations across 1,00,000+ villages and 14+ cities in India. Core models include ESCO energy efficiency, Smart EPC, Decentralized Water Management (DWM), Operations & Maintenance (O&M), and AquaLogix IoT/AI telemetry.",
        metadata={"document_id": "doc-desire-01", "doc_type": "company_credentials", "category": "Company Profile"}
    ),
    Document(
        page_content="Flagship Program Experience: Key aggregator and executor under Jal Jeevan Mission (JJM), PM-Kusum (Solar Pumping), and Panghat Yojana. Products: Aqualogix Smart Water Meter, Aqualogix Automation Solution, Sunaquator Solar Pump Controller. Workforce: 2,000+ deployed professionals.",
        metadata={"document_id": "doc-desire-01", "doc_type": "company_credentials", "category": "Past Experience"}
    ),
    Document(
        page_content="Executive Leadership & Operations: Gaurav Kumar Gupta (Founder & MD, 2011), Saurabh Gupta (Director, Solar & DWM), Suraj Khandelwal (Director, ESCO & EPC), Ruchi Gupta (Director, Strategy & Culture, CFA), Dharmesh Khandelwal (GM AquaLogix, Nirma/PennState), Honey Gupta (DGM RO/EPC), Ankit Purohit (COO, B.Tech IIT Roorkee, MBA SPJIMR), Sandesh Saxena (Sr Mgr PPC, MS Kingston London), Mohit Modi (AGM Purchase, TUV Auditor), Deepak Khandelwal (GM Finance), Prashant Mishra (CTO, B.Tech ECE).",
        metadata={"document_id": "doc-desire-01", "doc_type": "company_credentials", "category": "Technical Capability"}
    ),
    Document(
        page_content="Desire Energy Financial Standing: Annual Turnover ₹285 Crore (FY 2024-2025), Net Worth ₹78 Crore, Solvency Certificate ₹50 Crore. Valid ISO 9001:2015, ISO 14001:2015, and ISO 45001:2018 certifications.",
        metadata={"document_id": "doc-desire-02", "doc_type": "company_credentials", "category": "Financial"}
    )
]


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
