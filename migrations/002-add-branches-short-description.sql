-- Migration: Add short_description column to branches table
-- Adds a short text description set by user when creating/editing a branch.

BEGIN;

ALTER TABLE branches
ADD COLUMN IF NOT EXISTS short_description TEXT;

COMMENT ON COLUMN branches.short_description IS 'Short description for branch (set by user)';

COMMIT;

