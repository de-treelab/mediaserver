-- Keyset pagination orders documents by (created_at, id); id breaks ties between
-- documents created within the same transaction (identical NOW()).
CREATE INDEX IF NOT EXISTS idx_documents_created_at_id ON documents (created_at, id);
