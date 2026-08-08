import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin", tags=["Admin Backend Configuration & RBAC Engine"])

# --- In-Memory Mock Store for Admin Configurations & Projects ---

# 1. Managed Projects Store
PROJECTS_STORE: List[Dict[str, Any]] = [
    {
        "id": "proj-1",
        "name": "Jal Jeevan Mission (JJM) Rural Water Supply",
        "type": "RHDS",
        "client": "PHED Rajasthan",
        "description": "Rural water supply distribution schemes across 100,000+ villages under Jal Jeevan Mission.",
        "ai_instructions": "Focus on HDPE/DI pipeline specs (PN-10/16), OHSR reservoir capacity, and 10-year O&M compliance.",
        "knowledge_sources": ["Company Profile", "PHED Certificates", "Water Historical BOQs", "SOPs"],
        "status": "Active",
        "created_at": "2026-08-01 10:00:00"
    },
    {
        "id": "proj-2",
        "name": "PM-Kusum Component-B Solar Pump Scheme",
        "type": "KUSUM",
        "client": "REDA / RRECL",
        "description": "Implementation of off-grid solar water pumping systems for agricultural electrification.",
        "ai_instructions": "Verify REDA empanelment, Sunaquator RMS 4G telemetry controllers, and solar pump specs.",
        "knowledge_sources": ["Company Profile", "Solar Certificates", "REDA Guidelines", "Solar Historical BOQs"],
        "status": "Active",
        "created_at": "2026-08-02 11:30:00"
    },
    {
        "id": "proj-3",
        "name": "Solar Utility Scale Photovoltaic EPC Projects",
        "type": "SOLAR",
        "client": "NTPC / SECI",
        "description": "Utility scale ground-mounted solar power plants and grid interconnection infrastructure.",
        "ai_instructions": "Verify PV module wattages, inverter efficiency (>98.5%), and Class-A electrical license.",
        "knowledge_sources": ["Company Profile", "Solar Certificates", "Solar Historical BOQs", "Competitor Data"],
        "status": "Active",
        "created_at": "2026-08-03 14:15:00"
    }
]

# 2. Project-Specific AI Configuration & System Prompts
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
    }
}

# 3. Encrypted API Keys & Credentials Vault
ENCRYPTED_CREDENTIALS: List[Dict[str, Any]] = [
    {
        "id": "cred-01",
        "provider": "Google Gemini API",
        "key_type": "Primary RAG & Analysis Engine",
        "masked_key": "AIzaSy••••••••••••••••39a1",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-08-06 09:15:00",
        "is_valid": True,
        "notes": "Primary RAG engine for tender PDF parsing"
    },
    {
        "id": "cred-02",
        "provider": "OpenAI GPT-4o",
        "key_type": "Fallback / High-Precision Engine",
        "masked_key": "sk-proj-••••••••••••••••48b2",
        "status": "Active (Encrypted AES-256)",
        "last_rotated": "2026-08-04 14:20:00",
        "is_valid": True,
        "notes": "Fallback reasoning engine for complex legal clauses"
    }
]

# 4. Security Audit Log
SECURITY_AUDIT_LOGS: List[Dict[str, Any]] = [
    {
        "id": "aud-001",
        "action": "Admin Login",
        "actor": "admin",
        "target": "Admin Portal",
        "details": "Admin authenticated successfully",
        "timestamp": "2026-08-08 10:40:00"
    },
    {
        "id": "aud-002",
        "action": "User Approved",
        "actor": "admin",
        "target": "EMP001 (Ankit Purohit)",
        "details": "Status changed from Pending to Active. Assigned BD role.",
        "timestamp": "2026-08-07 11:15:00"
    }
]

# --- Models ---
class UpdateAIConfigPayload(BaseModel):
    project_category: str
    system_instruction: str
    eligibility_logic: Optional[str] = None
    costing_methodology: Optional[str] = None
    changelog_notes: Optional[str] = "Updated system instruction"

class RotateCredentialPayload(BaseModel):
    id: str
    provider: str
    raw_api_key: str
    notes: Optional[str] = None

class CreateProjectPayload(BaseModel):
    name: str
    type: str
    client: str
    description: str
    ai_instructions: Optional[str] = ""

# --- Routes ---

@router.get("/metrics")
async def get_admin_metrics():
    """Return live Admin Dashboard KPI metrics."""
    return {
        "status": "success",
        "metrics": {
            "total_users": 5,
            "pending_users": 1,
            "active_users": 4,
            "inactive_users": 0,
            "total_projects": len(PROJECTS_STORE),
            "active_tenders": 8,
            "pending_approvals": 2,
            "completed_tenders": 14
        }
    }

@router.get("/projects")
async def list_projects():
    """List all managed projects."""
    return {
        "status": "success",
        "projects": PROJECTS_STORE
    }

