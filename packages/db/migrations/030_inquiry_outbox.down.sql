-- Rollback cho 030_inquiry_outbox
DROP INDEX IF EXISTS ltv.idx_outbox_due;
DROP INDEX IF EXISTS ltv.idx_outbox_stale;
DROP TABLE IF EXISTS ltv.inquiry_outbox CASCADE;
