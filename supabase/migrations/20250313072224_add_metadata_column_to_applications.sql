-- Add metadata column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS metadata JSONB;
