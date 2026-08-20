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
