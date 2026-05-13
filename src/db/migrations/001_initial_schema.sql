-- AI Engine API - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-05-10

-- Enable UUID extension (optional, for future use)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: queries
-- Stores all search queries (original and normalized)
-- ============================================================
CREATE TABLE IF NOT EXISTS queries (
  id SERIAL PRIMARY KEY,
  original_query VARCHAR(500) NOT NULL,
  normalized_query VARCHAR(500) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  query_type VARCHAR(50), -- 'product', 'comparison', 'best', 'troubleshooting', 'general'
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_queries_normalized ON queries(normalized_query);
CREATE INDEX IF NOT EXISTS idx_queries_slug ON queries(slug);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);

-- ============================================================
-- TABLE: query_results
-- Stores AI-generated analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS query_results (
  id SERIAL PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  summary JSONB NOT NULL, -- {title: string, verdict: string}
  pros_json JSONB DEFAULT '[]'::jsonb,
  cons_json JSONB DEFAULT '[]'::jsonb,
  warnings_json JSONB DEFAULT '[]'::jsonb,
  quotes_json JSONB DEFAULT '[]'::jsonb,
  confidence VARCHAR(20), -- 'high', 'medium', 'low'
  ai_model VARCHAR(50),
  tokens_input INTEGER,
  tokens_output INTEGER,
  ai_cost DECIMAL(10, 6),
  generated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(query_id) -- One result per query
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_results_query_id ON query_results(query_id);
CREATE INDEX IF NOT EXISTS idx_results_confidence ON query_results(confidence);

-- ============================================================
-- TABLE: sources
-- Stores all sources (YouTube videos, Reddit posts/comments)
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL, -- 'youtube', 'reddit'
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  author VARCHAR(200),
  published_at TIMESTAMP,
  text TEXT, -- Reddit comment/post body, YouTube description
  score INTEGER, -- Reddit upvotes, YouTube view count
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sources_query_id ON sources(query_id);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_published_at ON sources(published_at DESC);

-- ============================================================
-- TABLE: search_logs
-- Logs all search requests for analytics and debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS search_logs (
  id SERIAL PRIMARY KEY,
  query VARCHAR(500) NOT NULL,
  normalized_query VARCHAR(500),
  cached BOOLEAN DEFAULT FALSE,
  latency_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  ai_cost DECIMAL(10, 6),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_cached ON search_logs(cached);
CREATE INDEX IF NOT EXISTS idx_logs_error ON search_logs(error_message) WHERE error_message IS NOT NULL;

-- ============================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to queries table (drop if exists to make migration idempotent)
DROP TRIGGER IF EXISTS update_queries_updated_at ON queries;
CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END OF MIGRATION
-- ============================================================
