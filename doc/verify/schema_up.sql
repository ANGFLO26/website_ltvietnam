-- =====================================================================
-- LT VIETNAM — SCHEMA BASELINE v1.2.1 (migration 001–070) — schema_up.sql
-- Trích trung thực từ 05_DATABASE_SCHEMA_POSTGRESQL.md (v1.2.1). KHÔNG đổi kiến trúc.
-- PostgreSQL 16+. Chạy trên database RỖNG. Baseline duy nhất active (ADR-013): không có 071.
-- Kỳ vọng: 63 bảng trong schema "ltv"; trigger updated_at tại (block 070).
-- =====================================================================

-- === 001 enable_extensions ===
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- === 002 create_schema ===
CREATE SCHEMA IF NOT EXISTS ltv;
SET search_path TO ltv, public;

-- === 003 updated_at_function ===
CREATE OR REPLACE FUNCTION ltv.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === 004 users ===
CREATE TABLE ltv.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','locked')),
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- === 005 media ===
CREATE TABLE ltv.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_disk VARCHAR(50) NOT NULL DEFAULT 'local',
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT,
    mime_type VARCHAR(150) NOT NULL,
    file_extension VARCHAR(30) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    width INTEGER CHECK (width IS NULL OR width > 0),
    height INTEGER CHECK (height IS NULL OR height > 0),
    checksum VARCHAR(128),
    title VARCHAR(255),
    alt_text_vi VARCHAR(500),
    alt_text_en VARCHAR(500),
    caption_vi TEXT,
    caption_en TEXT,
    credit VARCHAR(255),
    uploaded_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_media_mime_type ON ltv.media(mime_type);
CREATE INDEX idx_media_checksum ON ltv.media(checksum) WHERE checksum IS NOT NULL;
CREATE INDEX idx_media_active ON ltv.media(created_at DESC) WHERE deleted_at IS NULL;

-- === 006 settings ===
CREATE TABLE ltv.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(80) NOT NULL,
    setting_key VARCHAR(120) NOT NULL,
    value TEXT,
    value_type VARCHAR(30) NOT NULL DEFAULT 'string'
        CHECK (value_type IN ('string','integer','boolean','json','encrypted')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_name, setting_key)
);

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

-- === 008 pages ===
CREATE TABLE ltv.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_type VARCHAR(80) NOT NULL UNIQUE,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','published','hidden','archived')),
    is_system_page BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- === 009 page_translations ===
CREATE TABLE ltv.page_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES ltv.pages(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    summary TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255),
    seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (page_id, locale),
    UNIQUE (locale, slug)
);

-- === 010 banners ===
CREATE TABLE ltv.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    mobile_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    link_type VARCHAR(40) NOT NULL DEFAULT 'none'
        CHECK (link_type IN ('product','product_category','brand','service','project','post','page','external_url','none')),
    link_target_id UUID,
    custom_url TEXT,
    open_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    display_order INTEGER NOT NULL DEFAULT 0,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at)
);

-- === 011 banner_translations ===
CREATE TABLE ltv.banner_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_id UUID NOT NULL REFERENCES ltv.banners(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    button_label VARCHAR(100),
    image_alt VARCHAR(500),
    UNIQUE (banner_id, locale)
);

-- === 012 homepage_sections ===
CREATE TABLE ltv.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(80) NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === 013 offices ===
CREATE TABLE ltv.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_type VARCHAR(40) NOT NULL
        CHECK (office_type IN ('head_office','branch','representative_office','service_center','workshop')),
    phone VARCHAR(100), fax VARCHAR(100), email CITEXT,
    map_url TEXT,
    latitude NUMERIC(10,7), longitude NUMERIC(10,7),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

-- === 014 office_translations ===
CREATE TABLE ltv.office_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES ltv.offices(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    working_hours VARCHAR(255),
    description TEXT,
    UNIQUE (office_id, locale)
);

