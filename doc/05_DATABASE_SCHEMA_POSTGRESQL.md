# 05 — DATABASE SCHEMA POSTGRESQL — WEBSITE LT VIETNAM

**Phiên bản:** 1.2.1
**HQTCSDL:** PostgreSQL 16+
**Ngày:** 2026-07-21
**Nguồn sự thật kỹ thuật** cho kiểu dữ liệu, khóa ngoại, index, constraint, thứ tự migration. Khi tài liệu khác khác biệt, file này thắng về kỹ thuật.
**Áp dụng:** ADR-002/003/004/005/009/010/011/012.

> **Nhật ký v1.2:** thêm `first_published_at` (12 translation table) · bỏ `social_image_id` khỏi page/product translation · `inquiries.email_status` bỏ `received` · `inquiry_outbox` thêm lock/status `processing`/`UNIQUE(inquiry_id,channel,recipient)` · bỏ `document_type='video'`. Canonical/robots **không** lưu DB (ADR-011).
> **Nhật ký v1.2.1:** **không đổi cấu trúc bảng.** Baseline migration = 001–070 (ADR-013); trigger tại 070; không có 071 active; `expires_at` KHÔNG có default (retention TBD).

---

# PHẦN I — QUYẾT ĐỊNH KỸ THUẬT

- Extensions: `pgcrypto` (UUID), `citext` (email), `pg_trgm` (tìm gần đúng).
- Schema riêng `ltv`. Khóa chính `UUID DEFAULT gen_random_uuid()`.
- Thời gian `TIMESTAMPTZ`.
- Trạng thái entity: `VARCHAR + CHECK` (không dùng native enum để dễ mở rộng).
- Xóa mềm: `deleted_at TIMESTAMPTZ NULL` cho nội dung quan trọng.
- **Slug (ADR-002):** `UNIQUE(locale, slug)` **thường** (không partial). Slug đã publish không tái dùng; đổi slug tạo redirect; chỉ nháp chưa từng publish mới hard-delete.
- **Locale-status (ADR-004):** 7 bảng translation chính có `status` + `published_at`.
- **Media FK (ADR-005):** tất cả `ON DELETE RESTRICT`. Xóa media do MediaUsageService kiểm (409). Không SVG (ADR-009).
- **Draft nullable:** chỉ `name`/`slug` NOT NULL trên translation; trường mô tả nullable để lưu nháp.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS ltv;
SET search_path TO ltv, public;

CREATE OR REPLACE FUNCTION ltv.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Trigger `set_updated_at` áp cho mọi bảng có `updated_at` (gắn tại **migration 070** `updated_at_triggers` — ADR-013).

---

# PHẦN II — NỀN TẢNG

## users
```sql
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
```

## media
```sql
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
-- Whitelist MIME (app + gợi ý CHECK, ADR-009): image/jpeg,image/png,image/webp,application/pdf. Không SVG.
CREATE INDEX idx_media_mime_type ON ltv.media(mime_type);
CREATE INDEX idx_media_checksum ON ltv.media(checksum) WHERE checksum IS NOT NULL;
CREATE INDEX idx_media_active ON ltv.media(created_at DESC) WHERE deleted_at IS NULL;
```

## settings
```sql
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
```

## redirects
```sql
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
```

---

# PHẦN III — NỘI DUNG TĨNH & TRANG CHỦ

## pages / page_translations (locale-status)
```sql
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
```

## banners / banner_translations / homepage_sections
```sql
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
-- link_target_id là quan hệ đa hình, backend xác thực tồn tại & chưa xóa.

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

CREATE TABLE ltv.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(80) NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## offices / office_translations
```sql
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
```

---

# PHẦN IV — HÃNG & TAXONOMY

## brands / brand_translations (locale-status)
```sql
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
```

## product_categories / translations (taxonomy, no locale-status)
```sql
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
```

## standards / applications / industries (taxonomy)
```sql
CREATE TABLE ltv.standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization VARCHAR(30) NOT NULL, code VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_standards_org_code ON ltv.standards (UPPER(organization), UPPER(code)) WHERE deleted_at IS NULL;
CREATE TABLE ltv.standard_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID NOT NULL REFERENCES ltv.standards(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255), slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (standard_id, locale), UNIQUE (locale, slug)
);

