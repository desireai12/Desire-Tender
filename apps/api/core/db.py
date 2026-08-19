import os
import logging
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from core.config import settings

logger = logging.getLogger("db_manager")

INIT_SCHEMA_SQL = """
-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ACCESS CONTROL TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'User',
    department VARCHAR(100) DEFAULT 'Tender Team',
    status VARCHAR(50) DEFAULT 'Pending',
    permissions JSONB DEFAULT '["eligibility"]'::jsonb,
    assigned_projects JSONB DEFAULT '["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]'::jsonb,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login VARCHAR(100) DEFAULT 'Never'
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_projects JSONB DEFAULT '["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. MANAGED PROJECTS VERTICALS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    client VARCHAR(255) NOT NULL,
    description TEXT,
    ai_instructions TEXT,
    knowledge_sources JSONB DEFAULT '["Company Profile", "Certificates"]'::jsonb,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_instructions TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS knowledge_sources JSONB DEFAULT '["Company Profile", "Certificates"]'::jsonb;

-- 3. AI SYSTEM RULES & PROMPTS TABLE
CREATE TABLE IF NOT EXISTS public.ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_category VARCHAR(50) UNIQUE NOT NULL,
    system_instruction TEXT NOT NULL,
    eligibility_logic TEXT,
    costing_methodology TEXT,
    clause_priorities JSONB DEFAULT '[]'::jsonb,
    required_documents JSONB DEFAULT '[]'::jsonb,
    active_prompt_version VARCHAR(20) DEFAULT 'v1.0',
    prompt_history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.ai_configs ADD COLUMN IF NOT EXISTS clause_priorities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_configs ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_configs ADD COLUMN IF NOT EXISTS active_prompt_version VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE public.ai_configs ADD COLUMN IF NOT EXISTS prompt_history JSONB DEFAULT '[]'::jsonb;

-- 4. ENCRYPTED API CREDENTIALS VAULT TABLE
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(100) NOT NULL,
    key_type VARCHAR(100) NOT NULL,
    masked_key VARCHAR(255),
    encrypted_key TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    last_rotated VARCHAR(100),
    is_valid BOOLEAN DEFAULT TRUE,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS masked_key VARCHAR(255);
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS encrypted_key TEXT;
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS last_rotated VARCHAR(100);
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE;
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    default_llm_provider VARCHAR(20) NOT NULL DEFAULT 'gemini',
    gemini_api_key TEXT,
    openai_api_key TEXT,
    gemini_model VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    openai_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. KNOWLEDGE BASE & CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    description TEXT,
    issue_date VARCHAR(50),
    expiry_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    uploaded_by VARCHAR(100),
    chunks_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS chunks_count INT DEFAULT 0;

-- 8. COMPETITOR BATTLECARDS TABLE
CREATE TABLE IF NOT EXISTS public.competitors (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    win_rate NUMERIC DEFAULT 0,
    total_bids INTEGER DEFAULT 0,
    historical_bids JSONB DEFAULT '[]'::jsonb,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    winning_strategies JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for seamless cloud direct connection
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- AUTOMATIC SEEDING DATA POPULATION
-- ====================================================================

-- Seed App Settings
INSERT INTO public.app_settings (id, default_llm_provider, gemini_model, openai_model)
VALUES ('default', 'gemini', 'gemini-1.5-flash', 'gpt-4o-mini')
ON CONFLICT (id) DO NOTHING;

-- Seed 4 Project Verticals
INSERT INTO public.projects (id, name, type, client, description, ai_instructions, knowledge_sources, status)
VALUES 
('proj-1', 'Jal Jeevan Mission (JJM) Rural Water Supply', 'RHDS', 'PHED Rajasthan', 'Rural water supply distribution schemes across 100,000+ villages under Jal Jeevan Mission.', 'Focus on HDPE/DI pipeline specs (PN-10/16), OHSR reservoir capacity, and 10-year O&M compliance.', '["Company Profile", "PHED Certificates", "Water Historical BOQs", "SOPs"]'::jsonb, 'Active'),
('proj-2', 'PM-Kusum Component-B Solar Pump Scheme', 'KUSUM', 'REDA / RRECL', 'Implementation of off-grid solar water pumping systems for agricultural electrification.', 'Verify REDA empanelment, Sunaquator RMS 4G telemetry controllers, and solar pump specs.', '["Company Profile", "Solar Certificates", "REDA Guidelines", "Solar Historical BOQs"]'::jsonb, 'Active'),
('proj-3', 'Solar Utility Scale Photovoltaic EPC Projects', 'SOLAR', 'NTPC / SECI', 'Utility scale ground-mounted solar power plants and grid interconnection infrastructure.', 'Verify PV module wattages, inverter efficiency (>98.5%), and Class-A electrical license.', '["Company Profile", "Solar Certificates", "Solar Historical BOQs", "Competitor Data"]'::jsonb, 'Active'),
('proj-4', 'WTP & Sewage Treatment Plant EPC Projects', 'STP', 'RHSTDUP / Urban Local Bodies', 'Water Treatment Plants (WTP) and Sewage Treatment Plants (STP) using SBR/MBBR technology.', 'Verify liquid waste treatment flow capacity (MLD), SCADA automation, and civil structural specs.', '["Company Profile", "STP Certifications", "Civil Historical BOQs"]'::jsonb, 'Active')
ON CONFLICT (id) DO NOTHING;

-- Seed AI Configs & Rules
INSERT INTO public.ai_configs (id, project_category, system_instruction, eligibility_logic, costing_methodology, clause_priorities, required_documents, active_prompt_version, prompt_history)
VALUES 
('a1b2c3d4-0001-4000-8000-000000000001', 'SOLAR', 'You are an expert Solar EPC Procurement & Engineering AI Specialist. Evaluate tenders with primary focus on solar PV module wattages, grid-tied/hybrid inverters, transformer capacity, electrical safety standards (IEC/IS), and solar irradiance BOQs.', 'Verify MNRE empanelment, Class-A Electrical License, solar MW execution history (>5 MW), and financial turnover requirement.', 'Use solar historical BOQ unit rates (PV modules per Wp, inverter per kW, AL/CU cabling per meter, structure per kg).', '["Sec 3.1 PV Module Specs", "Sec 4.5 Inverter Efficiency (>98.5%)", "Sec 7.2 Net Metering & Grid Interconnection"]'::jsonb, '["MNRE Vendor Empanelment", "Class-A Electrical License", "Solar Performance Guarantee Certificate"]'::jsonb, 'v2.1', '[{"version": "v2.1", "updated_at": "2026-08-07 10:30:00", "author": "System Admin", "notes": "Added IEC 61215 solar module compliance check rule.", "system_instruction": "You are an expert Solar EPC Procurement & Engineering AI Specialist. Evaluate tenders with primary focus on solar PV module wattages, grid-tied/hybrid inverters, transformer capacity, electrical safety standards (IEC/IS), and solar irradiance BOQs."}]'::jsonb),
('a1b2c3d4-0002-4000-8000-000000000002', 'RHDS', 'You are a Senior Municipal Water Infrastructure & Pipeline Engineering AI Evaluator. Focus on rural water supply distribution schemes (JJM/Panghat), HDPE/DI pipeline pressure ratings (PN-10/PN-16), Overhead Service Reservoirs (OHSR), and Water Treatment Plants (WTP).', 'Verify PHED Rajasthan Class-A License, minimum 50km distribution pipeline execution certificate, and ₹150 Cr annual financial turnover.', 'Use water sector historical BOQs (HDPE pipe per meter, excavation per cu.m, OHSR per lakh liter capacity, pump sets).', '["Sec 4.2 Distribution Pipeline Specs", "Sec 5.1 OHSR RCC Grade & Staging", "Sec 8.0 10-Year O&M Commitment"]'::jsonb, '["PHED Class-A License", "JJM Completed Project Certificate", "3-Year Audited Balance Sheet"]'::jsonb, 'v1.4', '[{"version": "v1.4", "updated_at": "2026-08-05 11:20:00", "author": "System Admin", "notes": "Updated JJM 10-year O&M clause priority mandate.", "system_instruction": "You are a Senior Municipal Water Infrastructure & Pipeline Engineering AI Evaluator. Focus on rural water supply distribution schemes (JJM/Panghat), HDPE/DI pipeline pressure ratings (PN-10/PN-16), Overhead Service Reservoirs (OHSR), and Water Treatment Plants (WTP)."}]'::jsonb),
('a1b2c3d4-0003-4000-8000-000000000003', 'KUSUM', 'You are a Solar Pumping & Micro-Grid Irrigation AI Analyst. Evaluate PM-KUSUM Component-B tenders with focus on solar pumps (3HP to 10HP), Submersible/Surface pumps, RMS 4G telemetry controllers, and farmer installation SOPs.', 'Verify REDA empanelment, solar pump manufacturing certificate (BIS/MNRE), and rural service network presence.', 'Use PM-Kusum benchmark costings per HP solar pump system.', '["Sec 2.1 RMS Telemetry Specification", "Sec 3.4 BIS Pump Efficiency", "Sec 5.0 5-Year Comprehensive Warranty"]'::jsonb, '["REDA Empanelment Certificate", "MNRE Test Report", "Service Center Location List"]'::jsonb, 'v1.2', '[]'::jsonb),
('a1b2c3d4-0004-4000-8000-000000000004', 'STP', 'You are a Water Treatment & Environmental Engineering AI Evaluator. Analyze WTP/STP EPC tenders focusing on treatment flow (MLD), BOD/COD removal efficiency, SBR/MBBR technology, and electromechanical SCADA controls.', 'Verify CPCB compliance certification, 10+ MLD plant construction experience, and ISO 14001 certification.', 'Use historical WTP/STP plant costings per MLD capacity.', '["Sec 3.0 Influent/Effluent Quality Specs", "Sec 4.2 SBR Tank Design", "Sec 6.1 PLC SCADA Automation"]'::jsonb, '["CPCB Approval Certificate", "10 MLD Completed Plant Certificate", "ISO 14001 Certification"]'::jsonb, 'v1.0', '[]'::jsonb),
('a1b2c3d4-0005-4000-8000-000000000005', 'EPC', 'EPC Project Tender Instruction: Analyze turnkey EPC civil and electromechanical tenders. Evaluate general civil construction, structural steel, electrical sub-station (33kV/132kV), instrumentation, and multi-disciplinary project execution schedules with milestone timelines.', 'Category 1 (Desire Alone): Requires ₹100 Cr average turnover & completion of major turnkey EPC project. Category 2 (Desire + Partner/JV): Financial lead with technical JV partner.', 'Item-level matching against state PWD / CPWD DSR (District Schedule of Rates) and market rates for civil, structural, and electrical turnkey items.', '["Sec 1.5 Turnkey Milestone Schedules", "Sec 3.2 Civil Structural Design", "Sec 6.0 Defect Liability Period"]'::jsonb, '["Class-A General EPC Registration", "Turnkey Completion Certificates", "Bank Solvency Certificate"]'::jsonb, 'v1.0', '[]'::jsonb),
('a1b2c3d4-0006-4000-8000-000000000006', 'ESCO', 'ESCO Project Tender Instruction: Analyze Energy Service Company (ESCO) tenders for municipal street lighting, building HVAC energy auditing, and industrial energy conservation. Evaluate guaranteed energy savings percentage, BEE accreditation, baseline energy audit metrics, shared-savings revenue models, and performance-based O&M contracts.', 'Category 1 (Desire Alone): Requires Grade-1 / Grade-2 BEE ESCO accreditation & proven performance contract of >20% energy savings. Category 2 (Desire + Partner/JV): Joint bidding with certified energy auditing firm.', 'Shared-savings & annuity pay-back model calculation. Match LED fixture rates, smart feeder panels, IoT energy meters, and baseline kWh cost savings against historical ESCO contracts.', '["Sec 2.0 Baseline Energy Audit Standards", "Sec 4.1 Guaranteed Savings SLA", "Sec 5.3 Shared Revenue Terms"]'::jsonb, '["BEE ESCO Accreditation Certificate", "Energy Savings Verification Certificate", "Certified Energy Auditor License"]'::jsonb, 'v1.0', '[]'::jsonb)
ON CONFLICT (project_category) DO NOTHING;

-- Seed Credentials Vault
INSERT INTO public.credentials (id, provider, key_type, masked_key, encrypted_key, status, last_rotated, is_valid, notes)
VALUES 
('c1c2c3c4-0001-4000-8000-000000000001', 'Google Gemini API', 'Primary RAG & Analysis Engine', 'AIzaSy••••••••••••••••39a1', 'AIzaSy••••••••••••••••39a1', 'Active (Encrypted AES-256)', '2026-08-06 09:15:00', TRUE, 'Primary RAG engine for tender PDF parsing'),
('c1c2c3c4-0002-4000-8000-000000000002', 'OpenAI GPT-4o', 'Fallback / High-Precision Engine', 'sk-proj-••••••••••••••••48b2', 'sk-proj-••••••••••••••••48b2', 'Active (Encrypted AES-256)', '2026-08-04 14:20:00', TRUE, 'Fallback reasoning engine for complex legal clauses')
ON CONFLICT (id) DO NOTHING;

-- Seed Knowledge Base with Full Desire Energy Credentials
INSERT INTO public.knowledge_base (id, title, category, file_name, file_url, description, status, uploaded_by, chunks_count)
VALUES 
('kb-01', 'Desire Energy Audited Financial Balance Sheets & Turnover Certificates (2022-2025)', 'Financial', 'Desire_Financial_Turnover_2025.pdf', '/documents/Desire_Financial_Turnover_2025.pdf', 'Audited annual financial turnover (₹285 Cr average over 3 years), Net Worth Certificate (₹95 Cr), and Bank Solvency Certificate (₹50 Cr).', 'Active', 'System Admin', 14),
('kb-02', 'PHED Rajasthan Class-A Special Category Contractor License', 'Technical Capability', 'PHED_ClassA_Contractor_License.pdf', '/documents/PHED_ClassA_Contractor_License.pdf', 'Class-A Special Category Registration for Municipal & Rural Water Supply Pipeline Infrastructure in Rajasthan.', 'Active', 'System Admin', 6),
('kb-03', 'Jal Jeevan Mission (JJM) Work Completion Certificates (120+ km HDPE Pipeline & 5 OHSRs)', 'Past Experience', 'JJM_Completed_Projects_Certificate.pdf', '/documents/JJM_Completed_Projects_Certificate.pdf', 'Work completion & 10-year O&M commitment certificates for 120+ km HDPE (PN-10/16) distribution pipelines and 5 Overhead Reservoirs.', 'Active', 'System Admin', 9),
('kb-04', 'Class-A Electrical Contractor License (Government of Rajasthan)', 'Technical Capability', 'Rajasthan_Electrical_ClassA_License.pdf', '/documents/Rajasthan_Electrical_ClassA_License.pdf', 'Class-A Electrical Contractor License issued by Chief Electrical Inspector for Sub-Station, Solar Grid & High Tension Line works.', 'Active', 'System Admin', 5),
('kb-05', 'MNRE & REDA Empanelment Certificate for Solar Water Pumping (PM-KUSUM)', 'Technical Capability', 'MNRE_REDA_Solar_Empanelment.pdf', '/documents/MNRE_REDA_Solar_Empanelment.pdf', 'Official empanelment under REDA / RRECL for PM-Kusum Component-B off-grid solar pumps with Sunaquator 4G RMS telemetry controllers.', 'Active', 'System Admin', 8),
('kb-06', 'Solar Utility Scale (50+ MW) Project Execution & Commissioning Certificates', 'Past Experience', 'Solar_50MW_Commissioning_Certificates.pdf', '/documents/Solar_50MW_Commissioning_Certificates.pdf', 'Commissioning certificates for 50+ MW ground-mounted solar PV power plants with grid interconnection & transformer substations.', 'Active', 'System Admin', 11),
('kb-07', 'WTP / STP Plant Construction & CPCB Compliance Certificates (10+ MLD Flow)', 'Past Experience', 'WTP_STP_CPCB_Compliance_Certificate.pdf', '/documents/WTP_STP_CPCB_Compliance_Certificate.pdf', 'Completion certificates for Water Treatment Plants (WTP) & Sewage Treatment Plants (STP) using SBR/MBBR technology with SCADA PLC control.', 'Active', 'System Admin', 10),
('kb-08', 'ISO Integrated Management System Certificates (ISO 9001:2015, ISO 14001:2015, ISO 45001:2018)', 'Quality & Safety', 'ISO_Integrated_Certificates.pdf', '/documents/ISO_Integrated_Certificates.pdf', 'Certified quality management (QMS), environmental safety (EMS), and occupational health & safety management systems.', 'Active', 'System Admin', 4)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Seed Competitor Battlecards
INSERT INTO public.competitors (id, name, category, win_rate, total_bids, historical_bids, strengths, weaknesses, winning_strategies)
VALUES 
('comp-01', 'L&T Construction', 'Water & Solar EPC', 42, 35, '[{"tender": "JJM Bundi Package 02", "bid_amount": "₹142 Cr", "result": "Won"}, {"tender": "Phalodi Solar 50MW", "bid_amount": "₹210 Cr", "result": "Lost"}]'::jsonb, '["Turnkey execution speed", "Massive equipment fleet", "Strong bank guarantee credit"]'::jsonb, '["Higher bidding price margin (+8-12%)", "Low flexibility on payment terms"]'::jsonb, '["Target bids where speed/timeline carries >20% technical weightage"]'::jsonb),
('comp-02', 'Tata Power Solar', 'Solar Pumping & EPC', 38, 28, '[{"tender": "KUSUM Phase-2 Jaipur", "bid_amount": "₹65 Cr", "result": "Won"}]'::jsonb, '["In-house solar PV module manufacturing", "Strong brand recognition in micro-pumps"]'::jsonb, '["Slower civil pipeline execution", "Subcontracts civil works"]'::jsonb, '["Undercut on solar PV component costs by 5%"]'::jsonb),
('comp-03', 'Voltas Water', 'WTP / STP EPC', 29, 18, '[]'::jsonb, '["Electromechanical plant design", "SCADA automation specialization"]'::jsonb, '["Subcontracts civil structure & pipeline laying"]'::jsonb, '["Partner with civil subcontractors to match total turnkey cost"]'::jsonb),
('comp-04', 'Shakti Pumps', 'KUSUM Solar Pumps', 45, 40, '[]'::jsonb, '["Direct manufacturer of solar pumps & RMS controllers", "Lowest component bill-of-materials"]'::jsonb, '["Limited large EPC pipeline experience"]'::jsonb, '["Focus on turnkey civil & distribution capabilities where pump-only specs are insufficient"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed Users
INSERT INTO public.users (id, employee_id, full_name, email, phone, password_hash, role, department, status, permissions, assigned_projects)
VALUES 
('b1b2c3d4-0001-4000-8000-000000000001', 'EMP001', 'Ankit Purohit', 'ankit.purohit@desireenergy.com', '9829012345', '7cf2c366b56b3e7bc230fb15e5108f972b9a76d75c5ecbebc8b3bc7f8ad8efc3', 'Administrator', 'Admin', 'Active', '["eligibility", "ai_analysis", "cost_estimation", "bid_decision", "bid_details", "tender_result", "admin"]'::jsonb, '["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]'::jsonb),
('b1b2c3d4-0002-4000-8000-000000000002', 'EMP002', 'Deepak Khandelwal', 'deepak.khandelwal@desireenergy.com', '9829023456', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Sr Estimator', 'Estimation Team', 'Active', '["eligibility", "cost_estimation"]'::jsonb, '["SOLAR", "RHDS", "KUSUM", "EPC"]'::jsonb),
('b1b2c3d4-0003-4000-8000-000000000003', 'EMP003', 'Suresh Sharma', 'suresh.sharma@desireenergy.com', '9829034567', '4a7d1ed414474e4033ac29ccb8653d9b', 'Chief Engineer', 'Engineering', 'Active', '["eligibility", "ai_analysis"]'::jsonb, '["SOLAR", "RHDS", "STP"]'::jsonb),
('b1b2c3d4-0004-4000-8000-000000000004', 'EMP004', 'Vikas Verma', 'vikas.verma@desireenergy.com', '9829045678', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 'Tender Head', 'Tender Team', 'Active', '["eligibility", "bid_submission", "bid_details", "tender_result"]'::jsonb, '["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]'::jsonb)
ON CONFLICT (employee_id) DO NOTHING;

-- Seed Audit Trail
INSERT INTO public.audit_logs (id, actor, action, target, details)
VALUES 
('e1e2e3e4-0001-4000-8000-000000000001', 'admin', 'Admin Login', 'Admin Portal', 'Admin authenticated successfully'),
('e1e2e3e4-0002-4000-8000-000000000002', 'admin', 'Database Seeding Initialized', 'Supabase Cloud DB', 'Seeded initial projects, AI prompts, credentials, knowledge base assets, and competitor battlecards')
ON CONFLICT (id) DO NOTHING;
"""

