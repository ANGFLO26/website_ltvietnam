-- Rollback cho 015_standards
DROP INDEX IF EXISTS ltv.uq_standards_org_code;
DROP INDEX IF EXISTS ltv.idx_standards_code_trgm;
DROP INDEX IF EXISTS ltv.idx_standards_name_trgm;
DROP TABLE IF EXISTS ltv.standards CASCADE;
