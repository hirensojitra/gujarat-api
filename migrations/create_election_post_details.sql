-- Migration: Create election_post_details table
-- Run this SQL on your PostgreSQL database before restarting the backend server.

CREATE TABLE IF NOT EXISTS election_post_details (
    id VARCHAR(20) PRIMARY KEY,
    deleted BOOLEAN DEFAULT false,
    h FLOAT NOT NULL,
    w FLOAT NOT NULL,
    title VARCHAR(255) NOT NULL,
    info TEXT DEFAULT '',
    info_show BOOLEAN DEFAULT true,
    backgroundurl TEXT NOT NULL,
    data JSONB,
    download_counter INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT false,
    track BOOLEAN DEFAULT false,
    msg TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    subcategory_id INTEGER REFERENCES poster_subcategories(id),
    apidata JSONB,
    target_organization_type VARCHAR(255),
    templateType VARCHAR(50)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_election_post_details_deleted ON election_post_details(deleted);
CREATE INDEX IF NOT EXISTS idx_election_post_details_published ON election_post_details(published);
CREATE INDEX IF NOT EXISTS idx_election_post_details_title ON election_post_details(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_election_post_details_created_at ON election_post_details(created_at);

-- Optional: Copy existing election templates from post_details to election_post_details
-- Uncomment and run if you have existing election templates to migrate:
-- INSERT INTO election_post_details
--   SELECT * FROM post_details
--   WHERE apidata->>'templateType' IS NOT NULL;
