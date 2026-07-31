-- Rollback cho 027_documents
DROP INDEX IF EXISTS ltv.idx_documents_file;
DROP INDEX IF EXISTS ltv.idx_dp_product;
DROP TABLE IF EXISTS ltv.document_posts CASCADE;
DROP TABLE IF EXISTS ltv.document_services CASCADE;
DROP TABLE IF EXISTS ltv.document_brands CASCADE;
DROP TABLE IF EXISTS ltv.document_products CASCADE;
DROP TABLE IF EXISTS ltv.documents CASCADE;
