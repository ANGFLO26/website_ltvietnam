-- === 006 settings ===
CREATE TABLE ltv.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(80) NOT NULL,
    setting_key VARCHAR(120) NOT NULL,
    value TEXT,
    value_type VARCHAR(30) NOT NULL DEFAULT 'string'
        CHECK (value_type IN ('string','integer','boolean','json','encrypted')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_name, setting_key)
);
