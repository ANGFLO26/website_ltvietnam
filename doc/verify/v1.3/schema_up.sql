-- =====================================================================
-- LT VIETNAM — SCHEMA BASELINE v1.3 — schema_up.sql
-- Thay doi so voi v1.2.1:
--   1. Bo 12 bang translation, gop truong vao bang cha (noi dung tieng Anh).
--      Giu 4 bang translation: pages, posts, services, projects.
--   2. S1  them ancestor_ids + depth cho 5 bang cay -> loc theo nhanh con.
--   3. S2  them index trigram cho danh muc / tieu chuan / ung dung.
--   4. S3  them is_featured cho standards / applications / industries.
--   5. S4  them updated_at + trigger cho 4 bang translation con lai.
--   6. S6  inquiries: company_name/phone/email nullable + CHECK co it nhat mot lien lac.
--   7. S7  media.variants JSONB.
--   8. them content_media_refs -> MediaUsageService quet duoc media trong content block.
--   9. post_categories them deleted_at; inquiries them handled_at/handled_by.
-- PostgreSQL 16+. Chay tren database RONG.
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

-- === 005 media  (S7: them variants) ===
CREATE TABLE ltv.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_disk VARCHAR(50) NOT NULL DEFAULT 'local',
    storage_class VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (storage_class IN ('public','protected','temp','quarantine')),
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT,
    variants JSONB NOT NULL DEFAULT '{}'::jsonb,
    mime_type VARCHAR(150) NOT NULL,
    file_extension VARCHAR(30) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    width INTEGER CHECK (width IS NULL OR width > 0),
    height INTEGER CHECK (height IS NULL OR height > 0),
    checksum VARCHAR(128),
    title VARCHAR(255),
    alt_text VARCHAR(500),
    caption TEXT,
    credit VARCHAR(255),
    uploaded_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    purged_at TIMESTAMPTZ
);
CREATE INDEX idx_media_mime_type ON ltv.media(mime_type);
CREATE INDEX idx_media_checksum ON ltv.media(checksum) WHERE checksum IS NOT NULL;
CREATE INDEX idx_media_active ON ltv.media(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_storage_class ON ltv.media(storage_class);

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

-- === 008 pages  (GIU translation) ===
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

-- === 009 page_translations  (S4: them updated_at) ===
CREATE TABLE ltv.page_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES ltv.pages(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('en','vi')),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    summary TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255),
    seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, locale),
    UNIQUE (locale, slug)
);

-- === 010 banners  (gop banner_translations) ===
CREATE TABLE ltv.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    mobile_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    button_label VARCHAR(100),
    image_alt VARCHAR(500),
    link_type VARCHAR(40) NOT NULL DEFAULT 'none'
        CHECK (link_type IN ('product','product_category','brand','service','project','post','page','custom_url','none')),
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

-- === 011 homepage_sections ===
CREATE TABLE ltv.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(80) NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === 012 offices  (gop office_translations) ===
CREATE TABLE ltv.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_type VARCHAR(40) NOT NULL
        CHECK (office_type IN ('head_office','branch','representative_office','service_center','workshop')),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    working_hours VARCHAR(255),
    description TEXT,
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

-- === 016 applications  (gop translations; S1 cay; S3 is_featured; S2 trgm) ===
CREATE TABLE ltv.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.applications(id) ON DELETE SET NULL,
    ancestor_ids UUID[] NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
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
CREATE INDEX idx_app_parent ON ltv.applications(parent_id);
CREATE INDEX idx_app_ancestors ON ltv.applications USING GIN (ancestor_ids);
CREATE INDEX idx_app_name_trgm ON ltv.applications USING GIN (name gin_trgm_ops);

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

-- === 019 product_specifications  (gop *_vi/_en) ===
CREATE TABLE ltv.product_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    group_key VARCHAR(100),
    label VARCHAR(255) NOT NULL,
    value TEXT,
    unit VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_specs_product ON ltv.product_specifications(product_id, display_order);

-- === 020-025 bang lien ket san pham ===
CREATE TABLE ltv.product_category_links (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES ltv.product_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, category_id)
);
CREATE UNIQUE INDEX uq_product_primary_category ON ltv.product_category_links(product_id) WHERE is_primary=TRUE;
CREATE INDEX idx_pcl_category ON ltv.product_category_links(category_id, product_id);

CREATE TABLE ltv.product_standards (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES ltv.standards(id) ON DELETE CASCADE,
    compliance_type VARCHAR(30) NOT NULL DEFAULT 'compliance'
        CHECK (compliance_type IN ('compliance','correlation','specification','reference')),
    note TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, standard_id, compliance_type)
);
CREATE INDEX idx_ps_standard ON ltv.product_standards(standard_id, product_id);

CREATE TABLE ltv.product_applications (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES ltv.applications(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, application_id)
);
CREATE UNIQUE INDEX uq_product_primary_application ON ltv.product_applications(product_id) WHERE is_primary=TRUE;
CREATE INDEX idx_pa_application ON ltv.product_applications(application_id, product_id);

CREATE TABLE ltv.product_industries (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, industry_id)
);
CREATE INDEX idx_pi_industry ON ltv.product_industries(industry_id, product_id);

CREATE TABLE ltv.product_media (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    media_role VARCHAR(30) NOT NULL DEFAULT 'gallery'
        CHECK (media_role IN ('gallery','diagram','application','interface','dimension')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, media_id, media_role)
);
CREATE INDEX idx_pm_media ON ltv.product_media(media_id);

