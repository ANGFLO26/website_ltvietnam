-- === 028 customers  (gop customer_translations) ===
CREATE TABLE ltv.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    short_description TEXT,
    logo_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    industry_id UUID REFERENCES ltv.industries(id) ON DELETE SET NULL,
    website_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_customers_industry ON ltv.customers(industry_id);
