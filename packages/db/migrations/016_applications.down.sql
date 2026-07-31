-- Rollback cho 016_applications
DROP INDEX IF EXISTS ltv.idx_app_parent;
DROP INDEX IF EXISTS ltv.idx_app_ancestors;
DROP INDEX IF EXISTS ltv.idx_app_name_trgm;
DROP TABLE IF EXISTS ltv.applications CASCADE;