-- === 015 brands ===
CREATE TABLE ltv.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.brands(id) ON DELETE SET NULL,
    brand_type VARCHAR(40) NOT NULL
        CHECK (brand_type IN ('manufacturer','sub_brand','global_partner','service_partner','supplier')),
    code VARCHAR(80), country_code VARCHAR(3), website_url TEXT,
    logo_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    cover_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX uq_brands_code_active ON ltv.brands(code) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_brands_parent ON ltv.brands(parent_id);
CREATE INDEX idx_brands_published ON ltv.brands(display_order, id) WHERE status='published' AND deleted_at IS NULL;

-- === 016 brand_translations ===
CREATE TABLE ltv.brand_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (brand_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_brand_tr_name_trgm ON ltv.brand_translations USING GIN (name gin_trgm_ops);

-- === 017 product_categories ===
CREATE TABLE ltv.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.product_categories(id) ON DELETE SET NULL,
    code VARCHAR(80),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id)
);

-- === 018 product_category_translations ===
CREATE TABLE ltv.product_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.product_categories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    short_description TEXT, description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (category_id, locale), UNIQUE (locale, slug)
);

-- === 019 standards ===
CREATE TABLE ltv.standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization VARCHAR(30) NOT NULL, code VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_standards_org_code ON ltv.standards (UPPER(organization), UPPER(code)) WHERE deleted_at IS NULL;

-- === 020 standard_translations ===
CREATE TABLE ltv.standard_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID NOT NULL REFERENCES ltv.standards(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255), slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (standard_id, locale), UNIQUE (locale, slug)
);

-- === 021 applications ===
CREATE TABLE ltv.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.applications(id) ON DELETE SET NULL,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id)
);

-- === 022 application_translations ===
CREATE TABLE ltv.application_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES ltv.applications(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (application_id, locale), UNIQUE (locale, slug)
);

-- === 023 industries ===
CREATE TABLE ltv.industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- === 024 industry_translations ===
CREATE TABLE ltv.industry_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (industry_id, locale), UNIQUE (locale, slug)
);

-- === 025 products ===
CREATE TABLE ltv.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE RESTRICT,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
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
    published_at TIMESTAMPTZ, discontinued_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_products_internal_code ON ltv.products(internal_code) WHERE internal_code IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_products_sku ON ltv.products(sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_products_brand ON ltv.products(brand_id);
CREATE INDEX idx_products_model_trgm ON ltv.products USING GIN (model gin_trgm_ops);
CREATE INDEX idx_products_public ON ltv.products(published_at DESC) WHERE status='published' AND deleted_at IS NULL;
CREATE INDEX idx_products_featured ON ltv.products(display_order) WHERE is_featured=TRUE AND status='published' AND deleted_at IS NULL;

-- === 026 product_translations ===
CREATE TABLE ltv.product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    overview JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    applications_text JSONB NOT NULL DEFAULT '[]'::jsonb,
    principle JSONB NOT NULL DEFAULT '[]'::jsonb,
    sample_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    operating_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    accessories_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (product_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_product_tr_name_trgm ON ltv.product_translations USING GIN (name gin_trgm_ops);
CREATE INDEX idx_product_tr_shortdesc_trgm ON ltv.product_translations USING GIN (short_description gin_trgm_ops);

-- === 027 product_specifications ===
CREATE TABLE ltv.product_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    group_key VARCHAR(100),
    label_vi VARCHAR(255) NOT NULL, label_en VARCHAR(255),
    value_vi TEXT, value_en TEXT,
    unit VARCHAR(100), display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_specs_product ON ltv.product_specifications(product_id, display_order);

-- === 028 product_category_links ===
CREATE TABLE ltv.product_category_links (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES ltv.product_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, category_id)
);
CREATE UNIQUE INDEX uq_product_primary_category ON ltv.product_category_links(product_id) WHERE is_primary=TRUE;
CREATE INDEX idx_pcl_category ON ltv.product_category_links(category_id, product_id);

-- === 029 product_standards ===
CREATE TABLE ltv.product_standards (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES ltv.standards(id) ON DELETE CASCADE,
    compliance_type VARCHAR(30) NOT NULL DEFAULT 'compliance'
        CHECK (compliance_type IN ('compliance','correlation','specification','reference')),
    note_vi TEXT, note_en TEXT, display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, standard_id, compliance_type)
);
CREATE INDEX idx_ps_standard ON ltv.product_standards(standard_id, product_id);

