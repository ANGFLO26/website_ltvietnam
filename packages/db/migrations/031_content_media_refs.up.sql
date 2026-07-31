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
