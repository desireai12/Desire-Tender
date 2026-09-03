from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import sys

# Add root directory to sys.path so we can import scripts.fetch_govt_tenders
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from scripts.fetch_govt_tenders import (
    GePNICGovtFetcher,
    update_tracker_json,
    STATE_PORTALS,
    KEYWORD_CATEGORIES
)

router = APIRouter(prefix="/scraper", tags=["Government Portals Scraper"])

class ScanRequest(BaseModel):
    states: List[str] = Field(default=["Rajasthan", "Haryana"], description="State portals to scan")
    keywords: List[str] = Field(default=["Solar", "STP", "Water Supply", "Sewerage"], description="Keywords to query")
    min_value_cr: float = Field(default=10.0, description="Minimum tender value threshold in ₹ Crores (default: 10 Cr)")
    max_per_kw: int = Field(default=8, description="Max tenders to inspect per keyword per portal")
    auto_update_tracker: bool = Field(default=True, description="Whether to merge newly discovered tenders into tracker")

@router.get("/config")
def get_scraper_config():
    """Returns available government portals, keyword categories, and default filters."""
    flat_keywords = []
    for cat, kws in KEYWORD_CATEGORIES.items():
        flat_keywords.extend(kws)
    unique_kws = sorted(list(set(flat_keywords)))

    return {
        "status": "online",
        "default_min_value_cr": 10.0,
        "available_portals": list(STATE_PORTALS.keys()),
        "keyword_categories": KEYWORD_CATEGORIES,
        "all_keywords": unique_kws
    }

@router.post("/scan")
def run_live_portal_scan(req: ScanRequest):
    """Executes live GePNIC portal search, parses values, and filters >= min_value_cr."""
    fetcher = GePNICGovtFetcher()
    all_discovered = []

    for state in req.states:
        portal_url = STATE_PORTALS.get(state)
        if not portal_url:
            continue
        try:
            tenders = fetcher.fetch_portal_tenders(
                state_name=state,
                portal_url=portal_url,
                keywords=req.keywords,
                min_value_cr=req.min_value_cr,
                max_tenders_per_kw=req.max_per_kw
            )
            all_discovered.extend(tenders)
        except Exception as e:
            print(f"Error scanning {state}: {e}")

    added_to_tracker = 0
    if req.auto_update_tracker and all_discovered:
        added_to_tracker = update_tracker_json(all_discovered)

    return {
        "success": True,
        "states_scanned": req.states,
        "keywords_searched": req.keywords,
        "min_value_cr_filter": req.min_value_cr,
        "total_matches_found": len(all_discovered),
        "added_to_tracker_count": added_to_tracker,
        "tenders": all_discovered
    }
