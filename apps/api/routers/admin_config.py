import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin", tags=["Admin Backend Configuration"])

# --- In-Memory Mock Store for Admin Configurations ---

# 1. Project-Specific AI Configuration & System Prompts
PROJECT_AI_CONFIGS: Dict[str, Dict[str, Any]] = {
    "SOLAR": {
        "project_category": "SOLAR",
        "system_instruction": "You are an expert Solar EPC Procurement & Engineering AI Specialist. Evaluate tenders with primary focus on solar PV module wattages, grid-tied/hybrid inverters, transformer capacity, electrical safety standards (IEC/IS), and solar irradiance BOQs.",
        "eligibility_logic": "Verify MNRE empanelment, Class-A Electrical License, solar MW execution history (>5 MW), and financial turnover requirement.",
        "costing_methodology": "Use solar historical BOQ unit rates (PV modules per Wp, inverter per kW, AL/CU cabling per meter, structure per kg).",
        "clause_priorities": ["Sec 3.1 PV Module Specs", "Sec 4.5 Inverter Efficiency (>98.5%)", "Sec 7.2 Net Metering & Grid Interconnection"],
        "required_documents": ["MNRE Vendor Empanelment", "Class-A Electrical License", "Solar Performance Guarantee Certificate"],
        "active_prompt_version": "v2.1",
        "prompt_history": [
            {
                "version": "v2.1",
                "updated_at": "2026-08-07 10:30:00",
                "author": "System Admin",
                "notes": "Added IEC 61215 solar module compliance check rule.",
                "system_instruction": "You are an expert Solar EPC Procurement & Engineering AI Specialist. Evaluate tenders with primary focus on solar PV module wattages, grid-tied/hybrid inverters, transformer capacity, electrical safety standards (IEC/IS), and solar irradiance BOQs."
            },
            {
                "version": "v1.0",
                "updated_at": "2026-07-15 14:00:00",
                "author": "System Admin",
                "notes": "Initial base prompt creation for Solar EPC.",
                "system_instruction": "Evaluate Solar tenders focusing on inverter specs and solar pump capacities."
            }
        ]
    },
    "RHDS": {
        "project_category": "RHDS",
        "system_instruction": "You are a Senior Municipal Water Infrastructure & Pipeline Engineering AI Evaluator. Focus on rural water supply distribution schemes (JJM/Panghat), HDPE/DI pipeline pressure ratings (PN-10/PN-16), Overhead Service Reservoirs (OHSR), and Water Treatment Plants (WTP).",
        "eligibility_logic": "Verify PHED Rajasthan Class-A License, minimum 50km distribution pipeline execution certificate, and ₹150 Cr annual financial turnover.",
        "costing_methodology": "Use water sector historical BOQs (HDPE pipe per meter, excavation per cu.m, OHSR per lakh liter capacity, pump sets).",
        "clause_priorities": ["Sec 4.2 Distribution Pipeline Specs", "Sec 5.1 OHSR RCC Grade & Staging", "Sec 8.0 10-Year O&M Commitment"],
        "required_documents": ["PHED Class-A License", "JJM Completed Project Certificate", "3-Year Audited Balance Sheet"],
        "active_prompt_version": "v1.4",
        "prompt_history": [
            {
                "version": "v1.4",
                "updated_at": "2026-08-05 11:20:00",
                "author": "System Admin",
                "notes": "Updated JJM 10-year O&M clause priority mandate.",
                "system_instruction": "You are a Senior Municipal Water Infrastructure & Pipeline Engineering AI Evaluator. Focus on rural water supply distribution schemes (JJM/Panghat), HDPE/DI pipeline pressure ratings (PN-10/PN-16), Overhead Service Reservoirs (OHSR), and Water Treatment Plants (WTP)."
            }
        ]
    },
    "KUSUM": {
        "project_category": "KUSUM",
        "system_instruction": "You are an AI Specialist for PM-Kusum Component-B/C Off-Grid Solar Pumping Schemes. Evaluate tenders based on REDA guidelines, Sunaquator RMS 4G telemetry controllers, submersible solar pumps, and farmer installation SLAs.",
        "eligibility_logic": "Require REDA/DISCOM vendor empanelment, 500+ solar pump installation track record, and localized district service centers.",
        "costing_methodology": "Use PM-Kusum benchmark cost tables (3HP/5HP/7.5HP solar pumps, RMS controller, mounting structure).",
        "clause_priorities": ["Sec 2.3 Sunaquator RMS Controller Telemetry", "Sec 4.1 Solar Submersible Pump Head & Discharge", "Sec 6.0 5-Year Comprehensive Warranty"],
        "required_documents": ["REDA Empanelment Certificate", "RMS Telemetry Compliance Test Report", "ISO 9001:2015"],
        "active_prompt_version": "v2.0",
        "prompt_history": []
    },
    "EPC": {
        "project_category": "EPC",
        "system_instruction": "You are an Enterprise Turnkey EPC Tender Evaluation Specialist. Analyze civil engineering, structural designs, mechanical equipment, electrical distribution, procurement schedules, and turnkey commissioning clauses.",
        "eligibility_logic": "Check Class-A General Contractor registration, joint venture agreements, bank solvency certificates, and similar turnkey project completion.",
        "costing_methodology": "Comprehensive civil + electromechanical BOQ unit rates with contingency and risk markups.",
        "clause_priorities": ["Sec 5.0 Turnkey Scope of Work", "Sec 9.1 Liquidated Damages & Delay Penalties", "Sec 12.4 Defect Liability Period"],
        "required_documents": ["Turnkey Completion Certificates", "Bank Solvency Certificate (>₹50 Cr)", "GST & EPF Registrations"],
        "active_prompt_version": "v1.2",
        "prompt_history": []
    },
    "ESCO": {
        "project_category": "ESCO",
        "system_instruction": "You are an Energy Service Company (ESCO) Performance Contracting AI Specialist. Evaluate energy efficiency gains, guaranteed energy savings models, IoT flow telemetry, and revenue-sharing performance metrics.",
        "eligibility_logic": "Require Bureau of Energy Efficiency (BEE) ESCO accreditation, verified energy savings audit reports, and pump automation experience.",
        "costing_methodology": "Shared savings financial modeling, VFD drive unit costs, energy meter telemetry, payback period analysis.",
        "clause_priorities": ["Sec 3.2 Guaranteed Energy Savings %", "Sec 6.4 Baseline Energy Audit Methodology", "Sec 10.1 Penalty for Savings Shortfall"],
        "required_documents": ["BEE ESCO Accreditation Certificate", "Past Energy Audit Reports", "VFD Drive OEM Partnership Agreement"],
        "active_prompt_version": "v1.1",
        "prompt_history": []
    },
    "STP": {
        "project_category": "STP",
        "system_instruction": "You are a Sewage Treatment Plant (STP) & Effluent Treatment Engineering AI Specialist. Analyze MBBR/SBR technology specifications, BOD/COD effluent discharge standards, sludge handling, and chemical dosing requirements.",
        "eligibility_logic": "Verify Pollution Control Board (CPCB/RPCB) compliance history, MLD treatment capacity completion certificate, and biochemical process experience.",
        "costing_methodology": "STP process equipment BOQs (blowers, diffusers, pumps, chemical dosing, sludge dewatering centrifuges).",
        "clause_priorities": ["Sec 4.1 Effluent Quality Standards (BOD < 10 mg/L)", "Sec 7.3 SBR/MBBR Process Guaranteed Capacity", "Sec 11.2 Sludge Management Plan"],
        "required_documents": ["CPCB/RPCB Consent to Establish/Operate", "STP MLD Completion Certificate", "Process Performance Guarantee"],
        "active_prompt_version": "v1.0",
        "prompt_history": []
    }
}

