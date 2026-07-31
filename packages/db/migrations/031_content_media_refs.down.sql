-- Rollback cho 031_content_media_refs
DROP INDEX IF EXISTS ltv.idx_cmr_media;
DROP INDEX IF EXISTS ltv.idx_cmr_entity;
DROP TABLE IF EXISTS ltv.content_media_refs CASCADE;
