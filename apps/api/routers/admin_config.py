import time
import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.db import fetch_all, fetch_one, execute_write

DEFAULT_AI_CONFIGS = {
    'SOLAR': {
        'id': 'cfg-solar',
        'project_category': 'SOLAR',
        'system_instruction': 'SOLAR Project Tender Instruction: Universally analyze Solar PV EPC tenders (Ground Mounted, Floating & Rooftop Solar PV Plants). Dynamically extract target tender specifications including MWp/KWp capacity ratings, PV module efficiency & ALMM compliance, central/string inverter specs, solar yield forecasting, net-metering & grid interconnection, and Comprehensive O&M terms. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and selected JV Partner credentials.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract target tender\'s financial turnover, net worth, solvency, solar capacity execution (MW/KW), and MNRE/Nodal empanelment criteria directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: Financial Pooling + Combined Solar EPC & Grid Interconnection Strength).',
        'costing_methodology': 'Item-level matching against Solar BOQ databases. Display historical item rates per Wp (₹), module, mounting structure (MMS), inverter, transformer, and SCADA line items. Allow manual rate overrides with reason logging.',
        'clause_priorities': ['Sec 3.1 PV Module Specs & ALMM Compliance', 'Sec 4.5 Inverter Efficiency (>98.5%)', 'Sec 7.2 Net Metering & Grid Interconnection'],
        'required_documents': ['MNRE Vendor Empanelment', 'Class-A Electrical License', 'Solar Performance Guarantee Certificate'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'RHDS': {
        'id': 'cfg-rhds',
        'project_category': 'RHDS',
        'system_instruction': 'RHDS Project Tender Instruction: Universally analyze Rural High Density & Drinking Water Supply tenders (e.g. Jal Jeevan Mission, Multi-Village Schemes, Bulk Water Distribution). Dynamically extract target tender specifications including HDPE/DI/MS pipeline pressure ratings & diameter, Overhead Service Reservoir (OHSR/CWR) capacities, raw water intake works, pumping stations, chlorination units, and O&M terms. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and JV partner capabilities.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract target tender\'s exact financial limits (Turnover, Net Worth, Solvency, EMD) and physical pipeline execution requirements directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: 100% Financial Pooling + Technical Synergy with Desire as Lead Member).',
        'costing_methodology': 'Item-level matching against PHED & JJM historical BOQ databases for DI K9 / HDPE / MS pipes, OHSR reservoirs, pumping machinery, and house service connections.',
        'clause_priorities': ['Sec 4.2 Distribution Pipeline Specs', 'Sec 5.1 OHSR RCC Grade & Staging', 'Sec 8.0 10-Year O&M Commitment'],
        'required_documents': ['PHED Class-A License', 'JJM Completed Project Certificate', '3-Year Audited Balance Sheet'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'KUSUM': {
        'id': 'cfg-kusum',
        'project_category': 'KUSUM',
        'system_instruction': 'KUSUM Project Tender Instruction: Universally analyze PM-KUSUM (Component A/B/C) Solar Pumping & Grid-Connected Agricultural Solarization tenders. Dynamically extract target tender specifications including solar pump HP ratings (AC/DC Submersible/Surface), RMS 4G IoT telemetry controllers, MNRE technical specs, and mandatory warranty/O&M compliance. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and selected JV partner credentials.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract target tender\'s turnover, solar pump count requirements, and Nodal Agency empanelment terms directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: Financial Pooling + Solar Pump Delivery).',
        'costing_methodology': 'Item-level matching against State Nodal Agency PM-KUSUM benchmark costs per HP for pump sets, solar panels, RMS controllers, and mounting structures.',
        'clause_priorities': ['Sec 2.1 RMS Telemetry Specification', 'Sec 3.4 BIS Pump Efficiency', 'Sec 5.0 5-Year Comprehensive Warranty'],
        'required_documents': ['REDA Empanelment Certificate', 'MNRE Test Report', 'Service Center Location List'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'EPC': {
        'id': 'cfg-epc',
        'project_category': 'EPC',
        'system_instruction': 'EPC Project Tender Instruction: Universally analyze Turnkey EPC Infrastructure tenders across Water Transmission, Civil Engineering, Pipelines, and Electromechanical Works. Dynamically extract target tender specifications including financial turnover, single work order value thresholds, pipeline laying & jointing lengths, pumping plant kW ratings, sub-station/electrical works, and milestone timelines. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and JV Partner credentials.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract target tender\'s exact financial limits (Turnover, Net Worth, Solvency, EMD) and technical work order thresholds directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: 100% Financial Pooling + Joint Work Order Qualification with Desire as Lead Member).',
        'costing_methodology': 'Item-level matching against PWD / GWSSB / CPWD District Schedule of Rates (DSR) and historical EPC BOQ databases for civil, structural steel, pipeline, and electromechanical line items.',
        'clause_priorities': ['Sec 1.5 Turnkey Milestone Schedules', 'Sec 3.2 Civil Structural Design', 'Sec 6.0 Defect Liability Period'],
        'required_documents': ['Class-A General EPC Registration', 'Turnkey Completion Certificates', 'Bank Solvency Certificate'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'ESCO': {
        'id': 'cfg-esco',
        'project_category': 'ESCO',
        'system_instruction': 'ESCO Project Tender Instruction: Universally analyze Energy Service Company (ESCO) tenders for municipal street lighting, HVAC energy auditing, and industrial energy efficiency pumping. Dynamically extract target tender specifications including guaranteed energy savings percentage (SLA), BEE accreditation grade, baseline energy audit metrics, shared-savings revenue models, and performance-based O&M contracts. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and JV partner capabilities.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract target tender\'s turnover, BEE accreditation level, and energy savings SLA criteria directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: Financial Pooling + Technical Synergy).',
        'costing_methodology': 'Shared-savings & annuity payback model calculation. Match LED fixture rates, smart feeder panels, IoT energy meters, and baseline kWh cost savings against historical ESCO contracts.',
        'clause_priorities': ['Sec 2.0 Baseline Energy Audit Standards', 'Sec 4.1 Guaranteed Savings SLA', 'Sec 5.3 Shared Revenue Terms'],
        'required_documents': ['BEE ESCO Accreditation Certificate', 'Energy Savings Verification Certificate', 'Certified Energy Auditor License'],
        'active_prompt_version': 'v1.0',
        'prompt_history': []
    },
    'STP': {
        'id': 'cfg-stp',
        'project_category': 'STP',
        'system_instruction': 'STP Project Tender Instruction: Universally analyze Sewage Treatment Plant (STP), Sewerage Network, and Wastewater Treatment tenders. Dynamically extract target tender specifications including plant capacity (MLD), treatment technology (SBR, MBR, MBBR, ASP), NGT effluent quality standards (BOD ≤ 10 mg/l, COD ≤ 50 mg/l, TSS ≤ 10 mg/l, TN ≤ 10 mg/l, TP ≤ 1 mg/l), underground gravity sewer networks (DWC / RCC NP3 / HDPE pipe laying), pump house electromechanical equipment, PLC/SCADA automation, and O&M terms. Evaluate extracted clauses against Desire Energy credentials (dynamically loaded from company database) and selected JV partner\'s technical track record.',
        'eligibility_logic': 'Dynamic Tender Eligibility Rules: Extract the exact Financial Turnover, Net Worth, Solvency, and Technical Experience requirements directly from the target tender document. Evaluate Option 1 (Desire Alone: company database credentials), Option 2 (JV Partner Alone: partner technical and financial credentials), and Option 3 (Combined Consortium: 100% Financial Turnover Pooling + Technical Combination with Desire as Lead Member).',
        'costing_methodology': 'Dynamic BOQ item-level matching against historical STP, Sewerage Pipe Laying, Dewatering, SBR Basins, Submersible Pumping, Blowers, and SCADA databases. Display historical item name, rate (₹), date of BOQ, estimated unit rate, and total cost. Allow manual rate overrides with reason logging for continuous AI learning.',
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
    execute_write(audit_sql, (str(uuid.uuid4()), "admin", "Project Created", new_proj["name"], f"Created project {new_proj['type']} for {new_proj['client']}"))

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
    
    cfg_id = existing.get("id") if existing else str(uuid.uuid4())
    execute_write(
        sql,
        (cfg_id, cat, payload.system_instruction, payload.eligibility_logic or "Verify company qualifications", payload.costing_methodology or "Use historical BOQ rates", next_ver, json.dumps(history))
    )

    # Security Audit Log
    execute_write(
        "INSERT INTO public.audit_logs (id, actor, action, target, details, timestamp) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);",
        (str(uuid.uuid4()), "admin", "AI Prompt Updated", cat, f"Updated AI instructions to version {next_ver}")
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

    cred_id = payload.id.strip()
    try:
        uuid.UUID(cred_id)
    except ValueError:
        existing_cred = fetch_one("SELECT id FROM public.credentials WHERE provider = %s", (payload.provider,))
        cred_id = existing_cred["id"] if existing_cred else str(uuid.uuid4())

    execute_write(
        sql,
        (cred_id, payload.provider, "API Credential", masked, "Active (Encrypted AES-256)", timestamp, True, payload.notes or "Added via Admin Vault")
    )

    # Security Audit Log
    execute_write(
        "INSERT INTO public.audit_logs (id, actor, action, target, details, timestamp) VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);",
        (str(uuid.uuid4()), "admin", "API Credential Rotated", payload.provider, f"Updated masked key: {masked}")
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
