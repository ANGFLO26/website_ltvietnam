-- =====================================================================
-- LT VIETNAM — ROLLBACK baseline v1.2.1 (070 → 001) — schema_down.sql
-- Đảo thứ tự schema_up.sql. Trigger + index tự bị xóa cùng bảng khi DROP TABLE.
-- Thứ tự DROP = ngược thứ tự CREATE ⇒ luôn an toàn FK (không cần CASCADE).
-- =====================================================================
SET search_path TO ltv, public;

-- === 070 drop triggers (tự xóa khi DROP TABLE; liệt kê tường minh cho rõ 070→001) ===
DROP TRIGGER IF EXISTS trg_inquiry_outbox_updated_at        ON ltv.inquiry_outbox;
DROP TRIGGER IF EXISTS trg_menu_items_updated_at            ON ltv.menu_items;
DROP TRIGGER IF EXISTS trg_menus_updated_at                 ON ltv.menus;
DROP TRIGGER IF EXISTS trg_documents_updated_at             ON ltv.documents;
DROP TRIGGER IF EXISTS trg_posts_updated_at                 ON ltv.posts;
DROP TRIGGER IF EXISTS trg_post_categories_updated_at       ON ltv.post_categories;
DROP TRIGGER IF EXISTS trg_projects_updated_at              ON ltv.projects;
DROP TRIGGER IF EXISTS trg_customers_updated_at             ON ltv.customers;
DROP TRIGGER IF EXISTS trg_services_updated_at              ON ltv.services;
DROP TRIGGER IF EXISTS trg_product_specifications_updated_at ON ltv.product_specifications;
DROP TRIGGER IF EXISTS trg_products_updated_at              ON ltv.products;
DROP TRIGGER IF EXISTS trg_industries_updated_at            ON ltv.industries;
DROP TRIGGER IF EXISTS trg_applications_updated_at          ON ltv.applications;
DROP TRIGGER IF EXISTS trg_standards_updated_at             ON ltv.standards;
DROP TRIGGER IF EXISTS trg_product_categories_updated_at    ON ltv.product_categories;
DROP TRIGGER IF EXISTS trg_brands_updated_at                ON ltv.brands;
DROP TRIGGER IF EXISTS trg_offices_updated_at               ON ltv.offices;
DROP TRIGGER IF EXISTS trg_homepage_sections_updated_at     ON ltv.homepage_sections;
DROP TRIGGER IF EXISTS trg_banners_updated_at               ON ltv.banners;
DROP TRIGGER IF EXISTS trg_pages_updated_at                 ON ltv.pages;
DROP TRIGGER IF EXISTS trg_redirects_updated_at             ON ltv.redirects;
DROP TRIGGER IF EXISTS trg_settings_updated_at              ON ltv.settings;
DROP TRIGGER IF EXISTS trg_users_updated_at                 ON ltv.users;

-- === 066 → 004 drop tables (ngược thứ tự tạo; index tự xóa theo bảng) ===
DROP TABLE IF EXISTS ltv.inquiry_outbox;
DROP TABLE IF EXISTS ltv.inquiries;
DROP TABLE IF EXISTS ltv.menu_item_translations;
DROP TABLE IF EXISTS ltv.menu_items;
DROP TABLE IF EXISTS ltv.menus;
DROP TABLE IF EXISTS ltv.document_posts;
DROP TABLE IF EXISTS ltv.document_services;
DROP TABLE IF EXISTS ltv.document_brands;
DROP TABLE IF EXISTS ltv.document_products;
DROP TABLE IF EXISTS ltv.document_translations;
DROP TABLE IF EXISTS ltv.documents;
DROP TABLE IF EXISTS ltv.post_media;
DROP TABLE IF EXISTS ltv.post_brands;
DROP TABLE IF EXISTS ltv.post_projects;
DROP TABLE IF EXISTS ltv.post_services;
DROP TABLE IF EXISTS ltv.post_products;
DROP TABLE IF EXISTS ltv.post_translations;
DROP TABLE IF EXISTS ltv.posts;
DROP TABLE IF EXISTS ltv.post_category_translations;
DROP TABLE IF EXISTS ltv.post_categories;
DROP TABLE IF EXISTS ltv.project_media;
DROP TABLE IF EXISTS ltv.project_brands;
DROP TABLE IF EXISTS ltv.project_services;
DROP TABLE IF EXISTS ltv.project_products;
DROP TABLE IF EXISTS ltv.project_translations;
DROP TABLE IF EXISTS ltv.projects;
DROP TABLE IF EXISTS ltv.customer_translations;
DROP TABLE IF EXISTS ltv.customers;
DROP TABLE IF EXISTS ltv.service_industries;
DROP TABLE IF EXISTS ltv.service_brands;
DROP TABLE IF EXISTS ltv.service_products;
DROP TABLE IF EXISTS ltv.service_translations;
DROP TABLE IF EXISTS ltv.services;
DROP TABLE IF EXISTS ltv.related_products;
DROP TABLE IF EXISTS ltv.product_media;
DROP TABLE IF EXISTS ltv.product_industries;
DROP TABLE IF EXISTS ltv.product_applications;
DROP TABLE IF EXISTS ltv.product_standards;
DROP TABLE IF EXISTS ltv.product_category_links;
DROP TABLE IF EXISTS ltv.product_specifications;
DROP TABLE IF EXISTS ltv.product_translations;
DROP TABLE IF EXISTS ltv.products;
DROP TABLE IF EXISTS ltv.industry_translations;
DROP TABLE IF EXISTS ltv.industries;
DROP TABLE IF EXISTS ltv.application_translations;
DROP TABLE IF EXISTS ltv.applications;
DROP TABLE IF EXISTS ltv.standard_translations;
DROP TABLE IF EXISTS ltv.standards;
DROP TABLE IF EXISTS ltv.product_category_translations;
DROP TABLE IF EXISTS ltv.product_categories;
DROP TABLE IF EXISTS ltv.brand_translations;
DROP TABLE IF EXISTS ltv.brands;
DROP TABLE IF EXISTS ltv.office_translations;
DROP TABLE IF EXISTS ltv.offices;
DROP TABLE IF EXISTS ltv.homepage_sections;
DROP TABLE IF EXISTS ltv.banner_translations;
DROP TABLE IF EXISTS ltv.banners;
DROP TABLE IF EXISTS ltv.page_translations;
DROP TABLE IF EXISTS ltv.pages;
DROP TABLE IF EXISTS ltv.redirects;
DROP TABLE IF EXISTS ltv.settings;
DROP TABLE IF EXISTS ltv.media;
DROP TABLE IF EXISTS ltv.users;

-- === 003 drop function ===
DROP FUNCTION IF EXISTS ltv.set_updated_at();

-- === 002 drop schema (đã rỗng) ===
DROP SCHEMA IF EXISTS ltv;

-- === 001 drop extensions ===
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;

-- =====================================================================
-- Đường tắt reset nhanh (KHÔNG dùng cho rollback tường minh 070→001):
--   DROP SCHEMA IF EXISTS ltv CASCADE;
--   DROP EXTENSION IF EXISTS pg_trgm; DROP EXTENSION IF EXISTS citext; DROP EXTENSION IF EXISTS pgcrypto;
-- =====================================================================
