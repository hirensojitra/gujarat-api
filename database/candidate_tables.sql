-- Candidate Management System Tables

CREATE TABLE IF NOT EXISTS political_parties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol_url TEXT,
    basic_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    electoral_roll_name VARCHAR(255),
    mobile_number VARCHAR(50) NOT NULL,
    party_id INTEGER REFERENCES political_parties(id) ON DELETE SET NULL,
    election_type VARCHAR(100) NOT NULL, -- 'City/Metro City Municipal', 'District Panchayat', 'Taluka Panchayat', 'Gram Panchayat'
    seat_name VARCHAR(255),
    location_info TEXT,
    district_id INTEGER,
    taluka_id INTEGER,
    village_id INTEGER,
    city_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
