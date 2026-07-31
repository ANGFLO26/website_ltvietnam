-- Rollback cho 013_brands
DROP INDEX IF EXISTS ltv.uq_brands_code_active;
DROP INDEX IF EXISTS ltv.idx_brands_parent;
DROP INDEX IF EXISTS ltv.idx_brands_ancestors;
DROP INDEX IF EXISTS ltv.idx_brands_published;
DROP INDEX IF EXISTS ltv.idx_brands_name_trgm;
DROP TABLE IF EXISTS ltv.brands CASCADE;
