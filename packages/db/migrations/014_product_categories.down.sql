-- Rollback cho 014_product_categories
DROP INDEX IF EXISTS ltv.idx_pcat_parent;
DROP INDEX IF EXISTS ltv.idx_pcat_ancestors;
DROP INDEX IF EXISTS ltv.idx_pcat_name_trgm;
DROP TABLE IF EXISTS ltv.product_categories CASCADE;
