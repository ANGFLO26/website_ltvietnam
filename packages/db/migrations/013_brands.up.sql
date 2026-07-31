-- === 013 brands  (gop brand_translations; S1 them ancestor_ids/depth) ===
CREATE TABLE ltv.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.brands(id) ON DELETE SET NULL,
    ancestor_ids UUID[] NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    brand_type VARCHAR(40) NOT NULL
        CHECK (brand_type IN ('manufacturer','sub_brand','global_partner','service_partner','supplier')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    code VARCHAR(80), country_code VARCHAR(3), website_url TEXT,
    logo_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    cover_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id),
    CHECK (NOT (id = ANY(ancestor_ids)))
);
CREATE UNIQUE INDEX uq_brands_code_active ON ltv.brands(code) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_brands_parent ON ltv.brands(parent_id);
CREATE INDEX idx_brands_ancestors ON ltv.brands USING GIN (ancestor_ids);
CREATE INDEX idx_brands_published ON ltv.brands(display_order, id) WHERE status='published' AND deleted_at IS NULL;
CREATE INDEX idx_brands_name_trgm ON ltv.brands USING GIN (name gin_trgm_ops);
