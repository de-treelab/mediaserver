
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  base_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);
