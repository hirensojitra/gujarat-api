-- Add is_active column to political_parties and candidates

ALTER TABLE political_parties ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
