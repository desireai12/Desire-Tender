-- ====================================================================
-- DESIRE TENDER INTELLIGENCE PLATFORM — SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS & ACCESS CONTROL TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'User',
    department VARCHAR(100) DEFAULT 'Tender Team',
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Active', 'Rejected', 'Deactivated'
    permissions JSONB DEFAULT '["eligibility"]'::jsonb,
    assigned_projects JSONB DEFAULT '["SOLAR", "RHDS", "KUSUM", "EPC", "ESCO", "STP"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TENDERS & PROCESS LIFECYCLE TABLE
CREATE TABLE IF NOT EXISTS public.tenders (
    id VARCHAR(100) PRIMARY KEY,
    tender_name TEXT NOT NULL,
    project_category VARCHAR(50) NOT NULL,
    project_locked BOOLEAN DEFAULT FALSE,
    department_assigned VARCHAR(100) NOT NULL,
    current_stage VARCHAR(50) NOT NULL DEFAULT '1_ELIGIBILITY',
    stage_status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    eligibility_result JSONB,
    ai_report JSONB,
    bid_decision JSONB,
    bid_submission JSONB,
    tender_result JSONB,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. BOQ LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id VARCHAR(100) REFERENCES public.tenders(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    item_name TEXT NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    markup_percentage NUMERIC NOT NULL DEFAULT 0,
    tax_percentage NUMERIC NOT NULL DEFAULT 18,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MANAGED PROJECTS VERTICALS TABLE
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

-- 6. AI SYSTEM RULES & PROMPTS TABLE
CREATE TABLE IF NOT EXISTS public.ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_category VARCHAR(50) UNIQUE NOT NULL,
    system_instruction TEXT NOT NULL,
    eligibility_logic TEXT NOT NULL,
    costing_methodology TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ENCRYPTED API CREDENTIALS VAULT TABLE
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    key_type VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. COMPANY KNOWLEDGE & CERTIFICATES TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. COMPETITOR BATTLECARDS TABLE
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

-- 11. SEED INITIAL DEMO DATA
INSERT INTO public.users (employee_id, full_name, email, phone, password_hash, role, department, status, permissions)
VALUES 
('EMP001', 'Ankit Purohit', 'ankit.purohit@desireenergy.com', '9829012345', 'Ankit@EMP001#2026', 'Administrator', 'Admin', 'Active', '["eligibility", "ai_analysis", "cost_estimation", "bid_decision", "bid_details", "tender_result", "admin"]'::jsonb),
('EMP002', 'Deepak Khandelwal', 'deepak.khandelwal@desireenergy.com', '9829023456', 'Deepak@EMP002#2026', 'Sr Estimator', 'Estimation Team', 'Active', '["eligibility", "cost_estimation"]'::jsonb)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO public.projects (id, name, type, client, description, status)
VALUES 
('proj-1', 'Jal Jeevan Mission (JJM) Rural Water Supply', 'RHDS', 'PHED Rajasthan', 'Rural water supply distribution schemes across 100,000+ villages under JJM.', 'Active'),
('proj-2', 'PM-Kusum Component-B Solar Pump Scheme', 'KUSUM', 'REDA / RRECL', 'Implementation of off-grid solar water pumping systems.', 'Active')
ON CONFLICT (id) DO NOTHING;

-- 12. DISABLE ROW LEVEL SECURITY FOR SEAMLESS CLOUD DB SAVING
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors DISABLE ROW LEVEL SECURITY;




-- 13. SEED AUTHORITATIVE DESIRE ENERGY & JV TENDER KNOWLEDGE BASE
INSERT INTO public.users (employee_id, full_name, email, phone, password_hash, role, department, status, permissions)
VALUES 
('EMP005', 'Dharmesh Khandelwal', 'dharmeshkhandelwal@desireenergy.com', '7230037296', 'Dharmesh@EMP005#2026', 'Director & JV Lead', 'Tender Team', 'Active', '["eligibility", "ai_analysis", "cost_estimation", "bid_decision", "bid_details", "tender_result", "admin"]'::jsonb)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO public.knowledge_base (id, title, category, file_name, file_url, description, status, chunks_count, created_at)
VALUES
('kb-alwar-jv-01', 'M/s DESPL - DIVIJA CONSTRUCTIONS JV Technical Bid (Alwar Sewerage AMRUT 2.0)', 'Joint Venture & Technical Bid', 'PQ_Upload_Alwar.pdf', '/documents/PQ_Upload_Alwar.pdf', 'Authoritative Technical & PQ Bid for Alwar Package 44, RUDSICO NIT 01/2026-27 (Value: Rs 36.53 Cr)', 'Active', 15, CURRENT_TIMESTAMP),
('kb-alwar-tender-02', 'RUDSICO Notice Inviting Bids - Alwar Town Sewerage Package 44', 'Tender Document', 'AlwarPKG44 (1).pdf', '/documents/AlwarPKG44 (1).pdf', 'Official Bidding Document for Sewerage Works Wards 39 & 61 in Alwar Town (Cost: Rs 36.53 Cr, EMD: Rs 73.06 Lakhs)', 'Active', 12, CURRENT_TIMESTAMP),
('kb-desire-fin-03', 'Desire Energy Solutions Pvt Ltd Audited Financials (FY 2021-2025)', 'Financial', 'Audited_Financials_DESPL_FY21_25.pdf', '/documents/Audited_Financials_DESPL_FY21_25.pdf', 'Audited Financial Statements (Average Turnover: Rs 300.93 Cr, Net Worth: Rs 95.0 Cr, Solvency: Rs 50.0 Cr)', 'Active', 10, CURRENT_TIMESTAMP),
('kb-divija-exp-04', 'Divija Construction Sewerage & Sewage Pumping Station Work Orders', 'Past Experience', 'Divija_Construction_Sewerage_WorkOrders.pdf', '/documents/Divija_Construction_Sewerage_WorkOrders.pdf', 'JDA Jaipur Work Orders for 8 MLD & 1 MLD Sewage Pumping Stations and 136+ km Sewer lines (Rs 24.69 Cr & Rs 18.97 Cr)', 'Active', 8, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 14. MASTER COMPANIES DATABASE TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'JV Partner', -- 'Desire Energy', 'JV Partner', 'Competitor', 'Other'
    profile TEXT,
    registered_address TEXT,
    corporate_address TEXT,
    contact_details JSONB DEFAULT '{}'::jsonb,
    cin_registration VARCHAR(100),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    annual_turnover JSONB DEFAULT '{}'::jsonb,
    average_turnover NUMERIC DEFAULT 0,
    net_worth NUMERIC DEFAULT 0,
    solvency NUMERIC DEFAULT 0,
    technical_experience TEXT,
    past_projects JSONB DEFAULT '[]'::jsonb,
    work_orders JSONB DEFAULT '[]'::jsonb,
    client_details JSONB DEFAULT '[]'::jsonb,
    sector_experience JSONB DEFAULT '[]'::jsonb,
    equipment_machinery JSONB DEFAULT '[]'::jsonb,
    manpower_technical_staff JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    statutory_docs JSONB DEFAULT '[]'::jsonb,
    tender_experience JSONB DEFAULT '[]'::jsonb,
    uploaded_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. JV & COMBINED ELIGIBILITY EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS public.jv_evaluations (
    id VARCHAR(100) PRIMARY KEY,
    tender_id VARCHAR(100),
    tender_name TEXT NOT NULL,
    project_category VARCHAR(50) NOT NULL,
    desire_company_id VARCHAR(100),
    jv_partner_ids JSONB DEFAULT '[]'::jsonb,
    tender_requirements JSONB DEFAULT '[]'::jsonb,
    desire_eligibility JSONB DEFAULT '{}'::jsonb,
    jv_alone_eligibility JSONB DEFAULT '{}'::jsonb,
    combined_eligibility JSONB DEFAULT '{}'::jsonb,
    matrix_breakdown JSONB DEFAULT '[]'::jsonb,
    final_status VARCHAR(50) DEFAULT 'Eligible Through JV',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jv_evaluations DISABLE ROW LEVEL SECURITY;

-- SEED MASTER COMPANIES DATA
INSERT INTO public.companies (id, name, type, profile, registered_address, corporate_address, contact_details, cin_registration, gst_number, pan_number, average_turnover, net_worth, solvency, technical_experience)
VALUES
('comp-desire-01', 'DESIRE ENERGY SOLUTIONS PRIVATE LIMITED', 'Desire Energy', 'Leading Indian Water & Solar Infrastructure Company managing 1,00,000+ villages under Jal Jeevan Mission, PM-Kusum, and RHDS pipe networks.', '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan', '401, Manupasana Tower, C-Scheme, Jaipur - 302001, Rajasthan', '{"phone": "0141-4050855", "mobile": "7230037296", "email": "tenders@desireenergy.com", "contact_person": "Dharmesh Khandelwal"}'::jsonb, 'U40106RJ2011PTC034878', '08AAECD3266E1ZT', 'AAECD3266E', 300.93, 95.00, 50.00, 'Executed 120+ km HDPE/DI Water Pipelines, 5 OHSRs, 50+ MW Solar PV Plants, Class-A Special PHED Registration'),
('comp-divija-02', 'DIVIJA CONSTRUCTION', 'JV Partner', 'Govt Approved A & AA Class Contractor specializing in Sewage Treatment Plants, Sewage Pumping Stations, and Municipal Water Pipelines.', '79/12, Shipra Path, Mansarovar, Jaipur - 302020, Rajasthan', '79/12, Shipra Path, Mansarovar, Jaipur - 302020, Rajasthan', '{"phone": "9829147776", "email": "divijaconstruction@gmail.com", "contact_person": "Satish Kumar Goyal"}'::jsonb, 'GOVT-AA-CLASS-2005', '08AAFFD6567N1ZT', 'AAFFD6567N', 37.01, 6.58, 10.00, 'Executed JDA Jaipur 8 MLD & 1 MLD Sewage Pumping Stations, 136+ km Sewer lines (Work Orders Rs 24.69 Cr & Rs 18.97 Cr)'),
('comp-lt-03', 'LARSEN & TOUBRO WATER & EFFLUENT IC', 'Competitor', 'Multinational conglomerate executing mega municipal water, STP, and industrial effluent treatment plants across India.', 'Mount Poonamallee Road, Manapakkam, Chennai - 600089', 'Mount Poonamallee Road, Manapakkam, Chennai - 600089', '{"email": "waterbids@lntecc.com", "contact_person": "Tender Desk"}'::jsonb, 'L99999MH1946PLC004768', '33AAACL0140P1ZB', 'AAACL0140P', 12500.00, 4200.00, 1000.00, 'Executed 500+ MLD STPs, Mega Intake Works, WTPs across 20+ Indian States')
ON CONFLICT (id) DO NOTHING;
