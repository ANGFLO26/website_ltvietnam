-- Rollback cho 005_media
DROP INDEX IF EXISTS ltv.idx_media_mime_type;
DROP INDEX IF EXISTS ltv.idx_media_checksum;
DROP INDEX IF EXISTS ltv.idx_media_active;
DROP INDEX IF EXISTS ltv.idx_media_storage_class;
DROP TABLE IF EXISTS ltv.media CASCADE;