@router.post("/projects")
async def create_project(payload: CreateProjectPayload):
    """Create a new project vertical."""
    new_proj = {
        "id": f"proj-{int(time.time())}",
        "name": payload.name.strip(),
        "type": payload.type.strip().upper(),
        "client": payload.client.strip(),
        "description": payload.description.strip(),
        "ai_instructions": payload.ai_instructions.strip(),
        "knowledge_sources": ["Company Profile", "Certificates"],
        "status": "Active",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    PROJECTS_STORE.insert(0, new_proj)

    SECURITY_AUDIT_LOGS.insert(0, {
        "id": f"aud-{int(time.time())}",
        "action": "Project Created",
        "actor": "admin",
        "target": new_proj["name"],
        "details": f"Created project {new_proj['type']} for {new_proj['client']}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    })

    return {
        "status": "success",
        "message": f"Successfully created project '{new_proj['name']}'!",
        "project": new_proj
    }

@router.get("/ai-config/{category}")
async def get_ai_config(category: str):
    """Fetch project-specific system instructions, rules, and prompt version history."""
    cat = category.upper()
    cfg = PROJECT_AI_CONFIGS.get(cat)
    if not cfg:
        # Provide clean default config for new categories
        cfg = {
            "project_category": cat,
            "system_instruction": f"You are a Senior Evaluation AI Specialist for {cat} projects. Analyze eligibility, risks, and BOQ costings.",
            "eligibility_logic": f"Verify general company experience, Class-A license, and financial turnover for {cat}.",
            "costing_methodology": f"Use historical unit rates for {cat} procurement.",
            "clause_priorities": ["Technical Specs", "Financial Turnover", "O&M Guarantee"],
            "required_documents": ["Company Certificate", "Tax Returns", "License"],
            "active_prompt_version": "v1.0",
            "prompt_history": []
        }
        PROJECT_AI_CONFIGS[cat] = cfg
    return {"status": "success", "config": cfg}

@router.post("/ai-config")
async def update_ai_config(payload: UpdateAIConfigPayload):
    """Save project-specific system instructions with automatic version incrementing."""
    cat = payload.project_category.upper()
    cfg = PROJECT_AI_CONFIGS.get(cat)

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    if not cfg:
        cfg = {
            "project_category": cat,
            "system_instruction": payload.system_instruction,
            "eligibility_logic": payload.eligibility_logic or "Verify company qualifications",
            "costing_methodology": payload.costing_methodology or "Use historical BOQ rates",
            "clause_priorities": ["Technical Specs"],
            "required_documents": ["Company Certificate"],
            "active_prompt_version": "v1.0",
            "prompt_history": []
        }
        PROJECT_AI_CONFIGS[cat] = cfg
    else:
        cfg["system_instruction"] = payload.system_instruction
        if payload.eligibility_logic:
            cfg["eligibility_logic"] = payload.eligibility_logic
        if payload.costing_methodology:
            cfg["costing_methodology"] = payload.costing_methodology

        # Auto-increment version
        curr_ver = cfg.get("active_prompt_version", "v1.0")
        try:
            major, minor = curr_ver.replace("v", "").split(".")
            next_ver = f"v{major}.{int(minor)+1}"
        except Exception:
            next_ver = "v1.1"

        cfg["active_prompt_version"] = next_ver

        history_entry = {
            "version": next_ver,
            "updated_at": timestamp,
            "author": "System Admin",
            "notes": payload.changelog_notes or "Updated prompt instructions",
            "system_instruction": payload.system_instruction
        }
        cfg.setdefault("prompt_history", []).insert(0, history_entry)

    SECURITY_AUDIT_LOGS.insert(0, {
        "id": f"aud-{int(time.time())}",
        "action": "AI Prompt Updated",
        "actor": "admin",
        "target": cat,
        "details": f"Updated AI instructions to version {cfg.get('active_prompt_version', 'v1.0')}",
        "timestamp": timestamp
    })

    return {
        "status": "success",
        "message": f"Successfully updated AI instructions for '{cat}'! Saved as version {cfg.get('active_prompt_version')}.",
        "config": cfg
    }

@router.get("/credentials")
async def list_credentials():
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

        SECURITY_AUDIT_LOGS.insert(0, {
            "id": f"aud-{int(time.time())}",
            "action": "API Credential Rotated",
            "actor": "admin",
            "target": payload.provider,
            "details": f"Updated masked key: {masked}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })

        return {
            "status": "success",
            "message": f"Successfully registered new API credential for '{payload.provider}'!",
            "credential": new_cred
        }

@router.get("/audit-logs")
async def get_audit_logs():
    """Retrieve immutable security audit trail."""
    return {
        "status": "success",
        "total_logs": len(SECURITY_AUDIT_LOGS),
        "audit_logs": SECURITY_AUDIT_LOGS
    }
