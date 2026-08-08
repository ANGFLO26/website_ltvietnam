-- Rollback cho 034_redirect_source_lower
DROP INDEX IF EXISTS ltv.idx_redirects_source_lower;
