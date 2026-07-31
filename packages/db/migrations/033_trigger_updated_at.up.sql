-- === 038 trigger updated_at ===
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname='ltv' AND c.relkind='r' AND a.attname='updated_at' AND a.attnum>0
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON ltv.%I FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();', t, t);
  END LOOP;
END $$;
