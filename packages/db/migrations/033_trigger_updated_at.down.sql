-- Rollback cho 033_trigger_updated_at
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT c.relname, g.tgname FROM pg_trigger g
           JOIN pg_class c ON c.oid=g.tgrelid
           JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='ltv' AND NOT g.tgisinternal
  LOOP EXECUTE format('DROP TRIGGER IF EXISTS %I ON ltv.%I;', t.tgname, t.relname); END LOOP;
END $$;
