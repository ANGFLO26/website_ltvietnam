-- === 030 post_categories  (gop translations; S1 cay; them deleted_at) ===
CREATE TABLE ltv.post_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.post_categories(id) ON DELETE SET NULL,
    ancestor_ids UUID[] NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id),
    CHECK (NOT (id = ANY(ancestor_ids)))
);
CREATE INDEX idx_postcat_parent ON ltv.post_categories(parent_id);
CREATE INDEX idx_postcat_ancestors ON ltv.post_categories USING GIN (ancestor_ids);