-- === 030 product_applications ===
CREATE TABLE ltv.product_applications (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES ltv.applications(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, application_id)
);
CREATE UNIQUE INDEX uq_product_primary_application ON ltv.product_applications(product_id) WHERE is_primary=TRUE;

-- === 031 product_industries ===
CREATE TABLE ltv.product_industries (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, industry_id)
);

-- === 032 product_media ===
CREATE TABLE ltv.product_media (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    media_role VARCHAR(30) NOT NULL DEFAULT 'gallery'
        CHECK (media_role IN ('gallery','diagram','application','interface','dimension')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, media_id, media_role)
);

-- === 033 related_products ===
CREATE TABLE ltv.related_products (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL
        CHECK (relation_type IN ('similar','alternative','accessory','compatible','recommended')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, related_product_id, relation_type),
    CHECK (product_id <> related_product_id)
);

-- === 034 services ===
CREATE TABLE ltv.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.services(id) ON DELETE SET NULL,
    service_type VARCHAR(80),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE, display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id)
);

-- === 035 service_translations ===
CREATE TABLE ltv.service_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    overview JSONB NOT NULL DEFAULT '[]'::jsonb, customer_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
    scope_of_work JSONB NOT NULL DEFAULT '[]'::jsonb, process JSONB NOT NULL DEFAULT '[]'::jsonb,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb, faq JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (service_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_service_tr_name_trgm ON ltv.service_translations USING GIN (name gin_trgm_ops);

-- === 036 service_products ===
CREATE TABLE ltv.service_products (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, product_id));

-- === 037 service_brands ===
CREATE TABLE ltv.service_brands (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, brand_id));

-- === 038 service_industries ===
CREATE TABLE ltv.service_industries (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, industry_id));

-- === 039 customers ===
CREATE TABLE ltv.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    industry_id UUID REFERENCES ltv.industries(id) ON DELETE SET NULL,
    website_url TEXT, is_public BOOLEAN NOT NULL DEFAULT FALSE, is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

-- === 040 customer_translations ===
CREATE TABLE ltv.customer_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES ltv.customers(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    short_description TEXT,
    UNIQUE (customer_id, locale)
);

-- === 041 projects ===
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
    is_featured BOOLEAN NOT NULL DEFAULT FALSE, published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ,
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

-- === 042 project_translations ===
CREATE TABLE ltv.project_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    title VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    short_description TEXT,
    scope_of_work JSONB NOT NULL DEFAULT '[]'::jsonb, implementation JSONB NOT NULL DEFAULT '[]'::jsonb, result JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_display_name VARCHAR(255),
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (project_id, locale), UNIQUE (locale, slug)
);

-- === 043 project_products ===
CREATE TABLE ltv.project_products (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    note_vi TEXT, note_en TEXT, PRIMARY KEY (project_id, product_id));

-- === 044 project_services ===
CREATE TABLE ltv.project_services (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, service_id));

-- === 045 project_brands ===
CREATE TABLE ltv.project_brands (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, brand_id));

-- === 046 project_media ===
CREATE TABLE ltv.project_media (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    caption_vi TEXT, caption_en TEXT, display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, media_id));

-- === 047 post_categories ===
CREATE TABLE ltv.post_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.post_categories(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (parent_id IS NULL OR parent_id <> id)
);

-- === 048 post_category_translations ===
CREATE TABLE ltv.post_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.post_categories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (category_id, locale), UNIQUE (locale, slug)
);

-- === 049 posts ===
CREATE TABLE ltv.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.post_categories(id) ON DELETE RESTRICT,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    author_id UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE, published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

