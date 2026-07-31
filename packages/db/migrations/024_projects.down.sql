-- Rollback cho 024_projects
DROP INDEX IF EXISTS ltv.idx_projects_customer;
DROP INDEX IF EXISTS ltv.idx_prp_product;
DROP INDEX IF EXISTS ltv.idx_prm_media;
DROP TABLE IF EXISTS ltv.project_media CASCADE;
DROP TABLE IF EXISTS ltv.project_brands CASCADE;
DROP TABLE IF EXISTS ltv.project_services CASCADE;
DROP TABLE IF EXISTS ltv.project_products CASCADE;
DROP TABLE IF EXISTS ltv.project_translations CASCADE;
DROP TABLE IF EXISTS ltv.projects CASCADE;
