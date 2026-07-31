-- Rollback cho 018_products
DROP INDEX IF EXISTS ltv.uq_products_internal_code;
DROP INDEX IF EXISTS ltv.uq_products_sku;
DROP INDEX IF EXISTS ltv.idx_products_brand;
DROP INDEX IF EXISTS ltv.idx_products_model_trgm;
DROP INDEX IF EXISTS ltv.idx_products_name_trgm;
DROP INDEX IF EXISTS ltv.idx_products_shortdesc_trgm;
DROP INDEX IF EXISTS ltv.idx_products_public;
DROP INDEX IF EXISTS ltv.idx_products_featured;
DROP TABLE IF EXISTS ltv.products CASCADE;
