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
