ALTER TABLE ltv.service_translations
  DROP CONSTRAINT IF EXISTS service_translations_faq_shape,
  ALTER COLUMN faq SET DEFAULT '[]'::jsonb;

-- Không đổi object về mảng: giữ nguyên dữ liệu FAQ để rollback không làm mất nội dung.
