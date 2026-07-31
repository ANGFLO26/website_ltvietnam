-- === 027 service_translations  (S4 updated_at) ===
CREATE TABLE ltv.service_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('en','vi')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    overview JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
    scope_of_work JSONB NOT NULL DEFAULT '[]'::jsonb,
    process JSONB NOT NULL DEFAULT '[]'::jsonb,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    faq JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_service_tr_name_trgm ON ltv.service_translations USING GIN (name gin_trgm_ops);

CREATE TABLE ltv.service_products (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (service_id, product_id));
CREATE INDEX idx_sp_product ON ltv.service_products(product_id);
CREATE TABLE ltv.service_brands (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, brand_id));
CREATE TABLE ltv.service_industries (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, industry_id));
