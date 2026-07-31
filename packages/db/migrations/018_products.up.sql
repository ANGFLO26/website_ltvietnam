-- === 018 products  (gop product_translations) ===
CREATE TABLE ltv.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE RESTRICT,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    overview JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    applications_text JSONB NOT NULL DEFAULT '[]'::jsonb,
    principle JSONB NOT NULL DEFAULT '[]'::jsonb,
    sample_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    operating_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    accessories_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    model VARCHAR(255), internal_code VARCHAR(100),
    sku VARCHAR(100),
    product_type VARCHAR(40) NOT NULL DEFAULT 'equipment'
        CHECK (product_type IN ('equipment','spare_part','accessory','consumable','chemical','other')),
    price_visibility VARCHAR(30) NOT NULL DEFAULT 'hidden' CHECK (price_visibility IN ('hidden','visible','contact')),
    sale_mode VARCHAR(30) NOT NULL DEFAULT 'inquiry' CHECK (sale_mode IN ('inquiry','online')),
    requires_configuration BOOLEAN NOT NULL DEFAULT TRUE,
    warranty_months INTEGER CHECK (warranty_months IS NULL OR warranty_months >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    discontinued_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_products_internal_code ON ltv.products(internal_code) WHERE internal_code IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_products_sku ON ltv.products(sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_products_brand ON ltv.products(brand_id);
CREATE INDEX idx_products_model_trgm ON ltv.products USING GIN (model gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON ltv.products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_shortdesc_trgm ON ltv.products USING GIN (short_description gin_trgm_ops);
CREATE INDEX idx_products_public ON ltv.products(published_at DESC) WHERE status='published' AND deleted_at IS NULL;
CREATE INDEX idx_products_featured ON ltv.products(display_order) WHERE is_featured=TRUE AND status='published' AND deleted_at IS NULL;