CREATE TABLE ltv.related_products (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL
        CHECK (relation_type IN ('similar','alternative','accessory','compatible','recommended')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, related_product_id, relation_type),
    CHECK (product_id <> related_product_id)
);

-- === 026 services  (GIU translation; S1 cay) ===
CREATE TABLE ltv.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.services(id) ON DELETE SET NULL,
    ancestor_ids UUID[] NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
    service_type VARCHAR(80),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id),
    CHECK (NOT (id = ANY(ancestor_ids)))
);
CREATE INDEX idx_services_parent ON ltv.services(parent_id);
CREATE INDEX idx_services_ancestors ON ltv.services USING GIN (ancestor_ids);

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

-- === 031 posts  (GIU translation) ===
CREATE TABLE ltv.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.post_categories(id) ON DELETE RESTRICT,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    author_id UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_posts_category ON ltv.posts(category_id);

CREATE TABLE ltv.post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('en','vi')),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, locale), UNIQUE (locale, slug)
);
CREATE INDEX idx_post_tr_title_trgm ON ltv.post_translations USING GIN (title gin_trgm_ops);

CREATE TABLE ltv.post_products (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, PRIMARY KEY(post_id,product_id));
CREATE INDEX idx_pp_product ON ltv.post_products(product_id);
CREATE TABLE ltv.post_services (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(post_id,service_id));
CREATE TABLE ltv.post_projects (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE, PRIMARY KEY(post_id,project_id));
CREATE TABLE ltv.post_brands (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(post_id,brand_id));
CREATE TABLE ltv.post_media (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT, display_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(post_id,media_id));
CREATE INDEX idx_ptm_media ON ltv.post_media(media_id);

-- === 032 documents  (gop document_translations) ===
CREATE TABLE ltv.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(40) NOT NULL
        CHECK (document_type IN ('catalogue','brochure','datasheet','application_note','company_profile','manual','certificate','other')),
    file_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('vi','en','multi')),
    version VARCHAR(100), publication_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    visibility VARCHAR(30) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public','hidden','email_required','customer_only','staff_only')),
    download_count BIGINT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_documents_file ON ltv.documents(file_id);
CREATE TABLE ltv.document_products (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, display_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(document_id,product_id));
CREATE INDEX idx_dp_product ON ltv.document_products(product_id);
CREATE TABLE ltv.document_brands (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(document_id,brand_id));
CREATE TABLE ltv.document_services (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(document_id,service_id));
CREATE TABLE ltv.document_posts (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, PRIMARY KEY(document_id,post_id));

-- === 033 menus / menu_items  (gop menu_item_translations -> label la nhan giao dien) ===
CREATE TABLE ltv.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
    location VARCHAR(50) NOT NULL
        CHECK (location IN ('header','mobile','footer_company','footer_products','footer_services','footer_legal')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE ltv.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES ltv.menus(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES ltv.menu_items(id) ON DELETE CASCADE,
    label VARCHAR(150) NOT NULL,
    label_i18n_key VARCHAR(150),
    title_attribute VARCHAR(255),
    link_type VARCHAR(40) NOT NULL
        CHECK (link_type IN ('page','product_category','brand','service','post_category','product','post','custom_url','none')),
    link_target_id UUID, custom_url TEXT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    open_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX idx_menu_items_menu ON ltv.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent ON ltv.menu_items(parent_id);

-- === 034 inquiries  (S6: lien lac linh hoat; them handled_at/handled_by) ===
CREATE TABLE ltv.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_type VARCHAR(40) NOT NULL
        CHECK (inquiry_type IN ('quotation','product_consultation','technical_support','maintenance_repair','partnership','general_contact')),
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email CITEXT,
    message TEXT NOT NULL,
    product_id UUID REFERENCES ltv.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES ltv.services(id) ON DELETE SET NULL,
    source_url TEXT,
    locale VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (locale IN ('en','vi')),
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone','email','zalo','any')),
    province VARCHAR(120),
    privacy_consent_at TIMESTAMPTZ NOT NULL,
    email_status VARCHAR(20) NOT NULL DEFAULT 'email_pending'
        CHECK (email_status IN ('email_pending','email_sent','email_failed')),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    request_fingerprint CHAR(64),
    request_fingerprint_version VARCHAR(10),
    handled_at TIMESTAMPTZ,
    handled_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    ip_address INET, user_agent TEXT, captcha_score NUMERIC(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX idx_inquiries_created ON ltv.inquiries(created_at DESC);
CREATE INDEX idx_inquiries_email_status ON ltv.inquiries(email_status);
CREATE INDEX idx_inquiries_unhandled ON ltv.inquiries(created_at DESC) WHERE handled_at IS NULL;
CREATE INDEX idx_inquiries_product ON ltv.inquiries(product_id);
CREATE INDEX idx_inquiries_service ON ltv.inquiries(service_id);

-- === 035 inquiry_outbox ===
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

-- === 036 content_media_refs  (MOI: cho MediaUsageService quet media trong content block) ===
CREATE TABLE ltv.content_media_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    locale VARCHAR(5),
    field_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (media_id, entity_type, entity_id, field_name, locale)
);
CREATE INDEX idx_cmr_media ON ltv.content_media_refs(media_id);
CREATE INDEX idx_cmr_entity ON ltv.content_media_refs(entity_type, entity_id);

-- === 037 trigger updated_at ===
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname='ltv' AND c.relkind='r' AND a.attname='updated_at' AND a.attnum>0
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON ltv.%I FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();', t, t);
  END LOOP;
END $$;
