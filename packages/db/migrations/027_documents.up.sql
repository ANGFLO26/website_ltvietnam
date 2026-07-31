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
