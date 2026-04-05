-- PostgreSQL schema for tracking poster downloads
CREATE TABLE IF NOT EXISTS KeySet (
  id SERIAL PRIMARY KEY,
  img_id VARCHAR(255) NOT NULL,
  keys_array JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS ValueSet (
  id SERIAL PRIMARY KEY,
  key_set_id INTEGER REFERENCES KeySet(id),
  value_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
