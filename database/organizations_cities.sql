-- Create table for Cities/Metro Cities
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gu_name VARCHAR(255) NOT NULL,
    is_metro BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'મહાનગર પાલિકા', 'નગર પાલિકા', 'જિલ્લા પંચાયત', 'તાલુકા પંચાયત', 'ગ્રામ પંચાયત'
    district_id INTEGER,
    taluka_id INTEGER,
    village_id INTEGER,
    city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter candidates table to use organization_id instead of redundant columns
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE candidates DROP COLUMN IF EXISTS district_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS taluka_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS village_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS city_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS election_type;
ALTER TABLE candidates DROP COLUMN IF EXISTS location_info;
