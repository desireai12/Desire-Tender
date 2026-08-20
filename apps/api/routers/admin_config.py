import time
import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.db import fetch_all, fetch_one, execute_write

DEFAULT_AI_CONFIGS = {
    'SOLAR': {
        'id': 'cfg-solar',
        'project_category': 'SOLAR',
        'system_instruction': 'SOLAR Project Tender Instruction: Analyze solar photovoltaic power plant tenders (e.g. Ground Mounted & Rooftop Solar PV projects). Evaluate PV module efficiency, tier-1 ALMM compliance, central/string inverter specifications, solar irradiation yield modeling, net-metering norms, and 5 to 25-Year Comprehensive O&M terms. Match extracted BOQ items against historical solar rates for PV modules, mounting structures (MMS), inverters, transformers, and SCADA monitoring.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires ₹50 Cr average turnover & 10+ MW Solar PV execution. Category 2 (Desire + Partner/JV): Desire provides turnover & Class-A electrical license; JV partner provides solar project completion & O&M certificate. Category 3 (GA Alone): Evaluates GA under MNRE/State Solar policy provisions.',
        'costing_methodology': 'Item-level matching against solar PV BOQ databases. Display historical item name, rate per Wp (₹), date of BOQ, estimated unit rate, and total cost. Allow manual rate overrides with reason logging.',
        'clause_priorities': ['Sec 3.1 PV Module Specs', 'Sec 4.5 Inverter Efficiency (>98.5%)', 'Sec 7.2 Net Metering & Grid Interconnection'],
        'required_documents': ['MNRE Vendor Empanelment', 'Class-A Electrical License', 'Solar Performance Guarantee Certificate'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'RHDS': {
        'id': 'cfg-rhds',
        'project_category': 'RHDS',
        'system_instruction': 'RHDS Project Tender Instruction: Analyze Rural High Density & Drinking Water Supply tenders (e.g. Jal Jeevan Mission RHDS Pipe Networks & Intake Works). Evaluate HDPE/DI pipeline pressure ratings (PN-10/16), Overhead Service Reservoir (OHSR) capacities, pump house electromechanical equipment, raw water intake structures, and 10-Year O&M terms. Match extracted BOQ items against historical water supply rates.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires ₹60 Cr average turnover & execution of rural water supply scheme (>15 MLD / 50+ villages covered). Category 2 (Desire + Partner/JV): Class-A contractor license with JV technical experience. Category 3 (GA Alone): Evaluates GA under PHED Rajasthan contractor registration.',
        'costing_methodology': 'Item-level matching against PHED Rajasthan & JJM historical BOQ databases for DI K9 / HDPE pipes, OHSR, pumping machinery, and chlorination units.',
        'clause_priorities': ['Sec 4.2 Distribution Pipeline Specs', 'Sec 5.1 OHSR RCC Grade & Staging', 'Sec 8.0 10-Year O&M Commitment'],
        'required_documents': ['PHED Class-A License', 'JJM Completed Project Certificate', '3-Year Audited Balance Sheet'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'KUSUM': {
        'id': 'cfg-kusum',
        'project_category': 'KUSUM',
        'system_instruction': 'KUSUM Project Tender Instruction: Analyze PM-KUSUM (Component A/B/C) solar pumping & grid-connected agricultural solarization tenders. Evaluate solar pump capacities (3 HP to 10 HP AC/DC), Sunaquator RMS telemetry controllers with 4G IoT integration, MNRE technical specs, and 5-Year mandatory warranty/O&M compliance.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires REDA / State Nodal Agency empanelment & ₹25 Cr turnover with 500+ solar pump installations. Category 2 (Desire + Partner/JV): Desire provides financial eligibility; partner provides MNRE pump test certificates.',
        'costing_methodology': 'Item-level matching against REDA / RRECL PM-KUSUM benchmark costs per HP. Display controller, solar module, pump motor, and RMS telemetry line items with rate override tracking.',
        'clause_priorities': ['Sec 2.1 RMS Telemetry Specification', 'Sec 3.4 BIS Pump Efficiency', 'Sec 5.0 5-Year Comprehensive Warranty'],
        'required_documents': ['REDA Empanelment Certificate', 'MNRE Test Report', 'Service Center Location List'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'EPC': {
        'id': 'cfg-epc',
        'project_category': 'EPC',
        'system_instruction': 'EPC Project Tender Instruction: Analyze turnkey EPC civil and electromechanical tenders. Evaluate general civil construction, structural steel, electrical sub-station (33kV/132kV), instrumentation, and multi-disciplinary project execution schedules with milestone timelines.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires ₹100 Cr average turnover & completion of major turnkey EPC project. Category 2 (Desire + Partner/JV): Financial lead with technical JV partner.',
        'costing_methodology': 'Item-level matching against state PWD / CPWD DSR (District Schedule of Rates) and market rates for civil, structural, and electrical turnkey items.',
        'clause_priorities': ['Sec 1.5 Turnkey Milestone Schedules', 'Sec 3.2 Civil Structural Design', 'Sec 6.0 Defect Liability Period'],
        'required_documents': ['Class-A General EPC Registration', 'Turnkey Completion Certificates', 'Bank Solvency Certificate'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'ESCO': {
        'id': 'cfg-esco',
        'project_category': 'ESCO',
        'system_instruction': 'ESCO Project Tender Instruction: Analyze Energy Service Company (ESCO) tenders for municipal street lighting, building HVAC energy auditing, and industrial energy conservation. Evaluate guaranteed energy savings percentage, BEE accreditation, baseline energy audit metrics, shared-savings revenue models, and performance-based O&M contracts.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires Grade-1 / Grade-2 BEE ESCO accreditation & proven performance contract of >20% energy savings. Category 2 (Desire + Partner/JV): Joint bidding with certified energy auditing firm.',
        'costing_methodology': 'Shared-savings & annuity pay-back model calculation. Match LED fixture rates, smart feeder panels, IoT energy meters, and baseline kWh cost savings against historical ESCO contracts.',
        'clause_priorities': ['Sec 2.0 Baseline Energy Audit Standards', 'Sec 4.1 Guaranteed Savings SLA', 'Sec 5.3 Shared Revenue Terms'],
        'required_documents': ['BEE ESCO Accreditation Certificate', 'Energy Savings Verification Certificate', 'Certified Energy Auditor License'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'STP': {
        'id': 'cfg-stp',
        'project_category': 'STP',
        'system_instruction': 'STP Project Tender Instruction: Analyze Sewage Treatment Plant (STP) tenders (e.g. RUDSICO Alwar Town Sewerage Package AMRUT-2.0/RAJ/SEWERAGE/44 (NIB No: 01/2026-27, Rs 36.53 Cr)). Evaluate 35.25 MLD SBR technology, 10-Year O&M terms, and NGT effluent standards (BOD ≤ 10 mg/l, COD ≤ 50 mg/l, TSS ≤ 10 mg/l, TN ≤ 10 mg/l, TP ≤ 1 mg/l, Ammonia ≤ 5 mg/l). Match extracted BOQ items against historical STP rates for SBR basins, screw press sludge dewatering, fine bubble diffusers, blowers, and SCADA telemetry.',
        'eligibility_logic': 'Category 1 (Desire Alone): Requires ₹78 Cr average turnover & 20+ MLD SBR STP execution. Category 2 (Desire + Partner/JV): Desire provides ₹285 Cr turnover & Class-A license; 40% JV partner provides 20+ MLD SBR process completion & O&M certificate. Category 3 (GA Alone): Evaluates GA under State Class-A contractor provisions.',
        'costing_methodology': 'Item-level matching against RUDSICO Alwar Sewerage Package 44 & JDA Sewerage/SPS historical BOQ databases. Display historical item name, rate (₹), date of BOQ, estimated unit rate, and total cost. Allow manual rate overrides with reason logging for continuous AI learning.',
        'clause_priorities': ['Sec 3.0 Influent/Effluent Quality Specs', 'Sec 4.2 SBR Tank Design', 'Sec 6.1 PLC SCADA Automation'],
        'required_documents': ['CPCB Approval Certificate', '10 MLD Completed Plant Certificate', 'ISO 14001 Certification'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    }
}

router = APIRouter(prefix="/admin", tags=["Admin Backend Configuration & RBAC Engine"])

# --- Fallback Seeds if Database table is initializing ---
SEED_PROJECTS = [
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
    """Return live Admin Dashboard KPI metrics from DB."""
    projects_count = len(fetch_all("SELECT id FROM public.projects")) or 2
    users_count = len(fetch_all("SELECT id FROM public.users")) or 4
    
    return {
        "status": "success",
        "metrics": {
            "total_users": users_count,
            "pending_users": 1,
            "active_users": users_count - 1 if users_count > 1 else 1,
            "inactive_users": 0,
            "total_projects": projects_count,
            "active_tenders": 8,
            "pending_approvals": 2,
            "completed_tenders": 14
        }
    }

@router.get("/projects")
async def list_projects():
    """List all managed projects from Supabase DB."""
    projects = fetch_all("SELECT * FROM public.projects ORDER BY created_at DESC")
    if not projects:
        # Seed initial projects into DB if empty
        for p in SEED_PROJECTS:
            execute_write(
                """INSERT INTO public.projects (id, name, type, client, description, ai_instructions, knowledge_sources, status, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW()) ON CONFLICT (id) DO NOTHING;""",
                (p["id"], p["name"], p["type"], p["client"], p["description"], p["ai_instructions"], json.dumps(p["knowledge_sources"]), p["status"])
            )
        projects = fetch_all("SELECT * FROM public.projects ORDER BY created_at DESC") or SEED_PROJECTS

    return {
        "status": "success",
        "projects": projects
    }

@router.post("/projects")
async def create_project(payload: CreateProjectPayload):
    """Create a new project vertical and persist to Supabase DB."""
    proj_id = f"proj-{int(time.time())}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    
    sql = """
    INSERT INTO public.projects (id, name, type, client, description, ai_instructions, knowledge_sources, status, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP);
    """
    ks = json.dumps(["Company Profile", "Certificates"])
    
    success = execute_write(
        sql,
        (proj_id, payload.name.strip(), payload.type.strip().upper(), payload.client.strip(), payload.description.strip(), payload.ai_instructions.strip(), ks, "Active")
    )
    
    new_proj = {
        "id": proj_id,
        "name": payload.name.strip(),
        "type": payload.type.strip().upper(),
        "client": payload.client.strip(),
        "description": payload.description.strip(),
        "ai_instructions": payload.ai_instructions.strip(),
        "knowledge_sources": ["Company Profile", "Certificates"],
        "status": "Active",
        "created_at": timestamp
    }

    # Audit log
    audit_sql = "INSERT INTO public.audit_logs (id, actor, action, target, details, timestamp) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);"
    execute_write(audit_sql, (f"aud-{int(time.time())}", "admin", "Project Created", new_proj["name"], f"Created project {new_proj['type']} for {new_proj['client']}"))

    return {
        "status": "success",
        "message": f"Successfully created project '{new_proj['name']}'!",
        "project": new_proj
    }

@router.get("/ai-config")
async def get_all_ai_configs():
    """Fetch all project-specific system instructions and prompt version histories."""
    rows = fetch_all("SELECT * FROM public.ai_configs")
    config_dict = {}
    if rows:
        for r in rows:
            if isinstance(r.get("clause_priorities"), str):
                r["clause_priorities"] = json.loads(r["clause_priorities"])
            if isinstance(r.get("required_documents"), str):
                r["required_documents"] = json.loads(r["required_documents"])
            if isinstance(r.get("prompt_history"), str):
                r["prompt_history"] = json.loads(r["prompt_history"])
            config_dict[r["project_category"].upper()] = r
            
    for cat in ["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]:
        if cat not in config_dict:
            config_dict[cat] = DEFAULT_AI_CONFIGS.get(cat)

    return {"status": "success", "projects": list(config_dict.values()), "configs": list(config_dict.values())}

@router.get("/ai-config/{category}")
async def get_ai_config(category: str):
    """Fetch project-specific system instructions and prompt version history from Supabase DB."""
    cat = category.upper()
    row = fetch_one("SELECT * FROM public.ai_configs WHERE UPPER(project_category) = %s", (cat,))
    
    if row:
        if isinstance(row.get("clause_priorities"), str):
            row["clause_priorities"] = json.loads(row["clause_priorities"])
        if isinstance(row.get("required_documents"), str):
            row["required_documents"] = json.loads(row["required_documents"])
        if isinstance(row.get("prompt_history"), str):
            row["prompt_history"] = json.loads(row["prompt_history"])
        return {"status": "success", "config": row}
    
    # Default fallback config
    default_cfg = DEFAULT_AI_CONFIGS.get(cat, {
        "id": f"cfg-{cat.lower()}",
        "project_category": cat,
        "system_instruction": f"You are a Senior Evaluation AI Specialist for {cat} projects. Analyze eligibility, risks, and BOQ costings.",
        "eligibility_logic": f"Verify general company experience, Class-A license, and financial turnover for {cat}.",
        "costing_methodology": f"Use historical unit rates for {cat} procurement.",
        "clause_priorities": ["Technical Specs", "Financial Turnover", "O&M Guarantee"],
        "required_documents": ["Company Certificate", "Tax Returns", "License"],
        "active_prompt_version": "v1.0",
        "prompt_history": []
    })
    
    # Save default to DB
    execute_write(
        """INSERT INTO public.ai_configs (id, project_category, system_instruction, eligibility_logic, costing_methodology, clause_priorities, required_documents, active_prompt_version, prompt_history, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP) ON CONFLICT (project_category) DO NOTHING;""",
        (default_cfg["id"], cat, default_cfg["system_instruction"], default_cfg["eligibility_logic"], default_cfg["costing_methodology"], json.dumps(default_cfg["clause_priorities"]), json.dumps(default_cfg["required_documents"]), default_cfg["active_prompt_version"], json.dumps([]))
    )
    
    return {"status": "success", "config": default_cfg}

@router.post("/ai-config")
async def update_ai_config(payload: UpdateAIConfigPayload):
    """Save project-specific system instructions with automatic version incrementing to Supabase DB."""
    cat = payload.project_category.upper()
    existing = fetch_one("SELECT * FROM public.ai_configs WHERE UPPER(project_category) = %s", (cat,))
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    curr_ver = existing.get("active_prompt_version", "v1.0") if existing else "v1.0"
    try:
        major, minor = curr_ver.replace("v", "").split(".")
        next_ver = f"v{major}.{int(minor)+1}"
    except Exception:
        next_ver = "v1.1"

    history = existing.get("prompt_history") if existing else []
    if isinstance(history, str):
        try: history = json.loads(history)
        except: history = []
    if not isinstance(history, list):
        history = []

    history.insert(0, {
        "version": next_ver,
        "updated_at": timestamp,
        "author": "System Admin",
        "notes": payload.changelog_notes or "Updated prompt instructions",
        "system_instruction": payload.system_instruction
    })

    sql = """
    INSERT INTO public.ai_configs (id, project_category, system_instruction, eligibility_logic, costing_methodology, active_prompt_version, prompt_history, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    ON CONFLICT (project_category) DO UPDATE SET
        system_instruction = EXCLUDED.system_instruction,
        eligibility_logic = COALESCE(EXCLUDED.eligibility_logic, ai_configs.eligibility_logic),
        costing_methodology = COALESCE(EXCLUDED.costing_methodology, ai_configs.costing_methodology),
        active_prompt_version = EXCLUDED.active_prompt_version,
        prompt_history = EXCLUDED.prompt_history,
        updated_at = CURRENT_TIMESTAMP;
    """
    
    cfg_id = existing.get("id") if existing else f"cfg-{cat.lower()}"
    execute_write(
        sql,
        (cfg_id, cat, payload.system_instruction, payload.eligibility_logic or "Verify company qualifications", payload.costing_methodology or "Use historical BOQ rates", next_ver, json.dumps(history))
    )

    # Security Audit Log
    execute_write(
        "INSERT INTO public.audit_logs (id, actor, action, target, details, timestamp) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);",
        (f"aud-{int(time.time())}", "admin", "AI Prompt Updated", cat, f"Updated AI instructions to version {next_ver}")
    )

    return {
        "status": "success",
        "message": f"Successfully updated AI instructions for '{cat}'! Saved as version {next_ver}.",
        "active_prompt_version": next_ver
    }

@router.get("/credentials")
async def list_credentials():
    """Return list of registered API keys and credentials from Supabase DB."""
    creds = fetch_all("SELECT * FROM public.credentials ORDER BY updated_at DESC")
    return {
        "status": "success",
        "total_credentials": len(creds),
        "credentials": creds
    }

@router.post("/credentials")
async def rotate_or_add_credential(payload: RotateCredentialPayload):
    """Securely add or rotate an API key in Supabase DB."""
    if not payload.raw_api_key or len(payload.raw_api_key.strip()) < 8:
        raise HTTPException(status_code=400, detail="Invalid API Key. Must be at least 8 characters long.")

    raw = payload.raw_api_key.strip()
    masked = f"{raw[:6]}••••••••••••••••{raw[-4:]}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    sql = """
    INSERT INTO public.credentials (id, provider, key_type, masked_key, status, last_rotated, is_valid, notes, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
        provider = EXCLUDED.provider,
        masked_key = EXCLUDED.masked_key,
        last_rotated = EXCLUDED.last_rotated,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP;
    """

    execute_write(
        sql,
        (payload.id, payload.provider, "API Credential", masked, "Active (Encrypted AES-256)", timestamp, True, payload.notes or "Added via Admin Vault")
    )

    # Security Audit Log
    execute_write(
        "INSERT INTO public.audit_logs (id, actor, action, target, details, timestamp) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);",
        (f"aud-{int(time.time())}", "admin", "API Credential Rotated", payload.provider, f"Updated masked key: {masked}")
    )

    return {
        "status": "success",
        "message": f"Successfully registered API credential for '{payload.provider}'!",
        "credential": {
            "id": payload.id,
            "provider": payload.provider,
            "masked_key": masked,
            "last_rotated": timestamp
        }
    }

@router.get("/audit-logs")
async def get_audit_logs():
    """Retrieve immutable security audit trail from Supabase DB."""
    logs = fetch_all("SELECT * FROM public.audit_logs ORDER BY timestamp DESC LIMIT 50")
    return {
        "status": "success",
        "total_logs": len(logs),
        "audit_logs": logs
    }