CREATE TABLE ltv.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.applications(id) ON DELETE SET NULL,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (parent_id IS NULL OR parent_id <> id)
);  -- parent_id giữ để mở rộng; Admin MVP hiển thị phẳng (ADR-006)
CREATE TABLE ltv.application_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES ltv.applications(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (application_id, locale), UNIQUE (locale, slug)
);

CREATE TABLE ltv.industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    icon_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE TABLE ltv.industry_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (industry_id, locale), UNIQUE (locale, slug)
);
```

---

# PHẦN V — SẢN PHẨM

## products (KHÔNG có primary_category_id)
```sql
CREATE TABLE ltv.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE RESTRICT,   -- hãng bắt buộc
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,     -- ADR-005
    model VARCHAR(255), internal_code VARCHAR(100),
    -- trường thương mại tương lai (ẩn UI MVP):
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
```

## product_translations (locale-status, mô tả nullable)
```sql
CREATE TABLE ltv.product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL,
    short_description TEXT,                              -- nullable: cho phép nháp
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
```

## product_specifications (group_key)
```sql
CREATE TABLE ltv.product_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    group_key VARCHAR(100),
    label_vi VARCHAR(255) NOT NULL, label_en VARCHAR(255),
    value_vi TEXT, value_en TEXT,                        -- nullable: cho phép nháp
    unit VARCHAR(100), display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_specs_product ON ltv.product_specifications(product_id, display_order);
```

## Bảng liên kết sản phẩm
```sql
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
    note_vi TEXT, note_en TEXT, display_order INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE ltv.product_industries (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, industry_id)
);

CREATE TABLE ltv.product_media (               -- KHÔNG có role 'featured'
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    media_role VARCHAR(30) NOT NULL DEFAULT 'gallery'
        CHECK (media_role IN ('gallery','diagram','application','interface','dimension')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, media_id, media_role)
);

CREATE TABLE ltv.related_products (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL
        CHECK (relation_type IN ('similar','alternative','accessory','compatible','recommended')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, related_product_id, relation_type),
    CHECK (product_id <> related_product_id)
);
```

---

# PHẦN VI — DỊCH VỤ

```sql
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

CREATE TABLE ltv.service_products (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, product_id));
CREATE TABLE ltv.service_brands (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, brand_id));
CREATE TABLE ltv.service_industries (
    service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, industry_id));
-- KHÔNG tạo service_documents. Quan hệ dịch vụ–tài liệu ở document_services (PHẦN IX).
```

---

# PHẦN VII — KHÁCH HÀNG & DỰ ÁN

```sql
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
CREATE TABLE ltv.customer_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES ltv.customers(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    short_description TEXT,
    UNIQUE (customer_id, locale)
);

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
CREATE TABLE ltv.project_products (
    project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    note_vi TEXT, note_en TEXT, PRIMARY KEY (project_id, product_id));
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
    caption_vi TEXT, caption_en TEXT, display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, media_id));
