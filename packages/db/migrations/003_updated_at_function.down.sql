-- Rollback cho 003_updated_at_function
DROP FUNCTION IF EXISTS ltv.set_updated_at() CASCADE;
