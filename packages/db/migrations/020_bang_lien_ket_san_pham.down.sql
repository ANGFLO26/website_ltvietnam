-- Rollback cho 020_bang_lien_ket_san_pham
DROP INDEX IF EXISTS ltv.uq_product_primary_category;
DROP INDEX IF EXISTS ltv.idx_pcl_category;
DROP INDEX IF EXISTS ltv.idx_ps_standard;
DROP INDEX IF EXISTS ltv.uq_product_primary_application;
DROP INDEX IF EXISTS ltv.idx_pa_application;
DROP INDEX IF EXISTS ltv.idx_pi_industry;
DROP INDEX IF EXISTS ltv.idx_pm_media;
DROP TABLE IF EXISTS ltv.related_products CASCADE;
DROP TABLE IF EXISTS ltv.product_media CASCADE;
DROP TABLE IF EXISTS ltv.product_industries CASCADE;
DROP TABLE IF EXISTS ltv.product_applications CASCADE;
DROP TABLE IF EXISTS ltv.product_standards CASCADE;
DROP TABLE IF EXISTS ltv.product_category_links CASCADE;
