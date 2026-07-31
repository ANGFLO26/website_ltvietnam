-- === 007 redirects ===
CREATE TABLE ltv.redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_path TEXT NOT NULL UNIQUE,
    target_path TEXT NOT NULL,
    redirect_type INTEGER NOT NULL DEFAULT 301 CHECK (redirect_type IN (301,302)),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
    hit_count BIGINT NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
    last_hit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (source_path <> target_path)
);
