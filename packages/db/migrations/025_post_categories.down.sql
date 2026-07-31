-- Rollback cho 025_post_categories
DROP INDEX IF EXISTS ltv.idx_postcat_parent;
DROP INDEX IF EXISTS ltv.idx_postcat_ancestors;
DROP TABLE IF EXISTS ltv.post_categories CASCADE;