def get_db_connection():
    """Establish and return a new PostgreSQL connection."""
    conn_url = settings.DATABASE_URL
    if not conn_url or "localhost:5432/postgres" in conn_url and not os.getenv("DATABASE_URL"):
        logger.warning("DATABASE_URL not explicitly set or pointing to default localhost. Attempting connection...")
    try:
        return psycopg2.connect(conn_url, connect_timeout=5)
    except Exception as e:
        logger.error(f"PostgreSQL connection error: {e}")
        return None

def init_db():
    """Initializes schema tables and seeds initial data in Supabase if not existing."""
    conn = get_db_connection()
    if not conn:
        logger.warning("Supabase DB connection unavailable during init_db(). Operating with memory fallback.")
        return False
    try:
        cur = conn.cursor()
        cur.execute(INIT_SCHEMA_SQL)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Supabase database tables and initial dataset successfully initialized & seeded.")
        return True
    except Exception as e:
        logger.error(f"Failed to execute init_db() schema creation and seeding: {e}")
        if conn:
            conn.close()
        return False

def fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute SQL SELECT query and return list of dictionaries."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Database fetch_all error: {e}")
        if conn:
            conn.close()
        return []

def fetch_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute SQL SELECT query and return single dictionary result."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, params)
        row = cur.fetchone()
        cur.close()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Database fetch_one error: {e}")
        if conn:
            conn.close()
        return None

def execute_write(query: str, params: tuple = ()) -> bool:
    """Execute INSERT, UPDATE, DELETE query and commit transaction."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Database execute_write error: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False
