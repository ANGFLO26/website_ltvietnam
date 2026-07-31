-- === 003 updated_at_function ===
CREATE OR REPLACE FUNCTION ltv.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
