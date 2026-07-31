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
