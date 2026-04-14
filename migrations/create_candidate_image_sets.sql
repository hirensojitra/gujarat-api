-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Multi-Image Sets for Candidates (Organization-Managed)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Organization-level set definitions
CREATE TABLE IF NOT EXISTS organization_image_sets (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    set_index INTEGER NOT NULL DEFAULT 1,
    label VARCHAR(100) NOT NULL DEFAULT 'Default',

    -- Image validation rules (per-set)
    max_file_size_kb INTEGER NOT NULL DEFAULT 2048,
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '3:4',
    allowed_formats TEXT NOT NULL DEFAULT 'png',

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, set_index)
);

-- 2. Per-candidate images linked to org-level set definitions
CREATE TABLE IF NOT EXISTS candidate_image_sets (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    org_image_set_id INTEGER NOT NULL REFERENCES organization_image_sets(id) ON DELETE CASCADE,
    img_front TEXT,
    img_left TEXT,
    img_right TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, org_image_set_id)
);

-- 3. Cross-org safety trigger
CREATE OR REPLACE FUNCTION check_candidate_org_match()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM candidates c
        JOIN organization_image_sets ois ON ois.id = NEW.org_image_set_id
        WHERE c.id = NEW.candidate_id
          AND c.organization_id = ois.organization_id
    ) THEN
        RAISE EXCEPTION 'Candidate % does not belong to the organization that owns image set %',
            NEW.candidate_id, NEW.org_image_set_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_image_set_org_check ON candidate_image_sets;
CREATE TRIGGER trg_candidate_image_set_org_check
    BEFORE INSERT OR UPDATE ON candidate_image_sets
    FOR EACH ROW EXECUTE FUNCTION check_candidate_org_match();

-- 4. Add required_image_set_id to poster template assignments
ALTER TABLE org_poster_templates 
  ADD COLUMN IF NOT EXISTS required_image_set_id INTEGER 
  REFERENCES organization_image_sets(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Data migration (wrapped in transaction)
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

-- Create a "Default" set for every org that has candidates
INSERT INTO organization_image_sets (organization_id, set_index, label)
SELECT DISTINCT c.organization_id, 1, 'Default'
FROM candidates c
WHERE c.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing candidate images into the new table
INSERT INTO candidate_image_sets (candidate_id, org_image_set_id, img_front, img_left, img_right)
SELECT c.id, ois.id, c.img_front, c.img_left, c.img_right
FROM candidates c
JOIN organization_image_sets ois
  ON ois.organization_id = c.organization_id AND ois.set_index = 1
WHERE c.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Point existing poster templates to the default set
UPDATE org_poster_templates otp
SET required_image_set_id = ois.id
FROM organization_image_sets ois
WHERE ois.organization_id = otp.organization_id::INTEGER AND ois.set_index = 1;

COMMIT;
