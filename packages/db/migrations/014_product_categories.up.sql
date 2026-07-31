-- === 014 product_categories  (gop translations; S1 cay) ===
CREATE TABLE ltv.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.product_categories(id) ON DELETE SET NULL,
    ancestor_ids UUID[] NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    code VARCHAR(80),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id),
    CHECK (NOT (id = ANY(ancestor_ids)))
);
CREATE INDEX idx_pcat_parent ON ltv.product_categories(parent_id);
CREATE INDEX idx_pcat_ancestors ON ltv.product_categories USING GIN (ancestor_ids);
CREATE INDEX idx_pcat_name_trgm ON ltv.product_categories USING GIN (name gin_trgm_ops);