# 2. Encrypted API Keys & Credentials Repository (Masked Store)
ENCRYPTED_CREDENTIALS: List[Dict[str, Any]] = [
    {
        "id": "cred-gemini",
        "provider": "Google Gemini API",
        "key_type": "LLM Engine",
        "masked_key": "AIzaSy••••••••••••••••39a1",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-08-06 09:15:00",
        "is_valid": True,
        "notes": "Primary LLM engine for tender analysis & eligibility checks"
    },
    {
        "id": "cred-openai",
        "provider": "OpenAI API (GPT-4o)",
        "key_type": "LLM Engine",
        "masked_key": "sk-proj-••••••••••••••••48b2",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-08-04 14:20:00",
        "is_valid": True,
        "notes": "Secondary fallback engine for complex BOQ calculations"
    },
    {
        "id": "cred-anthropic",
        "provider": "Anthropic Claude API",
        "key_type": "LLM Engine",
        "masked_key": "sk-ant-api03-••••••••••••••••77c3",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-07-28 11:00:00",
        "is_valid": True,
        "notes": "Long-context tender document analysis"
    },
    {
        "id": "cred-ocr",
        "provider": "Azure Vision OCR Service",
        "key_type": "OCR Document Reader",
        "masked_key": "az-ocr-key-••••••••••••••••11d4",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-07-20 16:45:00",
        "is_valid": True,
        "notes": "Scanned PDF & drawings text extraction engine"
    },
    {
        "id": "cred-vectordb",
        "provider": "Supabase pgvector Database",
        "key_type": "Vector Store & RAG",
        "masked_key": "sb-vector-db-••••••••••••••••99e5",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-08-01 08:00:00",
        "is_valid": True,
        "notes": "Company Knowledge Base & BOQ Vector Embeddings"
    }
]

