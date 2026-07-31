-- Rollback cho 023_customers
DROP INDEX IF EXISTS ltv.idx_customers_industry;
DROP TABLE IF EXISTS ltv.customers CASCADE;
