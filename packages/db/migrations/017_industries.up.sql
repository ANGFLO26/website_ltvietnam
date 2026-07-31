-- === 017 industries  (gop translations; S3 is_featured) ===
CREATE TABLE ltv.industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