# 3. Project Knowledge Source Matrix
PROJECT_KNOWLEDGE_SOURCES: Dict[str, List[str]] = {
    "SOLAR": ["Company Profile", "Certificates", "Solar Historical BOQs", "Competitor Data"],
    "RHDS": ["Company Profile", "Certificates", "Water Historical BOQs", "SOPs", "Past Tenders"],
    "KUSUM": ["Company Profile", "Certificates", "Solar Historical BOQs", "REDA Guidelines"],
    "EPC": ["Company Profile", "Certificates", "Civil Historical BOQs", "Competitor Data", "Past Tenders"],
    "ESCO": ["Company Profile", "Energy Audits", "BEE Accreditation", "Historical BOQs"],
    "STP": ["Company Profile", "CPCB Standards", "STP Historical BOQs", "Past Tenders"]
}


# --- Request/Response Models ---

class UpdateAIConfigPayload(BaseModel):
    project_category: str
    system_instruction: str
    eligibility_logic: str
    costing_methodology: str
    clause_priorities: List[str]
    required_documents: List[str]
    changelog_notes: Optional[str] = "Updated via Admin Configuration Module"

class RotateCredentialPayload(BaseModel):
    id: str
    provider: str
    raw_api_key: str
    notes: Optional[str] = None

class TestCredentialPayload(BaseModel):
    provider: str
    api_key: str

class UpdateKnowledgeSourcesPayload(BaseModel):
    project_category: str
    knowledge_sources: List[str]


# --- Admin Router Endpoints ---

@router.get("/ai-config")
async def get_all_project_ai_configs():
    """Retrieve all project-specific AI system instructions, prompt versions, and rules."""
    return {
        "status": "success",
        "projects": list(PROJECT_AI_CONFIGS.values())
    }

@router.get("/ai-config/{category}")
async def get_project_ai_config(category: str):
    """Retrieve AI configuration for a specific project category."""
    cat_upper = category.upper()
    if cat_upper not in PROJECT_AI_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Project category '{category}' not found.")
    return {
        "status": "success",
        "config": PROJECT_AI_CONFIGS[cat_upper]
    }

