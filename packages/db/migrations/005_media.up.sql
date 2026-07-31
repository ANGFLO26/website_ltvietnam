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
