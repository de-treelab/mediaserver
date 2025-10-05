
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_tags_key ON tags (key);

CREATE TABLE userdata_tags (
  tag_id INTEGER REFERENCES tags(id),
  userdata_id UUID REFERENCES documents(id),
  PRIMARY KEY (tag_id, userdata_id)
);
