-- Add candidate photo columns for front face, left angle, right angle
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS img_front TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS img_left TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS img_right TEXT;
