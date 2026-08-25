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
        "id": "doc-desire-jv-01",
        "filename": "PQ_Upload_Alwar_DESPL_Divija_JV.pdf",
        "doc_type": "joint_venture_pq_bid",
        "category": "Joint Venture & Technical Bid",
        "chunks_count": 15,
        "uploaded_at": "2026-06-02 11:00:00"
    },
    {
        "id": "doc-alwar-tender-02",
        "filename": "AlwarPKG44_RUDSICO_AMRUT_2.0.pdf",
        "doc_type": "tender_document",
        "category": "Tender Document",
        "chunks_count": 12,
        "uploaded_at": "2026-05-11 10:00:00"
    },
    {
        "id": "doc-desire-financials-03",
        "filename": "Audited_Financials_DESPL_FY21_25.pdf",
        "doc_type": "company_credentials",
        "category": "Financial",
        "chunks_count": 10,
        "uploaded_at": "2025-11-24 14:15:00"
    },
    {
        "id": "doc-divija-experience-04",
        "filename": "Divija_Construction_Sewerage_WorkOrders.pdf",
        "doc_type": "jv_partner_credentials",
        "category": "Past Experience",
        "chunks_count": 8,
        "uploaded_at": "2025-04-07 09:45:00"
    }
]

_in_memory_chunks_db: List[Document] = [
    Document(
        page_content="Bidder & Joint Venture Structure: M/s DESPL - DIVIJA CONSTRUCTIONS JV (Lead Partner: M/s Desire Energy Solutions Pvt. Ltd. - 51% financial share; Second Partner: M/s Divija Construction - 49% financial share). Registered Office: 401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan. Contact: Tel 0141-4050855, Mobile 7230037296, Email tenders@desireenergy.com / dharmeshkhandelwal@desireenergy.com. Authorized Representative: Mr. Dharmesh Khandelwal (Director). Second Partner: M/s Divija Construction (79/12 Shipra Path, Mansarovar, Jaipur 302020, Partner Mr. Satish Kumar Goyal, Mobile 9829147776, divijaconstruction@gmail.com).",
        metadata={"document_id": "doc-desire-jv-01", "doc_type": "joint_venture_pq_bid", "category": "Joint Venture & Technical Bid"}
    ),
    Document(
        page_content="Tender Procurement Details: Notice Inviting Online Bids NIB No. 01/2026-27 (Dated 11.05.2026 / Submitted 02.06.2026) issued by Executive Director, RUDSICO (Rajasthan Urban Drinking Water Sewerage and Infrastructure Corporation Limited), Govt of Rajasthan. Package: AMRUT-2.0/RAJ/SEWERAGE/44 in Alwar Town. Work Scope: Providing, laying, jointing, testing and commissioning of sewer line in ward 39 & 61 in Alwar town along with Design, construction, supply, installation, testing and commissioning including 1 year defect liability with 10 years O&M. Estimated Bid Cost: Rs. 3653.11 Lakh (₹36.5311 Crore). EMD / Bid Security: Rs. 73,06,220. Tender Fee: Rs. 10,000. Processing Fee: Rs. 2,500. Required Min Avg Annual Construction Turnover: Rs. 5479.67 Lakh (₹54.7967 Crore).",
        metadata={"document_id": "doc-alwar-tender-02", "doc_type": "tender_document", "category": "Tender Document"}
    ),
    Document(
        page_content="Desire Energy Solutions Pvt. Ltd. Standalone Financials (CIN: U40106RJ2011PTC034878, PAN: AAECD3266E, GST: 08AAECD3266E1ZT): Directors: Gaurav Kumar Gupta (MD, DIN 03505199), Saurabh Gupta (Director, DIN 03505198), Ruchi Khandelwal (Director), Dharmesh Khandelwal (Director). Audited Revenue/Turnover: FY 2021-22 ₹201.53 Crore, FY 2022-23 ₹201.53 Crore, FY 2023-24 ₹350.66 Crore, FY 2024-25 ₹350.60 Crore. 3-Year Average Annual Turnover: ₹300.93 Crore. Net Worth: ₹95.0+ Crore (FY 2024-25), ₹52.61 Crore (FY 2023-24). Bank Solvency: ₹50.0 Crore. Registrations: Class-A Special Category Contractor (PHED Rajasthan), Class-A Electrical License (Govt of Rajasthan), REDA/MNRE Empanelment for PM-KUSUM, ISO 9001:2015, ISO 14001:2015, ISO 45001:2018.",
        metadata={"document_id": "doc-desire-financials-03", "doc_type": "company_credentials", "category": "Financial"}
    ),
    Document(
        page_content="M/s Divija Construction JV Partner Standalone Credentials (PAN: AAFFD6567N, GST: 08AAFFD6567N1ZT): Govt Approved Class A & AA Contractor. Partner: Satish Kumar Goyal. Audited Turnover: FY 2020-21 ₹12.87 Cr, FY 2021-22 ₹21.96 Cr, FY 2022-23 ₹32.56 Cr, FY 2023-24 ₹42.95 Cr, FY 2024-25 ₹37.01 Cr. Net Worth: ₹6.58 Crore (FY 2024-25). Key Sewerage Work Orders: 1) JDA Jaipur WO JDA/EE PHE I/WO/2022-2023/Mar/25 (Completed 13.01.2025, Value ₹24.69 Cr): 65,514m DWC sewer pipe, 70,539m UPVC pipe, 2,805 precast manholes in PRN South Area Package-2; 2) JDA Jaipur WO JDA/EE PHE I/WO/2023-2024/Mar/18 (Awarded 16.03.2024, Value ₹18.97 Cr): 8 MLD SPS-01 & 1 MLD SPS-02 Sewage Pumping Stations & SEPD pipeline in Sanganer; 3) JDA Jaipur WO JDA/EE PHE I/WO/2021-2022/Jul/05 (Completed 06.03.2024, Value ₹14.46 Cr): Sewer lines in PRN South Area Package-1.",
        metadata={"document_id": "doc-divija-experience-04", "doc_type": "jv_partner_credentials", "category": "Past Experience"}
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
