-- === 029 projects  (GIU translation) ===
CREATE TABLE ltv.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES ltv.customers(id) ON DELETE SET NULL,
    project_type VARCHAR(40) NOT NULL
        CHECK (project_type IN ('installation','commissioning','handover','training','maintenance','repair','fabrication','case_study','other')),
    customer_visibility VARCHAR(30) NOT NULL DEFAULT 'public'
        CHECK (customer_visibility IN ('public','hide_name','industry_only','confidential')),
    location_text VARCHAR(500), country_code VARCHAR(3),
    started_at DATE, completed_at DATE,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);
CREATE INDEX idx_projects_customer ON ltv.projects(customer_id);

CREATE TABLE ltv.project_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('en','vi')),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    scope_of_work JSONB NOT NULL DEFAULT '[]'::jsonb,
    implementation JSONB NOT NULL DEFAULT '[]'::jsonb,
    result JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_display_name VARCHAR(255),
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, locale), UNIQUE (locale, slug)
);

CREATE TABLE ltv.project_products (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    note TEXT, display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, product_id));
CREATE INDEX idx_prp_product ON ltv.project_products(product_id);
CREATE TABLE ltv.project_services (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, service_id));
CREATE TABLE ltv.project_brands (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, brand_id));
CREATE TABLE ltv.project_media (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    caption TEXT, display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, media_id));
CREATE INDEX idx_prm_media ON ltv.project_media(media_id);
