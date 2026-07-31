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
