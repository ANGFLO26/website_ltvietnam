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
