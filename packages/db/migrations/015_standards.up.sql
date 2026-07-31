-- === 015 standards  (gop translations; S3 is_featured; S2 trgm) ===
CREATE TABLE ltv.standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization VARCHAR(30) NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(255),
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_standards_org_code ON ltv.standards (UPPER(organization), UPPER(code)) WHERE deleted_at IS NULL;
CREATE INDEX idx_standards_code_trgm ON ltv.standards USING GIN (code gin_trgm_ops);
CREATE INDEX idx_standards_name_trgm ON ltv.standards USING GIN (name gin_trgm_ops);
