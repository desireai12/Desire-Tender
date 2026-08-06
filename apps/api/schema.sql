-- Desire Tender Intelligence Platform
-- Supabase PostgreSQL Database Schema & Vector Extension Setup

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. App Settings Table (Dynamic API Key Configuration & LLM Preferences)
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    default_llm_provider VARCHAR(20) NOT NULL DEFAULT 'gemini',
    gemini_api_key TEXT,
    openai_api_key TEXT,
    gemini_model VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    openai_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row if not existing
INSERT INTO app_settings (id, default_llm_provider, gemini_model, openai_model)
VALUES ('default', 'gemini', 'gemini-1.5-flash', 'gpt-4o-mini')
ON CONFLICT (id) DO NOTHING;

-- 3. Documents Master Metadata Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL, -- company_credentials, competitor_data, tender_document
    category VARCHAR(100) DEFAULT 'general', -- Financial, Technical Capability, Past Experience, Competitor Profile
    chunks_count INT DEFAULT 0,
    file_size_bytes BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Document Vector Chunks Table (for pgvector RAG retrieval)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768), -- Dimensions for Gemini text-embedding-004
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW Cosine Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Competitor Profiles Table
CREATE TABLE IF NOT EXISTS competitor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name VARCHAR(150) NOT NULL,
    historical_win_rate VARCHAR(20),
    avg_discount_margin VARCHAR(50),
    key_strengths TEXT[],
    vulnerabilities TEXT[],
    strategy_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tender Evaluations History Table
CREATE TABLE IF NOT EXISTS tender_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_filename VARCHAR(255) NOT NULL,
    verdict VARCHAR(50) NOT NULL, -- Eligible, Conditional, Ineligible
    eligibility_score INT NOT NULL,
    executive_summary TEXT,
    parameter_matrix JSONB,
    competitor_intelligence JSONB,
    cost_structure JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
