-- =====================================================================
-- LT VIETNAM — SCHEMA BASELINE v1.3 — schema_down.sql
--
-- Day la rollback TOAN KHOI cho baseline dang mot file, dung cho
-- database dung mot lan khi kiem chung. KHONG dung tren production.
--
-- Khi P1 chia baseline thanh tung migration rieng, moi migration phai co
-- file down rieng dao dung doi tuong no tao ra (yeu cau CASE B cua ke hoach).
-- File nay khi do tro thanh rollback tong hop, khong thay the cac down rieng.
--
-- Production KHONG rollback bang down: dung restore + forward fix (D5).
-- =====================================================================

DROP SCHEMA IF EXISTS ltv CASCADE;

-- Extension dung chung toan database, KHONG drop tu dong.
-- Bo comment ba dong duoi neu chac chan khong co schema nao khac dung chung.
-- DROP EXTENSION IF EXISTS pg_trgm;
-- DROP EXTENSION IF EXISTS citext;
-- DROP EXTENSION IF EXISTS pgcrypto;
