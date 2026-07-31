-- Rollback cho 019_product_specifications
DROP INDEX IF EXISTS ltv.idx_product_specs_product;
DROP TABLE IF EXISTS ltv.product_specifications CASCADE;
