-- Migration: Election Org Poster Templates
-- Run this on the database before starting the server

CREATE TABLE IF NOT EXISTS org_poster_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,             -- org uuid stored as text for compat
  post_id VARCHAR(64) NOT NULL,              -- references PostDetails.id (short slug)
  role VARCHAR(20) NOT NULL CHECK (role IN ('campaigner', 'supporter')),
  label VARCHAR(100),                        -- e.g. "WhatsApp Portrait"
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_poster_templates_org_id ON org_poster_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_poster_templates_role   ON org_poster_templates(role);
