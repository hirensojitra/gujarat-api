CREATE TABLE IF NOT EXISTS election_template_organizations (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(20) REFERENCES election_post_details(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(template_id, organization_id)
);

CREATE TABLE IF NOT EXISTS election_template_candidates (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(20) REFERENCES election_post_details(id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    UNIQUE(template_id, candidate_id)
);