```

---

# PHẦN VIII — BÀI VIẾT

```sql
CREATE TABLE ltv.post_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES ltv.post_categories(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden','archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE TABLE ltv.post_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.post_categories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    first_published_at TIMESTAMPTZ,
    UNIQUE (category_id, locale), UNIQUE (locale, slug)
);
CREATE TABLE ltv.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ltv.post_categories(id) ON DELETE RESTRICT,
    featured_image_id UUID REFERENCES ltv.media(id) ON DELETE RESTRICT,
    author_id UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE, published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
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
CREATE TABLE ltv.post_products (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, PRIMARY KEY(post_id,product_id));
CREATE TABLE ltv.post_services (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(post_id,service_id));
CREATE TABLE ltv.post_projects (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, project_id UUID NOT NULL REFERENCES ltv.projects(id) ON DELETE CASCADE, PRIMARY KEY(post_id,project_id));
CREATE TABLE ltv.post_brands (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(post_id,brand_id));
CREATE TABLE ltv.post_media (post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT, display_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(post_id,media_id));
```

---

# PHẦN IX — TÀI LIỆU

```sql
CREATE TABLE ltv.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(40) NOT NULL
        CHECK (document_type IN ('catalogue','brochure','datasheet','application_note','company_profile','manual','certificate','other')),  -- v1.2: bỏ 'video' (ADR-012)
    file_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    language VARCHAR(10) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi','en','multi')),  -- ngôn ngữ FILE
    version VARCHAR(100), publication_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
    visibility VARCHAR(30) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public','hidden','email_required','customer_only','staff_only')),  -- MVP dùng public/hidden
    download_count BIGINT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE ltv.document_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),   -- ngôn ngữ METADATA
    title VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description TEXT,
    seo_title VARCHAR(255), seo_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
    published_at TIMESTAMPTZ,
    first_published_at TIMESTAMPTZ,
    UNIQUE (document_id, locale), UNIQUE (locale, slug)
);
CREATE TABLE ltv.document_products (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE, PRIMARY KEY(document_id,product_id));
CREATE TABLE ltv.document_brands (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, brand_id UUID NOT NULL REFERENCES ltv.brands(id) ON DELETE CASCADE, PRIMARY KEY(document_id,brand_id));
CREATE TABLE ltv.document_services (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, service_id UUID NOT NULL REFERENCES ltv.services(id) ON DELETE CASCADE, PRIMARY KEY(document_id,service_id));
CREATE TABLE ltv.document_posts (document_id UUID NOT NULL REFERENCES ltv.documents(id) ON DELETE CASCADE, post_id UUID NOT NULL REFERENCES ltv.posts(id) ON DELETE CASCADE, PRIMARY KEY(document_id,post_id));
```

---

# PHẦN X — MENU

```sql
CREATE TABLE ltv.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
    location VARCHAR(50) NOT NULL
        CHECK (location IN ('header','mobile','footer_company','footer_products','footer_services','footer_legal')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
CREATE TABLE ltv.menu_item_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES ltv.menu_items(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL CHECK (locale IN ('vi','en')),
    label VARCHAR(150) NOT NULL, title_attribute VARCHAR(255),
    UNIQUE (menu_item_id, locale)
);
```

---

# PHẦN XI — YÊU CẦU KHÁCH HÀNG (MỚI, ADR-003)

```sql
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
    expires_at TIMESTAMPTZ                                  -- nullable, KHÔNG default; retention = TBD (DN duyệt trước production, không tự purge). 24 tháng chỉ là phương án tham khảo.
);
CREATE INDEX idx_inquiries_created ON ltv.inquiries(created_at DESC);
CREATE INDEX idx_inquiries_email_status ON ltv.inquiries(email_status);

