-- Migration: Add is_active column to organizations table
-- Run if column does not exist yet

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill: mark all existing non-deleted orgs as active
UPDATE organizations SET is_active = true WHERE is_deleted = false AND is_active IS NULL;
