-- AI Engine API - Add Recommendations Support
-- Migration: 003_add_recommendations.sql
-- Created: 2026-06-02
-- Description: Add recommendations_json column to query_results table

-- ============================================================
-- Add recommendations_json column to query_results
-- ============================================================
ALTER TABLE query_results 
ADD COLUMN IF NOT EXISTS recommendations_json JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_results_recommendations 
ON query_results USING GIN (recommendations_json);

-- Add comment for documentation
COMMENT ON COLUMN query_results.recommendations_json IS 'Array of product recommendations with name, summary, and score';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
