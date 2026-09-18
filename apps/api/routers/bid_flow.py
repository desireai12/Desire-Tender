import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.db import fetch_all, fetch_one, execute_write

logger = logging.getLogger("bid_flow_router")

router = APIRouter(prefix="/bid-flow", tags=["Bid Flow Pipeline Engine"])

class CreateBidFlowPayload(BaseModel):
    tender_id: str
    tender_title: str
    authority: Optional[str] = None
    state: Optional[str] = None
    estimated_value_cr: Optional[float] = 0.0
    deadline: Optional[str] = None
    document_url: Optional[str] = None
    status: Optional[str] = "Live"
    responsible_person_name: Optional[str] = None
    responsible_person_email: Optional[str] = None
    created_by: Optional[str] = "Scraper Ingestion"

class UpdateBidFlowPayload(BaseModel):
    status: Optional[str] = None
    final_status: Optional[str] = None
    pre_bid_meeting_date: Optional[str] = None
    bid_submission_deadline: Optional[str] = None
    responsible_person_name: Optional[str] = None
    responsible_person_email: Optional[str] = None
    cc_emails: Optional[List[str]] = None
    notes: Optional[str] = None

VALID_STATUSES = [
    "Live",
    "Technical Bid Opening",
    "Financial Bid Opening",
    "Opening in progress",
    "Cancelled"
]

VALID_FINAL_STATUSES = [
    "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10",
    "Matching to L1",
    "DESPL",
    "Rejected-Technical",
    "Technical rejected due to BG"
]

@router.get("")
async def get_all_bid_flows() -> Dict[str, Any]:
    """Retrieve all bid flow records ordered by creation timestamp."""
    try:
        rows = fetch_all("""
            SELECT 
                id, tender_id, tender_title, authority, state, 
                estimated_value_cr, deadline, document_url, status, 
                final_status, pre_bid_meeting_date, bid_submission_deadline, 
                responsible_person_name, responsible_person_email, 
                cc_emails, notes, created_at, updated_at, created_by
            FROM public.bid_flow 
            ORDER BY created_at DESC;
        """)
        # Convert numeric and date fields cleanly to serializable types
        formatted = []
        for r in rows:
            formatted.append({
                "id": str(r["id"]),
                "tender_id": r["tender_id"],
                "tender_title": r["tender_title"],
                "authority": r["authority"] or "",
                "state": r["state"] or "",
                "estimated_value_cr": float(r["estimated_value_cr"] or 0),
                "deadline": r["deadline"] or "",
                "document_url": r["document_url"] or "",
                "status": r["status"] or "Live",
                "final_status": r["final_status"],
                "pre_bid_meeting_date": r["pre_bid_meeting_date"].isoformat() if r["pre_bid_meeting_date"] else None,
                "bid_submission_deadline": r["bid_submission_deadline"].isoformat() if r["bid_submission_deadline"] else None,
                "responsible_person_name": r["responsible_person_name"] or "",
                "responsible_person_email": r["responsible_person_email"] or "",
                "cc_emails": r["cc_emails"] or [],
                "notes": r["notes"] or "",
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
                "created_by": r["created_by"] or ""
            })
        return {"status": "success", "count": len(formatted), "data": formatted}
    except Exception as e:
        logger.error(f"Error getting bid flows: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
async def create_bid_flow(payload: CreateBidFlowPayload) -> Dict[str, Any]:
    """Create a new Bid Flow item from scraper result snapshot."""
    if payload.status and payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    try:
        # Check if already exists in bid_flow
        existing = fetch_one("SELECT id FROM public.bid_flow WHERE tender_id = %s LIMIT 1;", (payload.tender_id,))
        if existing:
            return {
                "status": "exists",
                "message": f"Tender {payload.tender_id} is already in Bid Flow.",
                "id": str(existing["id"])
            }

        insert_query = """
            INSERT INTO public.bid_flow (
                tender_id, tender_title, authority, state,
                estimated_value_cr, deadline, document_url,
                status, responsible_person_name, responsible_person_email,
                created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at;
        """
        # Execute query
        import psycopg2
        from core.config import settings
        conn = psycopg2.connect(settings.DATABASE_URL)
        cur = conn.cursor()
        cur.execute(insert_query, (
            payload.tender_id,
            payload.tender_title,
            payload.authority,
            payload.state,
            payload.estimated_value_cr or 0.0,
            payload.deadline,
            payload.document_url,
            payload.status or "Live",
            payload.responsible_person_name,
            payload.responsible_person_email,
            payload.created_by
        ))
        new_row = cur.fetchone()
        conn.commit()
        new_id = str(new_row[0])
        created_at = new_row[1].isoformat() if new_row[1] else None
        cur.close()
        conn.close()

        return {
            "status": "success",
            "message": f"Tender {payload.tender_id} successfully added to Bid Flow!",
            "id": new_id,
            "created_at": created_at
        }
    except Exception as e:
        logger.error(f"Error creating bid flow item: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{bid_id}")
async def update_bid_flow(bid_id: str, payload: UpdateBidFlowPayload) -> Dict[str, Any]:
    """Update fields of an existing Bid Flow item."""
    if payload.status is not None and payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(VALID_STATUSES)}")

    if payload.final_status is not None and payload.final_status not in VALID_FINAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid final_status '{payload.final_status}'. Must be one of: {', '.join(VALID_FINAL_STATUSES)}")

    updates = []
    params = []

    if payload.status is not None:
        updates.append("status = %s")
        params.append(payload.status)

    if payload.final_status is not None:
        updates.append("final_status = %s")
        params.append(payload.final_status)

    if payload.pre_bid_meeting_date is not None:
        if payload.pre_bid_meeting_date == "":
            updates.append("pre_bid_meeting_date = NULL")
        else:
            updates.append("pre_bid_meeting_date = %s")
            params.append(payload.pre_bid_meeting_date)

    if payload.bid_submission_deadline is not None:
        if payload.bid_submission_deadline == "":
            updates.append("bid_submission_deadline = NULL")
        else:
            updates.append("bid_submission_deadline = %s")
            params.append(payload.bid_submission_deadline)

    if payload.responsible_person_name is not None:
        updates.append("responsible_person_name = %s")
        params.append(payload.responsible_person_name)

    if payload.responsible_person_email is not None:
        updates.append("responsible_person_email = %s")
        params.append(payload.responsible_person_email)

    if payload.cc_emails is not None:
        updates.append("cc_emails = %s")
        params.append(payload.cc_emails)

    if payload.notes is not None:
        updates.append("notes = %s")
        params.append(payload.notes)

    if not updates:
        return {"status": "no_change", "message": "No fields to update."}

    updates.append("updated_at = NOW()")
    params.append(bid_id)

    query = f"UPDATE public.bid_flow SET {', '.join(updates)} WHERE id = %s;"
    success = execute_write(query, tuple(params))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update bid flow record.")

    return {"status": "success", "message": "Bid Flow record updated successfully."}

@router.delete("/{bid_id}")
async def delete_bid_flow(bid_id: str) -> Dict[str, Any]:
    """Delete a Bid Flow item."""
    success = execute_write("DELETE FROM public.bid_flow WHERE id = %s;", (bid_id,))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete bid flow record.")
    return {"status": "success", "message": f"Bid Flow record {bid_id} deleted."}
