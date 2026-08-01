-- =====================================================================
-- SEED BOOTSTRAP PRODUCTION
--
-- Du lieu toi thieu de he thong dung duoc. Chay MOT LAN sau migration.
-- Idempotent: chay lai khong tao ban ghi trung.
--
-- KHONG chua du lieu demo. Du lieu mau nam o seeds/002_demo.sql.
-- KHONG chua mat khau co dinh — tai khoan admin tao rieng bang CLI.
-- =====================================================================

-- ── Brand chuan hoa (ADR-010 muc 7) ────────────────────────────────
-- products.brand_id NOT NULL. Vat tu khong hang phai gan mot trong ba brand
-- nay, neu khong KHONG TAO DUOC san pham nao.
INSERT INTO ltv.brands (brand_type, name, slug, code, status, is_featured, display_order, published_at, first_published_at)
VALUES
  ('manufacturer', 'LT Vietnam', 'lt-vietnam', 'LTV',     'published', FALSE, 900, NOW(), NOW()),
  ('supplier',     'Generic',    'generic',    'GENERIC', 'published', FALSE, 901, NOW(), NOW()),
  ('supplier',     'Other',      'other',      'OTHER',   'published', FALSE, 902, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── Homepage sections (doc/01 muc 5 — thu tu co dinh o P0) ─────────
INSERT INTO ltv.homepage_sections (section_type, is_enabled, display_order, settings) VALUES
  ('hero',                    TRUE,  0, '{"limit":5}'),
  ('company_intro',           TRUE,  1, '{}'),
  ('business_areas',          TRUE,  2, '{"limit":6}'),
  ('featured_categories',     TRUE,  3, '{"limit":8}'),
  ('featured_products',       TRUE,  4, '{"limit":8}'),
  ('featured_brands',         TRUE,  5, '{"limit":12}'),
  ('services',                TRUE,  6, '{"limit":4}'),
  ('capabilities',            TRUE,  7, '{}'),
  ('projects',                TRUE,  8, '{"limit":3}'),
  ('posts',                   TRUE,  9, '{"limit":3}'),
  ('customers',               TRUE, 10, '{"limit":12}'),
  ('contact_call_to_action',  TRUE, 11, '{}'),
  ('offices',                 TRUE, 12, '{}')
ON CONFLICT (section_type) DO NOTHING;

-- ── Menu (doc/02 PHAN III) ─────────────────────────────────────────
INSERT INTO ltv.menus (code, name, location, status) VALUES
  ('header',          'Header',          'header',          'active'),
  ('mobile',          'Mobile',          'mobile',          'active'),
  ('footer_company',  'Footer Company',  'footer_company',  'active'),
  ('footer_products', 'Footer Products', 'footer_products', 'active'),
  ('footer_services', 'Footer Services', 'footer_services', 'active'),
  ('footer_legal',    'Footer Legal',    'footer_legal',    'active')
ON CONFLICT (code) DO NOTHING;

-- Muc menu header. label_i18n_key de frontend dich nhan giao dien (ADR-014).
INSERT INTO ltv.menu_items (menu_id, label, label_i18n_key, link_type, custom_url, display_order, status)
SELECT m.id, v.label, v.key, 'custom_url', v.url, v.ord, 'active'
FROM ltv.menus m
CROSS JOIN (VALUES
  ('Home',            'nav.home',      '/',          0),
  ('About Us',        'nav.about',     '/about',     1),
  ('Products',        'nav.products',  '/products',  2),
  ('Brands',          'nav.brands',    '/brands',    3),
  ('Services',        'nav.services',  '/services',  4),
  ('Projects',        'nav.projects',  '/projects',  5),
  ('News',            'nav.news',      '/news',      6),
  ('Resources',       'nav.resources', '/resources', 7),
  ('Contact',         'nav.contact',   '/contact',   8)
) AS v(label, key, url, ord)
WHERE m.code = 'header'
  AND NOT EXISTS (SELECT 1 FROM ltv.menu_items x WHERE x.menu_id = m.id AND x.label = v.label);

-- ── Trang he thong (doc/03 PHAN IV) ────────────────────────────────
INSERT INTO ltv.pages (page_type, status, is_system_page, display_order)
VALUES
  ('about',            'draft',     FALSE, 0),
  ('history',          'draft',     FALSE, 1),
  ('vision_mission',   'draft',     FALSE, 2),
  ('business_areas',   'draft',     FALSE, 3),
  ('privacy_policy',   'published', TRUE, 90),
  ('terms_of_use',     'published', TRUE, 91),
  ('cookie_policy',    'published', TRUE, 92)
ON CONFLICT (page_type) DO NOTHING;

-- Ban dich tieng Anh cho ba trang he thong (bat buoc de co route)
INSERT INTO ltv.page_translations (page_id, locale, title, slug, content, status, published_at, first_published_at)
SELECT p.id, 'en', v.title, v.slug, '[]'::jsonb, 'published', NOW(), NOW()
FROM ltv.pages p
JOIN (VALUES
  ('privacy_policy', 'Privacy Policy',  'privacy-policy'),
  ('terms_of_use',   'Terms of Use',    'terms-of-use'),
  ('cookie_policy',  'Cookie Policy',   'cookie-policy')
) AS v(page_type, title, slug) ON v.page_type = p.page_type
ON CONFLICT (page_id, locale) DO NOTHING;

-- ── Settings mac dinh ──────────────────────────────────────────────
INSERT INTO ltv.settings (group_name, setting_key, value, value_type, is_public, is_encrypted) VALUES
  ('company', 'name',            'LT Vietnam Technology Co., Ltd', 'string',  TRUE,  FALSE),
  ('company', 'short_name',      'LT Vietnam',                     'string',  TRUE,  FALSE),
  ('contact', 'primary_email',   '',                               'string',  TRUE,  FALSE),
  ('contact', 'primary_phone',   '',                               'string',  TRUE,  FALSE),
  ('email',   'inquiry_recipient','',                              'string',  FALSE, FALSE),
  ('email',   'from_address',    '',                               'string',  FALSE, FALSE),
  ('email',   'smtp_password',   '',                               'encrypted', FALSE, TRUE),
  ('seo',     'default_title',   'LT Vietnam Technology Co., Ltd', 'string',  TRUE,  FALSE),
  ('seo',     'default_description', '',                           'string',  TRUE,  FALSE),
  ('seo',     'default_social_image', '',                          'string',  TRUE,  FALSE),
  ('seo',     'site_indexable',  'true',                           'boolean', TRUE,  FALSE),
  ('upload',  'max_bytes',       '20971520',                       'integer', FALSE, FALSE),
  ('privacy', 'inquiry_retention_months', '',                      'integer', FALSE, FALSE),
  ('localization', 'default_locale', 'en',                         'string',  TRUE,  FALSE),
  ('localization', 'available_locales', '["en","vi"]',             'json',    TRUE,  FALSE),
  ('maintenance', 'enabled',     'false',                          'boolean', FALSE, FALSE),
  ('captcha', 'provider',        '',                               'string',  FALSE, FALSE),
  ('captcha', 'secret',          '',                               'encrypted', FALSE, TRUE)
ON CONFLICT (group_name, setting_key) DO NOTHING;
