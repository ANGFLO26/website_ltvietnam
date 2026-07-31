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
