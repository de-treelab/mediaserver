-- The primary key (tag_id, userdata_id) only serves lookups by tag. Lookups of
-- the tags of a document (preview, bulk edit, deleting / merging documents and
-- the foreign key check on document deletion) would otherwise scan the table.
CREATE INDEX IF NOT EXISTS idx_userdata_tags_userdata_id ON userdata_tags (userdata_id, tag_id);
