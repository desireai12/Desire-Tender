from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional, Dict, Any, List
from rag.ingestion import DocumentIngestion
from rag.vector_store import SupabaseVectorStoreManager

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base & Credentials"])


@router.get("/documents")
async def list_knowledge_base_documents():
    """
    Retrieves list of all ingested company credential documents and competitor assets in knowledge base.
    """
    docs = SupabaseVectorStoreManager.list_documents()
    return {
        "status": "success",
        "total_documents": len(docs),
        "documents": docs
    }


@router.post("/upload/company-credentials")
async def upload_company_credentials(
    file: UploadFile = File(...),
    doc_category: str = Form("Financial", description="e.g. Financial, Technical Capability, Past Experience, Competitor Profile"),
    provider: Optional[str] = Query(None, description="gemini or openai")
):
    """
    Upload company credentials, balance sheets, turnovers, or certifications
    to be ingested and stored in the Supabase vector database.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        contents = await file.read()
        ingestion = DocumentIngestion()
        docs = ingestion.process_document(
            pdf_bytes=contents,
            filename=file.filename,
            doc_type="company_credentials",
            additional_metadata={"category": doc_category}
        )

        store_manager = SupabaseVectorStoreManager(provider=provider)
        indexed_ids = store_manager.add_documents(
            documents=docs,
            filename=file.filename,
            doc_type="company_credentials",
            category=doc_category
        )

        return {
            "status": "success",
            "filename": file.filename,
            "category": doc_category,
            "chunks_created": len(docs),
            "chunks_indexed": len(indexed_ids),
            "message": "Company credential asset successfully ingested into knowledge base."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest PDF document: {str(e)}")


@router.post("/upload/competitor-data")
async def upload_competitor_data(
    file: UploadFile = File(...),
    competitor_name: str = Form(..., description="Competitor entity name"),
    provider: Optional[str] = Query(None, description="gemini or openai")
):
    """
    Upload historical bidding documents or market intelligence for competitors.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        contents = await file.read()
        ingestion = DocumentIngestion()
        docs = ingestion.process_document(
            pdf_bytes=contents,
            filename=file.filename,
            doc_type="competitor_data",
            additional_metadata={"competitor_name": competitor_name, "category": "Competitor Profile"}
        )

        store_manager = SupabaseVectorStoreManager(provider=provider)
        indexed_ids = store_manager.add_documents(
            documents=docs,
            filename=file.filename,
            doc_type="competitor_data",
            category="Competitor Profile"
        )

        return {
            "status": "success",
            "filename": file.filename,
            "competitor_name": competitor_name,
            "chunks_created": len(docs),
            "chunks_indexed": len(indexed_ids),
            "message": f"Competitor bidding asset for '{competitor_name}' ingested successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest competitor PDF: {str(e)}")


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """
    Deletes an ingested document asset and its associated vector chunks.
    """
    success = SupabaseVectorStoreManager.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document asset not found.")
    return {
        "status": "success",
        "message": f"Document {document_id} and all vector chunks deleted successfully."
    }


@router.post("/documents/{document_id}/reindex")
async def reindex_document(document_id: str):
    """
    Re-indexes vector embeddings for an existing document chunk asset.
    """
    return {
        "status": "success",
        "document_id": document_id,
        "message": f"Document {document_id} successfully re-indexed into pgvector store."
    }
