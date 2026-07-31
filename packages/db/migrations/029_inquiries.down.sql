-- Rollback cho 029_inquiries
DROP INDEX IF EXISTS ltv.idx_inquiries_created;
DROP INDEX IF EXISTS ltv.idx_inquiries_email_status;
DROP INDEX IF EXISTS ltv.idx_inquiries_unhandled;
DROP INDEX IF EXISTS ltv.idx_inquiries_product;
DROP INDEX IF EXISTS ltv.idx_inquiries_service;
DROP TABLE IF EXISTS ltv.inquiries CASCADE;
