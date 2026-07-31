-- =====================================================================
-- LT VIETNAM — VERIFY CHECKS (v1.2.1) — verify_checks.sql
-- Chạy SAU schema_up.sql, trên cùng database. Dùng: psql -v ON_ERROR_STOP=1 -f verify_checks.sql
-- Bất kỳ FAIL nào → RAISE EXCEPTION → psql dừng, exit ≠ 0.
-- =====================================================================
\set ON_ERROR_STOP on
SET search_path TO ltv, public;

-- --- (1) Cấu trúc: 63 bảng ---
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
   WHERE table_schema='ltv' AND table_type='BASE TABLE';
  IF n <> 63 THEN RAISE EXCEPTION 'FAIL: table count = %, want 63', n; END IF;
  RAISE NOTICE 'PASS: 63 bảng trong schema ltv';
END $$;

-- --- (2) Extensions ---
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_extension WHERE extname IN ('pgcrypto','citext','pg_trgm');
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: extensions = %, want 3 (pgcrypto,citext,pg_trgm)', n; END IF;
  RAISE NOTICE 'PASS: 3 extensions';
END $$;

-- --- (3) Trigger updated_at = 23 ---
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='ltv' AND NOT t.tgisinternal;
  IF n <> 23 THEN RAISE EXCEPTION 'FAIL: trigger updated_at = %, want 23', n; END IF;
  RAISE NOTICE 'PASS: 23 trigger updated_at';
END $$;

-- --- (4) first_published_at ở đúng 12 bảng translation ---
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema='ltv' AND column_name='first_published_at';
  IF n <> 12 THEN RAISE EXCEPTION 'FAIL: first_published_at ở % bảng, want 12', n; END IF;
  RAISE NOTICE 'PASS: first_published_at ở 12 bảng translation';
END $$;

-- --- (5) social_image_id ĐÃ BỎ (0 cột) ---
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema='ltv' AND column_name='social_image_id';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: social_image_id còn ở % cột, want 0', n; END IF;
  RAISE NOTICE 'PASS: social_image_id đã bỏ khỏi mọi translation';
END $$;

-- --- (6–13) Test dữ liệu (enum/unique/FK/cascade) trong transaction, rollback cuối ---
BEGIN;
DO $$
DECLARE m_id uuid; b_id uuid; c_id uuid; p_id uuid; i_id uuid; cnt int;
BEGIN
  -- seed tối thiểu
  INSERT INTO ltv.media(file_name,original_name,storage_path,mime_type,file_extension,file_size)
    VALUES ('a.jpg','a.jpg','/m/a.jpg','image/jpeg','jpg',100) RETURNING id INTO m_id;
  INSERT INTO ltv.brands(brand_type) VALUES ('manufacturer') RETURNING id INTO b_id;
  INSERT INTO ltv.product_categories DEFAULT VALUES RETURNING id INTO c_id;
  INSERT INTO ltv.products(brand_id, featured_image_id) VALUES (b_id, m_id) RETURNING id INTO p_id;
  INSERT INTO ltv.product_translations(product_id,locale,name,slug) VALUES (p_id,'vi','P','p-slug');
  INSERT INTO ltv.inquiries(inquiry_type,full_name,company_name,phone,email,message,privacy_consent_at,idempotency_key)
    VALUES ('quotation','N','C','0','e@x.com','msg',NOW(),'key-1') RETURNING id INTO i_id;
  INSERT INTO ltv.inquiry_outbox(inquiry_id,recipient) VALUES (i_id,'to@x.com');
  RAISE NOTICE 'PASS: seed dữ liệu tối thiểu OK';

  -- (6) enum: email_status='received' bị từ chối
  BEGIN
    INSERT INTO ltv.inquiries(inquiry_type,full_name,company_name,phone,email,message,privacy_consent_at,idempotency_key,email_status)
      VALUES ('quotation','N','C','0','e@x.com','msg',NOW(),'key-rcv','received');
    RAISE EXCEPTION 'FAIL: email_status=received bị chấp nhận (phải bị CHECK từ chối)';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: email_status từ chối ''received''';
  END;

  -- (7) enum: email_status='email_pending' hợp lệ
  INSERT INTO ltv.inquiries(inquiry_type,full_name,company_name,phone,email,message,privacy_consent_at,idempotency_key,email_status)
    VALUES ('quotation','N','C','0','e@x.com','msg',NOW(),'key-ok','email_pending');
  RAISE NOTICE 'PASS: email_status chấp nhận ''email_pending''';

  -- (8) enum: outbox.status='processing' hợp lệ (UPDATE bản ghi đã có)
  UPDATE ltv.inquiry_outbox SET status='processing', locked_at=NOW(), locked_by='w1' WHERE inquiry_id=i_id;
  RAISE NOTICE 'PASS: inquiry_outbox.status chấp nhận ''processing''';

  -- (9) enum: documents.document_type='video' bị từ chối
  BEGIN
    INSERT INTO ltv.documents(document_type,file_id) VALUES ('video', m_id);
    RAISE EXCEPTION 'FAIL: document_type=video bị chấp nhận (phải bị CHECK từ chối)';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: document_type từ chối ''video''';
  END;

  -- (10) unique: idempotency_key trùng bị chặn
  BEGIN
    INSERT INTO ltv.inquiries(inquiry_type,full_name,company_name,phone,email,message,privacy_consent_at,idempotency_key)
      VALUES ('quotation','N','C','0','e@x.com','msg',NOW(),'key-1');
    RAISE EXCEPTION 'FAIL: idempotency_key trùng được chấp nhận';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS: UNIQUE(idempotency_key) chặn trùng';
  END;

  -- (11) unique: (inquiry_id, channel, recipient) trùng bị chặn
  BEGIN
    INSERT INTO ltv.inquiry_outbox(inquiry_id,channel,recipient) VALUES (i_id,'email','to@x.com');
    RAISE EXCEPTION 'FAIL: (inquiry_id,channel,recipient) trùng được chấp nhận';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS: UNIQUE(inquiry_id,channel,recipient) chặn trùng';
  END;

  -- (12) FK RESTRICT: xóa media đang được products.featured_image_id tham chiếu → bị chặn
  BEGIN
    DELETE FROM ltv.media WHERE id=m_id;
    RAISE EXCEPTION 'FAIL: xóa media đang dùng được chấp nhận (phải RESTRICT)';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS: FK RESTRICT chặn xóa media đang dùng';
  END;

  -- (13) CASCADE: xóa product → product_translations mất theo
  DELETE FROM ltv.products WHERE id=p_id;
  SELECT count(*) INTO cnt FROM ltv.product_translations WHERE product_id=p_id;
  IF cnt <> 0 THEN RAISE EXCEPTION 'FAIL: CASCADE không xóa product_translations (còn %)', cnt; END IF;
  RAISE NOTICE 'PASS: CASCADE xóa product → product_translations';

  RAISE NOTICE '==== TẤT CẢ DATA TESTS PASS ====';
END $$;
ROLLBACK;

-- --- Kết thúc: nếu tới đây không có lỗi → toàn bộ PASS ---
\echo '==== verify_checks.sql: ALL CHECKS PASSED ===='
