-- Rollback cho 026_posts
DROP INDEX IF EXISTS ltv.idx_posts_category;
DROP INDEX IF EXISTS ltv.idx_post_tr_title_trgm;
DROP INDEX IF EXISTS ltv.idx_pp_product;
DROP INDEX IF EXISTS ltv.idx_ptm_media;
DROP TABLE IF EXISTS ltv.post_media CASCADE;
DROP TABLE IF EXISTS ltv.post_brands CASCADE;
DROP TABLE IF EXISTS ltv.post_projects CASCADE;
DROP TABLE IF EXISTS ltv.post_services CASCADE;
DROP TABLE IF EXISTS ltv.post_products CASCADE;
DROP TABLE IF EXISTS ltv.post_translations CASCADE;
DROP TABLE IF EXISTS ltv.posts CASCADE;
