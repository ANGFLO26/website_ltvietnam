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
