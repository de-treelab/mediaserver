
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_tags_key ON tags (key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique ON tags (key, value) NULLS NOT DISTINCT;

CREATE TABLE IF NOT EXISTS userdata_tags (
  tag_id INTEGER REFERENCES tags(id),
  userdata_id UUID REFERENCES documents(id),
  PRIMARY KEY (tag_id, userdata_id)
);
