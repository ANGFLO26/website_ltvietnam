-- FAQ là cấu trúc hỏi-đáp riêng, không phải mảng content block (ADR-011 / doc/11).
-- Chỉ tự động đổi giá trị rỗng của phiên bản cũ. Dữ liệu block không rỗng cần được
-- biên tập thành câu hỏi/câu trả lời thay vì suy diễn và có nguy cơ phát JSON-LD sai.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ltv.service_translations
    WHERE jsonb_typeof(faq) <> 'object'
      AND faq <> '[]'::jsonb
  ) THEN
    RAISE EXCEPTION
      'service_translations.faq contains legacy non-empty blocks; migrate them to {version,items} explicitly';
  END IF;
END
$$;

UPDATE ltv.service_translations
SET faq = '{"version":1,"items":[]}'::jsonb
WHERE faq = '[]'::jsonb;

ALTER TABLE ltv.service_translations
  ALTER COLUMN faq SET DEFAULT '{"version":1,"items":[]}'::jsonb,
  ADD CONSTRAINT service_translations_faq_shape CHECK (
    jsonb_typeof(faq) = 'object'
    AND faq ->> 'version' = '1'
    AND jsonb_typeof(faq -> 'items') = 'array'
  );