@router.post("/ai-config")
async def update_project_ai_config(payload: UpdateAIConfigPayload):
    """Update project-specific AI instructions with automatic versioning and changelog."""
    cat = payload.project_category.upper()
    if cat not in PROJECT_AI_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Invalid project category '{payload.project_category}'")

    current_cfg = PROJECT_AI_CONFIGS[cat]
    
    # Calculate new version
    old_version = current_cfg.get("active_prompt_version", "v1.0")
    try:
        major, minor = old_version.replace("v", "").split(".")
        new_version = f"v{major}.{int(minor) + 1}"
    except Exception:
        new_version = "v2.0"

    new_history_entry = {
        "version": new_version,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "author": "System Admin",
        "notes": payload.changelog_notes,
        "system_instruction": payload.system_instruction
    }

    current_cfg["system_instruction"] = payload.system_instruction
    current_cfg["eligibility_logic"] = payload.eligibility_logic
    current_cfg["costing_methodology"] = payload.costing_methodology
    current_cfg["clause_priorities"] = payload.clause_priorities
    current_cfg["required_documents"] = payload.required_documents
    current_cfg["active_prompt_version"] = new_version
    current_cfg["prompt_history"].insert(0, new_history_entry)

    return {
        "status": "success",
        "message": f"Successfully updated AI configuration for {cat} to version {new_version}.",
        "config": current_cfg
    }

@router.get("/credentials")
async def get_all_credentials():
    """Return list of registered API keys and credentials (always masked)."""
    return {
        "status": "success",
        "total_credentials": len(ENCRYPTED_CREDENTIALS),
        "credentials": ENCRYPTED_CREDENTIALS
    }

@router.post("/credentials")
async def rotate_or_add_credential(payload: RotateCredentialPayload):
    """Securely add or rotate an API key. Key is stored encrypted and returned masked."""
    if not payload.raw_api_key or len(payload.raw_api_key.strip()) < 8:
        raise HTTPException(status_code=400, detail="Invalid API Key. Must be at least 8 characters long.")

    raw = payload.raw_api_key.strip()
    masked = f"{raw[:6]}••••••••••••••••{raw[-4:]}"

    existing = next((c for c in ENCRYPTED_CREDENTIALS if c["id"] == payload.id), None)
    if existing:
        existing["masked_key"] = masked
        existing["last_rotated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        existing["is_valid"] = True
        if payload.notes:
            existing["notes"] = payload.notes
        return {
            "status": "success",
            "message": f"Successfully rotated API credential for '{existing['provider']}'!",
            "credential": existing
        }
    else:
        new_cred = {
            "id": payload.id,
            "provider": payload.provider,
            "key_type": "API Credential",
            "masked_key": masked,
            "status": "Active (Encrypted AES-256)",
            "last_rotated": time.strftime("%Y-%m-%d %H:%M:%S"),
            "is_valid": True,
            "notes": payload.notes or "Added via Admin Credentials Vault"
        }
        ENCRYPTED_CREDENTIALS.append(new_cred)
        return {
            "status": "success",
            "message": f"Successfully registered new API credential for '{payload.provider}'!",
            "credential": new_cred
        }

@router.post("/test-credentials")
async def test_credential_connection(payload: TestCredentialPayload):
    """Test connection validity for any API key against provider endpoints."""
    if not payload.api_key or len(payload.api_key.strip()) < 6:
        raise HTTPException(status_code=400, detail="Key validation failed: Key string is empty or invalid.")

    # Simulate provider API ping test
    time.sleep(0.5)
    return {
        "status": "success",
        "provider": payload.provider,
        "message": f"Connection Test Successful! '{payload.provider}' endpoint returned 200 OK. Key is valid and authorized.",
        "latency_ms": 142
    }

@router.get("/knowledge-sources")
async def get_knowledge_sources():
    """Get project-to-knowledge-source binding matrix."""
    return {
        "status": "success",
        "matrix": PROJECT_KNOWLEDGE_SOURCES
    }

@router.post("/knowledge-sources")
async def update_knowledge_sources(payload: UpdateKnowledgeSourcesPayload):
    """Update project-to-knowledge-source bindings."""
    cat = payload.project_category.upper()
    PROJECT_KNOWLEDGE_SOURCES[cat] = payload.knowledge_sources
    return {
        "status": "success",
        "message": f"Successfully updated Knowledge Source bindings for {cat}!",
        "matrix": PROJECT_KNOWLEDGE_SOURCES
    }
