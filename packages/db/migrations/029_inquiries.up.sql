-- === 034 inquiries  (S6: lien lac linh hoat; them handled_at/handled_by) ===
CREATE TABLE ltv.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_type VARCHAR(40) NOT NULL
        CHECK (inquiry_type IN ('quotation','product_consultation','technical_support','maintenance_repair','partnership','general_contact')),
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email CITEXT,
    message TEXT NOT NULL,
    product_id UUID REFERENCES ltv.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES ltv.services(id) ON DELETE SET NULL,
    source_url TEXT,
    locale VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (locale IN ('en','vi')),
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone','email','zalo','any')),
    province VARCHAR(120),
    privacy_consent_at TIMESTAMPTZ NOT NULL,
    email_status VARCHAR(20) NOT NULL DEFAULT 'email_pending'
        CHECK (email_status IN ('email_pending','email_sent','email_failed')),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    request_fingerprint CHAR(64),
    request_fingerprint_version VARCHAR(10),
    handled_at TIMESTAMPTZ,
    handled_by UUID REFERENCES ltv.users(id) ON DELETE SET NULL,
    ip_address INET, user_agent TEXT, captcha_score NUMERIC(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX idx_inquiries_created ON ltv.inquiries(created_at DESC);
CREATE INDEX idx_inquiries_email_status ON ltv.inquiries(email_status);
CREATE INDEX idx_inquiries_unhandled ON ltv.inquiries(created_at DESC) WHERE handled_at IS NULL;
CREATE INDEX idx_inquiries_product ON ltv.inquiries(product_id);
CREATE INDEX idx_inquiries_service ON ltv.inquiries(service_id);
