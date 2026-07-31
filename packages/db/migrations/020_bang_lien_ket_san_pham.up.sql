-- === 020-025 bang lien ket san pham ===
CREATE TABLE ltv.product_category_links (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES ltv.product_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, category_id)
);
CREATE UNIQUE INDEX uq_product_primary_category ON ltv.product_category_links(product_id) WHERE is_primary=TRUE;
CREATE INDEX idx_pcl_category ON ltv.product_category_links(category_id, product_id);

CREATE TABLE ltv.product_standards (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES ltv.standards(id) ON DELETE CASCADE,
    compliance_type VARCHAR(30) NOT NULL DEFAULT 'compliance'
        CHECK (compliance_type IN ('compliance','correlation','specification','reference')),
    note TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, standard_id, compliance_type)
);
CREATE INDEX idx_ps_standard ON ltv.product_standards(standard_id, product_id);

CREATE TABLE ltv.product_applications (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES ltv.applications(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, application_id)
);
CREATE UNIQUE INDEX uq_product_primary_application ON ltv.product_applications(product_id) WHERE is_primary=TRUE;
CREATE INDEX idx_pa_application ON ltv.product_applications(application_id, product_id);

CREATE TABLE ltv.product_industries (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES ltv.industries(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, industry_id)
);
CREATE INDEX idx_pi_industry ON ltv.product_industries(industry_id, product_id);

CREATE TABLE ltv.product_media (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    media_role VARCHAR(30) NOT NULL DEFAULT 'gallery'
        CHECK (media_role IN ('gallery','diagram','application','interface','dimension')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, media_id, media_role)
);
CREATE INDEX idx_pm_media ON ltv.product_media(media_id);

CREATE TABLE ltv.related_products (
    product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES ltv.products(id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL
        CHECK (relation_type IN ('similar','alternative','accessory','compatible','recommended')),
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, related_product_id, relation_type),
    CHECK (product_id <> related_product_id)
);