-- === 050 post_translations ===
CREATE TABLE ltv.post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    title VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    excerpt TEXT, content JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (post_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_post_tr_title_trgm ON ltv.post_translations USING GIN (title gin_trgm_ops);

-- === 051 post_products ===
CREATE TABLE ltv.post_products (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, PRIMARY KEY(post_id,product_id));
-- === 052 post_services ===
CREATE TABLE ltv.post_services (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(post_id,service_id));
-- === 053 post_projects ===
CREATE TABLE ltv.post_projects (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE, PRIMARY KEY(post_id,project_id));
-- === 054 post_brands ===
CREATE TABLE ltv.post_brands (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(post_id,brand_id));
-- === 055 post_media ===
CREATE TABLE ltv.post_media (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT, display_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(post_id,media_id));

-- === 056 documents ===
CREATE TABLE ltv.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(40) NOT NULL
        CHECK (document_type IN ('catalogue','brochure','datasheet','application_note','company_profile','manual','certificate','other')),  -- v1.2: bỏ 'video' (ADR-012)
    file_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    language VARCHAR(10) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi','en','multi')),
    version VARCHAR(100), publication_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    visibility VARCHAR(30) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public','hidden','email_required','customer_only','staff_only')),
    download_count BIGINT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

-- === 057 document_translations ===
CREATE TABLE ltv.document_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    title VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (document_id, locale), UNIQUE (locale, slug)
);

-- === 058 document_products ===
CREATE TABLE ltv.document_products (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, PRIMARY KEY(document_id,product_id));
-- === 059 document_brands ===
CREATE TABLE ltv.document_brands (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(document_id,brand_id));
-- === 060 document_services ===
CREATE TABLE ltv.document_services (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(document_id,service_id));
-- === 061 document_posts ===
CREATE TABLE ltv.document_posts (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, PRIMARY KEY(document_id,post_id));

