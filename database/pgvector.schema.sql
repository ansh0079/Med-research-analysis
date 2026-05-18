-- ==========================================
-- pgvector database (PG_VECTOR_URL) — canonical schema
-- NOT part of the main app DB (schema.sql / production_schema.sql).
-- Mounted by docker-compose as docker-entrypoint-initdb.d init script.
-- ==========================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 384 dims: sentence-transformers/all-MiniLM-L6-v2 (HF) or OpenAI text-embedding-3-small with dimensions=384
CREATE TABLE IF NOT EXISTS articles_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    doi TEXT,
    source TEXT NOT NULL,
    data JSONB NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_cache_doi ON articles_cache(doi);
CREATE INDEX IF NOT EXISTS idx_articles_cache_embedding ON articles_cache
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