CREATE TABLE ltv.inquiry_outbox (                                     -- v1.2: concurrency (ADR-003)
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
    last_error TEXT,                                                  -- đã sanitize, không PII/secret
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (inquiry_id, channel, recipient)
);
-- Worker lấy job: SELECT ... WHERE status='pending' AND next_attempt_at<=NOW()
--   ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT :batch;
-- Reaper: status='processing' AND locked_at < NOW()-timeout → về 'pending'.
CREATE INDEX idx_outbox_due ON ltv.inquiry_outbox(status, next_attempt_at) WHERE status='pending';
CREATE INDEX idx_outbox_stale ON ltv.inquiry_outbox(locked_at) WHERE status='processing';
```

---

# PHẦN XII — TRIGGER updated_at & INDEX FK

Áp trigger `set_updated_at` cho mọi bảng có `updated_at`: users, settings, redirects, pages, banners, homepage_sections, offices, brands, product_categories, standards, applications, industries, products, product_specifications, services, customers, projects, post_categories, posts, documents, menus, menu_items, **inquiry_outbox** (v1.2). (media, các bảng LINK và translation không có `updated_at` nên không gắn.)

```sql
-- Ví dụ:
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON ltv.products
FOR EACH ROW EXECUTE FUNCTION ltv.set_updated_at();
-- ... lặp cho các bảng còn lại có updated_at.
```

Index FK bổ sung (PostgreSQL không tự tạo cho FK): `products.brand_id`, `brands.parent_id`, `product_categories.parent_id`, `services.parent_id`, `applications.parent_id`, `post_categories.parent_id`, `projects.customer_id`, `posts.category_id`, `menu_items.menu_id/parent_id`, và index ngược cho bảng LINK (`product_category_links.category_id`, `product_standards.standard_id`, `project_products.product_id`, `post_products.product_id`, `document_products.product_id`, `service_products.product_id`, `inquiries.product_id/service_id`).

Index tìm kiếm: đã tạo GIN trgm cho `product_translations.name/short_description`, `brand_translations.name`, `service_translations.name`, `post_translations.title`, `products.model`.

Index công khai (partial): products/posts/projects/brands theo `status='published' AND deleted_at IS NULL`.

---

# PHẦN XIII — QUY TẮC XUẤT BẢN (PublishService, không ép ở DB)

Nháp: chỉ cần `name` + `slug`. Publish (kiểm ở service, transaction):
- **Sản phẩm:** VI translation `status=published`; name, slug, short_description, overview, brand, ≥1 category, đúng 1 `is_primary`, featured_image; slug không trùng; brand/category chưa xóa. Đặt `products.published_at` + `product_translations(vi).published_at`; **nếu `first_published_at IS NULL` → set `first_published_at=NOW()`** (một lần).
- **Dịch vụ/Dự án/Bài viết/Hãng/Trang/Tài liệu:** theo danh sách ở 03 PHẦN XVII.
Publish bản EN: chỉ set `*_translations(en).status='published'` khi EN đủ điều kiện; VI đã publish là tiền đề để entity `published`. Mỗi lần publish một translation lần đầu → set `first_published_at` (không ghi đè về sau).
**SlugService** khi đổi slug đã publish: kiểm 3 nguồn (translation slug hiện tại, `redirects.source_path`, route bảo lưu) theo public path đầy đủ, cập nhật slug + tạo redirect 301 trong cùng transaction (ADR-002).

---

# PHẦN XIV — THỨ TỰ MIGRATION (không tham chiếu bảng chưa tạo)

```text
001 enable_extensions            002 create_schema              003 updated_at_function
004 users                        005 media                      006 settings                007 redirects
008 pages                        009 page_translations
010 banners                      011 banner_translations        012 homepage_sections
013 offices                      014 office_translations
015 brands                       016 brand_translations
017 product_categories           018 product_category_translations
019 standards                    020 standard_translations
021 applications                 022 application_translations
023 industries                   024 industry_translations
025 products                     026 product_translations       027 product_specifications
028 product_category_links       029 product_standards          030 product_applications
031 product_industries           032 product_media              033 related_products
034 services                     035 service_translations
036 service_products             037 service_brands             038 service_industries
039 customers                    040 customer_translations
041 projects                     042 project_translations
043 project_products             044 project_services           045 project_brands           046 project_media
047 post_categories              048 post_category_translations
049 posts                        050 post_translations
051 post_products                052 post_services              053 post_projects            054 post_brands   055 post_media
056 documents                    057 document_translations
058 document_products            059 document_brands            060 document_services        061 document_posts
062 menus                        063 menu_items                 064 menu_item_translations
065 inquiries                    066 inquiry_outbox
067 foreign_key_indexes          068 search_indexes             069 partial_indexes          070 updated_at_triggers
```
Kiểm tra: mọi FK trỏ tới bảng đã tạo ở migration trước. `service_products` (036) sau `products` (025) & `services` (034) — hợp lệ. `document_services` (060) sau `services` (034) — hợp lệ. `inquiries` (065) sau `products`/`services` — hợp lệ.

> **Baseline v1.2.1 (ADR-013):** Migration **001–070 là baseline duy nhất đang active** và đã chứa cấu trúc cuối cùng của v1.2.1 (mọi cột `first_published_at` × 12 translation và các cột lock của `inquiry_outbox` nằm **inline** trong định nghĩa bảng tương ứng). **KHÔNG có migration `071_v1_2_columns` trong chuỗi active** — không chạy trên fresh database. (Nội dung ALTER dạng 071 chỉ là ghi chú lịch sử trong `10_CHANGELOG`, dùng khi cần nâng cấp một DB v1.1 thật bên ngoài, sau khi xác nhận schema thực tế.) **Chưa chạy thực tế — STATIC VALIDATION ONLY (môi trường không có PostgreSQL).**

---

# PHẦN XV — QUY TẮC ROLLBACK & KIỂM THỬ TRƯỚC PRODUCTION

- Baseline v1.2.1 = **migration 001–070** (ADR-013). Mỗi migration có `down` xóa đúng đối tượng đã tạo; **rollback theo thứ tự ngược `070 → 001`**. Không có `071` trong chuỗi active.
- Trước production: chạy toàn bộ migration trên DB rỗng; kiểm thử rollback từng bước; seed dữ liệu mẫu; kiểm thử FK RESTRICT (xóa media đang dùng → lỗi), CASCADE (xóa product → translations/links mất), slug trùng (bị chặn), cây cha–con (backend từ chối vòng lặp), transaction publish (rollback khi thiếu), tìm kiếm trgm, backup/restore.
- **v1.2:** kiểm thử `first_published_at` set một lần (publish → republish không đổi); outbox concurrency (`FOR UPDATE SKIP LOCKED`, hai worker không gửi trùng), reaper (processing quá hạn → pending), `UNIQUE(inquiry_id,channel,recipient)` chặn job trùng, idempotency (cùng key → không tạo mới), CHECK `document_type` không nhận 'video', CHECK `email_status` không nhận 'received'.

---

# PHẦN XVI — CÁC QUYẾT ĐỊNH ĐÃ CHỐT (schema 1.2.1)
1. PostgreSQL 16+, khóa chính UUID, TIMESTAMPTZ.
2. Đa ngôn ngữ: bảng translation; 7 entity chính có `status`+`published_at` (ADR-004).
3. Danh mục chính chỉ ở `product_category_links.is_primary` (bỏ `primary_category_id`).
4. Ảnh đại diện ở `products.featured_image_id`; `product_media` không có role `featured`.
5. `products.brand_id NOT NULL`.
6. Mọi FK media `RESTRICT` (ADR-005). Không SVG, không upload video (ADR-009/012).
7. `UNIQUE(locale, slug)` thường; slug không tái dùng; **`first_published_at` × 12 translation** (ADR-002).
8. Draft: chỉ `name`/`slug` NOT NULL; mô tả nullable.
9. Một bảng `document_services` (bỏ `service_documents`).
10. `inquiries` + `inquiry_outbox` với **concurrency control** (processing/lock/SKIP LOCKED/reaper, `UNIQUE(inquiry_id,channel,recipient)`, `email_status` bỏ `received`) (ADR-003).
11. Enum banner/menu/media_role/status/email_status/outbox/document_type thống nhất theo 03 PHẦN XIX.
12. `group_key` (spec), `group_name/setting_key` (settings).
13. **SEO không lưu DB:** bỏ `social_image_id` khỏi page/product translation; canonical/robots tự sinh (ADR-011).
14. **`documents.document_type` bỏ `video`;** video ngoài qua content block `external_video` (ADR-012).
15. **Migration baseline duy nhất 001–070 (v1.2.1); trigger tại 070; không 071 active; rollback 070→001** (ADR-013).
16. **`inquiries.expires_at` KHÔNG có default;** retention = TBD (DN duyệt); không tự purge. Outbox có semantics **at-least-once** (ADR-003).