-- === 062 menus ===
CREATE TABLE ltv.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
    location VARCHAR(50) NOT NULL
        CHECK (location IN ('header','mobile','footer_company','footer_products','footer_services','footer_legal')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === 063 menu_items ===
CREATE TABLE ltv.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES ltv.menus(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES ltv.menu_items(id) ON DELETE CASCADE,
    link_type VARCHAR(40) NOT NULL
        CHECK (link_type IN ('page','product_category','brand','service','post_category','product','post','custom_url','none')),
    link_target_id UUID, custom_url TEXT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    open_new_tab BOOLEAN NOT NULL DEFAULT FALSE, display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX idx_menu_items_menu ON ltv.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent ON ltv.menu_items(parent_id);

-- === 064 menu_item_translations ===
CREATE TABLE ltv.menu_item_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES ltv.menu_items(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    label VARCHAR(150) NOT NULL, title_attribute VARCHAR(255),
    UNIQUE (menu_item_id, locale)
);

-- === 065 inquiries ===
CREATE TABLE ltv.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_type VARCHAR(40) NOT NULL
        CHECK (inquiry_type IN ('quotation','product_consultation','technical_support','maintenance_repair','partnership','general_contact')),
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email CITEXT NOT NULL,
    message TEXT NOT NULL,
    product_id UUID REFERENCES ltv.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES ltv.services(id) ON DELETE SET NULL,
    source_url TEXT,
    locale VARCHAR(5) NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi','en')),
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone','email','zalo','any')),
    province VARCHAR(120),
    privacy_consent_at TIMESTAMPTZ NOT NULL,
    email_status VARCHAR(20) NOT NULL DEFAULT 'email_pending'         -- v1.2: bỏ 'received' (ADR-003)
        CHECK (email_status IN ('email_pending','email_sent','email_failed')),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    ip_address INET, user_agent TEXT, captcha_score NUMERIC(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ                                  -- nullable, KHÔNG default; retention TBD (ADR-003)
);
CREATE INDEX idx_inquiries_created ON ltv.inquiries(created_at DESC);
CREATE INDEX idx_inquiries_email_status ON ltv.inquiries(email_status);

-- === 066 inquiry_outbox ===
CREATE TABLE ltv.inquiry_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES ltv.inquiries(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',
    recipient TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','processing','sent','failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (inquiry_id, channel, recipient)
);
CREATE INDEX idx_outbox_due ON ltv.inquiry_outbox(status, next_attempt_at) WHERE status='pending';
CREATE INDEX idx_outbox_stale ON ltv.inquiry_outbox(locked_at) WHERE status='processing';

-- === 067 foreign_key_indexes (chỉ các FK chưa có index inline) ===
CREATE INDEX idx_categories_parent_id      ON ltv.product_categories(parent_id);
CREATE INDEX idx_services_parent_id        ON ltv.services(parent_id);
CREATE INDEX idx_applications_parent_id    ON ltv.applications(parent_id);
CREATE INDEX idx_post_categories_parent_id ON ltv.post_categories(parent_id);
CREATE INDEX idx_projects_customer_id      ON ltv.projects(customer_id);
CREATE INDEX idx_posts_category_id         ON ltv.posts(category_id);
CREATE INDEX idx_service_products_product  ON ltv.service_products(product_id, service_id);
CREATE INDEX idx_project_products_product  ON ltv.project_products(product_id, project_id);
CREATE INDEX idx_post_products_product     ON ltv.post_products(product_id, post_id);
CREATE INDEX idx_document_products_product ON ltv.document_products(product_id, document_id);
CREATE INDEX idx_inquiries_product         ON ltv.inquiries(product_id);
CREATE INDEX idx_inquiries_service         ON ltv.inquiries(service_id);

-- === 068 search_indexes ===
-- (GIN trgm cho product/brand/service/post translations + products.model đã tạo inline ở các block trên.)

-- === 069 partial_indexes (public — chưa có inline cho posts/projects) ===
CREATE INDEX idx_posts_public    ON ltv.posts(published_at DESC)    WHERE status='published' AND deleted_at IS NULL;
CREATE INDEX idx_projects_public ON ltv.projects(published_at DESC) WHERE status='published' AND deleted_at IS NULL;

-- === 070 updated_at_triggers (mọi bảng có updated_at — ADR-013) ===
CREATE TRIGGER trg_users_updated_at                 BEFORE UPDATE ON ltv.users                 FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_settings_updated_at              BEFORE UPDATE ON ltv.settings              FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_redirects_updated_at             BEFORE UPDATE ON ltv.redirects             FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_pages_updated_at                 BEFORE UPDATE ON ltv.pages                 FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_banners_updated_at               BEFORE UPDATE ON ltv.banners               FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_homepage_sections_updated_at     BEFORE UPDATE ON ltv.homepage_sections     FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_offices_updated_at               BEFORE UPDATE ON ltv.offices               FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_brands_updated_at                BEFORE UPDATE ON ltv.brands                FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_product_categories_updated_at    BEFORE UPDATE ON ltv.product_categories    FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_standards_updated_at             BEFORE UPDATE ON ltv.standards             FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_applications_updated_at          BEFORE UPDATE ON ltv.applications          FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_industries_updated_at            BEFORE UPDATE ON ltv.industries            FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_products_updated_at              BEFORE UPDATE ON ltv.products              FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_product_specifications_updated_at BEFORE UPDATE ON ltv.product_specifications FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_services_updated_at              BEFORE UPDATE ON ltv.services              FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_customers_updated_at             BEFORE UPDATE ON ltv.customers             FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_projects_updated_at              BEFORE UPDATE ON ltv.projects              FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_post_categories_updated_at       BEFORE UPDATE ON ltv.post_categories       FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_posts_updated_at                 BEFORE UPDATE ON ltv.posts                 FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_documents_updated_at             BEFORE UPDATE ON ltv.documents             FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_menus_updated_at                 BEFORE UPDATE ON ltv.menus                 FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_menu_items_updated_at            BEFORE UPDATE ON ltv.menu_items            FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
CREATE TRIGGER trg_inquiry_outbox_updated_at        BEFORE UPDATE ON ltv.inquiry_outbox        FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();

-- =====================================================================
-- HẾT schema_up.sql — baseline 001–070. Kỳ vọng: 63 bảng, 23 trigger updated_at.
-- =====================================================================
