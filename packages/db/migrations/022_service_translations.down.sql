-- Rollback cho 022_service_translations
DROP INDEX IF EXISTS ltv.idx_service_tr_name_trgm;
DROP INDEX IF EXISTS ltv.idx_sp_product;
DROP TABLE IF EXISTS ltv.service_industries CASCADE;
DROP TABLE IF EXISTS ltv.service_brands CASCADE;
DROP TABLE IF EXISTS ltv.service_products CASCADE;
DROP TABLE IF EXISTS ltv.service_translations CASCADE;
