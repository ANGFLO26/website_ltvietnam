-- Rollback cho 021_services
DROP INDEX IF EXISTS ltv.idx_services_parent;
DROP INDEX IF EXISTS ltv.idx_services_ancestors;
DROP TABLE IF EXISTS ltv.services CASCADE;
