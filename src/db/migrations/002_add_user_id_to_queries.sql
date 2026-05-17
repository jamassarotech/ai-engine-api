-- AI Engine API - Add user_id to queries table
-- Migration: 002_add_user_id_to_queries.sql
-- Created: 2026-05-17
-- Purpose: Add user identification for search history feature

-- ============================================================
-- ADD USER_ID COLUMN
-- Stores frontend-generated UUID for user identification
-- Nullable for backward compatibility with existing queries
-- ============================================================
ALTER TABLE queries 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- ============================================================
-- INDEXES FOR USER QUERIES
-- ============================================================

-- Index for fast user query lookups
CREATE INDEX IF NOT EXISTS idx_queries_user_id 
ON queries(user_id);

-- Composite index for user history pagination (user + created_at)
-- This optimizes queries like: SELECT * FROM queries WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_queries_user_created 
ON queries(user_id, created_at DESC);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON COLUMN queries.user_id IS 'Frontend-generated UUID stored in browser localStorage for search history tracking. Not PII - used only for product search history.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
