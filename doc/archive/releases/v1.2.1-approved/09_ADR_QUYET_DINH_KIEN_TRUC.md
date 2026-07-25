# 09 — ADR: CÁC QUYẾT ĐỊNH KIẾN TRÚC WEBSITE LT VIETNAM

**Phiên bản:** 1.2.1
**Ngày:** 2026-07-21
**Trạng thái bộ tài liệu:** Approved
**Vai trò tài liệu:** Nguồn sự thật cao nhất. Khi bất kỳ tài liệu nào mâu thuẫn với ADR, ADR thắng.

---

## Quy ước ADR

Mỗi ADR gồm: Mã · Tiêu đề · Trạng thái · Bối cảnh · Quyết định · Các phương án đã xem xét · Lý do lựa chọn · Hệ quả · Tài liệu bị ảnh hưởng · Ngày quyết định.

Trạng thái hợp lệ: `Proposed` · `Accepted` · `Superseded`.

Danh sách:

```text
ADR-001  Chiến lược URL công khai
ADR-002  Vòng đời và chính sách sử dụng slug
ADR-003  Lưu yêu cầu khách hàng và gửi email
ADR-004  Chiến lược xuất bản đa ngôn ngữ
ADR-005  Chính sách Media
ADR-006  Phạm vi MVP
ADR-007  Định dạng và ngữ nghĩa bộ lọc sản phẩm công khai
ADR-008  Ngữ nghĩa PATCH và cập nhật quan hệ
ADR-009  Loại file upload trong MVP
ADR-010  Tính toàn vẹn dữ liệu Catalogue và quy tắc Draft
ADR-011  Chiến lược Canonical, Robots và SEO Metadata
ADR-012  Chính sách Video và External Embed
ADR-013  Chiến lược Migration Baseline và Schema Versioning
```

> **Nhật ký v1.2:** ADR-001/002/003/004/005/007/009 cập nhật; thêm ADR-010/011/012.
> **Nhật ký v1.2.1:** ADR-003 bổ sung semantics **at-least-once** + Message-ID ổn định; ADR-004 làm rõ fallback (không mơ hồ "tên hãng"); retention TBD (bỏ mặc định 24 tháng); thêm **ADR-013** (migration baseline 001–070, trigger tại 070, không 071 active). Chi tiết ở `10_CHANGELOG`.

---

# ADR-001 — Chiến lược URL công khai

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Sitemap phiên bản trước dùng URL chi tiết lồng nhau (`/dich-vu/{nhóm}/{dịch-vụ}`, `/tin-tuc/{danh-mục}/{bài}`, `/hang-doi-tac/{cha}/{con}`). Nhưng schema đặt `UNIQUE(locale, slug)` toàn module và API tra cứu bằng một slug phẳng. Hai dịch vụ "Bảo trì" thuộc hai nhóm khác nhau sẽ va chạm slug; API một slug không đủ dữ liệu để phân giải URL hai cấp; một hãng có tới hai URL chi tiết trùng nội dung.

## Quyết định
1. Trang **chi tiết** dùng URL **phẳng**, không đưa cấu trúc cha–con vào URL:
```text
/san-pham/{product-slug}
/dich-vu/{service-slug}
/du-an/{project-slug}
/tin-tuc/{post-slug}
/hang-doi-tac/{brand-slug}
/tai-lieu/{document-slug}
```
2. Trang **danh sách / phân loại** vẫn dùng URL theo nhóm:
```text
/san-pham/danh-muc/{category-slug}
/san-pham/tieu-chuan/{standard-slug}
/san-pham/ung-dung/{application-slug}
/tin-tuc/danh-muc/{post-category-slug}
```
3. **KHÔNG** dùng URL chi tiết lồng nhau: `/dich-vu/{parent}/{child}`, `/tin-tuc/{category}/{post}`, `/hang-doi-tac/{parent-brand}/{child-brand}`.
4. API công khai khớp URL phẳng:
```text
GET /api/v1/products/:slug
GET /api/v1/services/:slug
GET /api/v1/projects/:slug
GET /api/v1/posts/:slug
GET /api/v1/brands/:slug
GET /api/v1/documents/:slug
```
5. **Cập nhật v1.2 — Trang hồ sơ hãng vs trang lọc sản phẩm theo hãng (hai loại trang khác nhau, không canonical sang nhau):**
   - **Hồ sơ hãng** `/hang-doi-tac/{brand-slug}`: trang giới thiệu hãng/đối tác (giới thiệu, thương hiệu con, dịch vụ, dự án, tài liệu). **`robots=index,follow`, self-canonical.**
   - **Lọc sản phẩm theo hãng** = **`/san-pham/tat-ca?brand={brand-slug}`** — chỉ là **trạng thái lọc** của trang danh sách sản phẩm. **`robots=noindex,follow`, `rel=canonical` về `/san-pham/tat-ca`.** KHÔNG canonical sang hồ sơ hãng.
   - **KHÔNG** dùng `/san-pham/hang/{brand-slug}` làm landing indexable trong MVP. Nếu URL này còn tồn tại/tham chiếu → **redirect 301** sang `/san-pham/tat-ca?brand={brand-slug}`.
   - Hai trang liên kết qua lại (nút "Xem hồ sơ hãng" ↔ "Xem sản phẩm của hãng") nhưng không canonical sang nhau.
6. Thương hiệu con là một `brand` độc lập với slug riêng, cũng dùng `/hang-doi-tac/{child-slug}`; quan hệ cha–con thể hiện qua `parent_id` và điều hướng nội trang, không qua URL.
7. **Landing phân loại có nội dung biên tập riêng** (`/san-pham/danh-muc/{slug}`, `/san-pham/tieu-chuan/{slug}`, `/san-pham/ung-dung/{slug}`): **self-canonical, index,follow**. (Quy tắc robots/canonical chi tiết ở ADR-011.)

## Các phương án đã xem xét
- **A. URL hai cấp + `UNIQUE(locale, parent_id, slug)` + API nhận đủ path.** Giữ URL "đẹp" theo phân cấp nhưng tăng phức tạp routing, API, redirect, và slug không ổn định khi đổi nhóm cha.
- **B. URL phẳng + slug duy nhất theo module (chọn).** Đơn giản, ổn định, khớp API và schema hiện có, slug không phụ thuộc cha.

## Lý do lựa chọn
Phương án B loại bỏ va chạm slug do trùng nhóm cha, giữ slug ổn định khi nội dung đổi danh mục, đơn giản hóa routing/redirect/sitemap, và khớp trực tiếp với `UNIQUE(locale, slug)` cùng API một-slug.

## Hệ quả
- Sitemap, API, frontend wireframe, mục SEO/redirect phải dùng URL phẳng.
- Public API bỏ `GET /brands/:slug/products`; lọc sản phẩm theo hãng dùng `GET /products?brand={slug}` (nhất quán ADR-007).
- Trang lọc theo hãng noindex,follow + canonical `/san-pham/tat-ca`; hồ sơ hãng index self-canonical.
- URL cũ `/san-pham/hang/{slug}` → 301 sang `/san-pham/tat-ca?brand={slug}`.
- Đổi nhóm cha của dịch vụ/bài viết không đổi URL chi tiết ⇒ không phát sinh redirect.

## Tài liệu bị ảnh hưởng
00, 01, 02, 06, 08, 10. (Robots/canonical: xem ADR-011.)

---

# ADR-002 — Vòng đời và chính sách sử dụng slug

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Vòng audit chỉ ra `UNIQUE(locale, slug)` không lọc `deleted_at` nên slug của nội dung xóa mềm vẫn chiếm namespace. Có đề xuất dùng partial unique index để tái sử dụng slug. Tuy nhiên tái sử dụng slug đã từng công khai gây nhầm lẫn SEO (một URL từng trỏ nội dung A nay trỏ nội dung B) và phá lịch sử liên kết.

## Quyết định
1. Giữ ràng buộc `UNIQUE(locale, slug)` **thường** trên từng bảng translation. **Không** dùng partial unique index để cho phép tái sử dụng slug của nội dung đã xóa mềm.
2. Slug **đã từng xuất bản không được tái sử dụng** cho nội dung khác.
3. Nội dung **xóa mềm vẫn giữ slug** (slug bị "khóa" vĩnh viễn ở trạng thái đã xóa mềm).
4. **Đổi slug** ⇒ hệ thống tự tạo redirect 301 từ slug cũ sang slug mới.
5. Nội dung **ngừng kinh doanh**: ưu tiên giữ trang, không xóa URL (xem ADR liên quan mục sản phẩm ngừng KD ở 01/06/08).
6. Chỉ **bản nháp CHƯA từng xuất bản** mới được **xóa vĩnh viễn** để giải phóng slug, theo quy trình có xác nhận.

## Cập nhật v1.2 — cơ chế thực thi (không chỉ nguyên tắc)

### 7. Thêm cột `first_published_at`
Thêm `first_published_at TIMESTAMPTZ NULL` vào **12 bảng translation có slug công khai**: `page, brand, product_category, standard, application, industry, product, service, project, post_category, post, document` translations.
- `first_published_at`: thời điểm URL của bản dịch **lần đầu** công khai; **set một lần**, **không** ghi đè khi hide/archive/unpublish/republish; dùng để xác định "đã từng xuất bản".
- `published_at`: thời điểm phiên bản hiện tại được publish/republish (có thể cập nhật lại).
- `scheduled_publish_at`: **chỉ P1** khi làm scheduled publishing. **Không** dùng `published_at` để lưu lịch tương lai.

### 8. SlugService kiểm 3 nguồn theo **public path đầy đủ**
Trước khi chấp nhận slug/public path mới, kiểm **public path hoàn chỉnh của module** (vd `/san-pham/pac-optidist-2`, không chỉ chuỗi `pac-optidist-2`) trên:
- **(A)** slug hiện tại trong bảng translation tương ứng.
- **(B)** `redirects.source_path` (namespace URL đã từng dùng — không được cấp lại).
- **(C)** danh sách route hệ thống bảo lưu: `/admin, /api, /en, /login, /tim-kiem, /health, /media, /san-pham, /dich-vu, /du-an, /tin-tuc, /tai-lieu, /lien-he`.

### 9. Quy tắc hard-delete
Chỉ hard-delete (theo luồng thường) khi: `first_published_at IS NULL` **AND** entity ở trạng thái draft **AND** không có redirect liên quan **AND** không có dữ liệu phụ thuộc cần giữ.
Nếu `first_published_at IS NOT NULL` → **chỉ soft-delete**, **không** giải phóng slug, có thể restore.

### 10. Đổi slug (đã publish) — một transaction
```text
BEGIN
  1) Xác định public path cũ
  2) Kiểm public path mới chưa dùng/bảo lưu (3 nguồn ở điểm 8)
  3) Cập nhật slug
  4) Tạo redirect 301 (path cũ → path mới)
  5) Kiểm không tạo loop/chain
COMMIT   -- lỗi bất kỳ bước → ROLLBACK
```

## Quy trình xóa & khôi phục (ghi rõ trong 03, 05, 06)
```text
Bản nháp chưa từng publish (first_published_at IS NULL) → hard delete → giải phóng slug
Nội dung đã từng publish (first_published_at NOT NULL)  → chỉ soft-delete → giữ slug
Đổi slug nội dung đã publish  → cập nhật slug + redirect 301 trong 1 transaction
Khôi phục nội dung xóa mềm    → xóa deleted_at; slug cũ vẫn còn nên không va chạm
```

## Các phương án đã xem xét
- **A. Partial unique + đổi slug khi xóa mềm để tái dùng.** Cho tái sử dụng slug nhưng phá lịch sử SEO và tăng phức tạp.
- **B. UNIQUE thường + slug bảo lưu vĩnh viễn (chọn).** Bảo toàn lịch sử URL/SEO, đơn giản, redirect rõ ràng.

## Lý do lựa chọn
Bảo toàn giá trị SEO và tính minh bạch của URL quan trọng hơn khả năng tái dùng lại một chuỗi slug. Trường hợp tái nhập model cũ dùng redirect hoặc slug biến thể có kiểm soát.

## Hệ quả
- Không thể đặt slug trùng slug của một nội dung đã xóa mềm; nếu cần, dùng slug biến thể (vd thêm hậu tố) và redirect.
- PublishService/SlugService phải tự tạo redirect khi đổi slug và kiểm 3 nguồn.
- 05 thêm `first_published_at` × 12 bảng translation (cập nhật migration/rollback).
- SlugService set `first_published_at` lần đầu publish; không ghi đè về sau.

## Tài liệu bị ảnh hưởng
03, 04, 05, 06, 08 (SEO), 10.

---

# ADR-003 — Lưu yêu cầu khách hàng và gửi email

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Thiết kế trước chỉ gửi email khi có form (`Form → SMTP → thành công hoặc mất`). Nếu SMTP lỗi, yêu cầu khách bị mất trong khi khách vẫn nhận thông báo thành công — rủi ro kinh doanh nghiêm trọng cho một website B2B sống bằng lead.

## Quyết định
1. **Mọi yêu cầu khách phải được lưu database trước khi gửi email.** Trả `202 Accepted` chỉ sau khi commit thành công, không phụ thuộc SMTP.
2. Luồng:
```text
Form → Validate → CAPTCHA + Rate limit
     → Transaction { INSERT inquiries; INSERT inquiry_outbox }
     → Commit → 202 Accepted
     → Worker nền gửi email → Retry khi thất bại
```
3. Thêm hai bảng: `inquiries`, `inquiry_outbox`.
4. **Không xây giao diện quản lý Inquiry trong Admin MVP.** Hai bảng chỉ để: không mất yêu cầu, retry email, idempotency, chuẩn bị mở rộng.

## `inquiries` — trường tối thiểu
```text
id, inquiry_type, full_name, company_name, phone, email, message,
product_id (nullable), service_id (nullable), source_url, locale,
privacy_consent_at, email_status, idempotency_key (UNIQUE),
created_at, expires_at (nullable, retention)
```

## `inquiry_outbox` — trường tối thiểu (cập nhật v1.2)
```text
id, inquiry_id, channel, recipient, status, attempts,
last_attempt_at, next_attempt_at, locked_at, locked_by,
last_error, created_at, updated_at, sent_at
```

## Trạng thái (cập nhật v1.2)
`inquiries.email_status` (**bỏ `received`**):
```text
email_pending   (đã lưu, chờ worker gửi — set ngay khi commit)
email_sent      (đã gửi thành công)
email_failed    (thất bại sau khi hết số lần thử)
```
`inquiry_outbox.status`:
```text
pending      (chờ xử lý, next_attempt_at <= NOW())
processing   (worker đang giữ lock và xử lý)
sent         (gửi thành công)
failed       (hết số lần thử)
```

## Concurrency & idempotency (mới v1.2)

### Chống hai worker gửi trùng
- `UNIQUE(inquiry_id, channel, recipient)` — không tạo hai job trùng cho cùng inquiry (vẫn cho nhiều channel/recipient tương lai).
- Worker lấy job **atomic** trong transaction:
```sql
SELECT ... FROM ltv.inquiry_outbox
WHERE status = 'pending' AND next_attempt_at <= NOW()
ORDER BY next_attempt_at
FOR UPDATE SKIP LOCKED
LIMIT :batch_size;
-- sau đó: status='processing', locked_at=NOW(), locked_by=:worker_id
```
- **Thành công:** `status=sent, sent_at=NOW(), locked_at=NULL, locked_by=NULL`; `inquiries.email_status=email_sent`.
- **Lỗi còn retry:** `attempts+1, last_attempt_at=NOW(), last_error=<sanitize>, status=pending, next_attempt_at=NOW()+backoff, locked_at=NULL, locked_by=NULL`. Backoff ví dụ: 1 phút → 5 phút → 15 phút → 1 giờ → 6 giờ (có giới hạn + cấu hình).
- **Hết retry:** `status=failed`; `inquiries.email_status=email_failed`; **không xóa inquiry**.

### Stale-lock reaper
`status='processing' AND locked_at < NOW() - processing_timeout` → chuyển lại `pending` (xóa `locked_at/locked_by`, ghi structured log). `processing_timeout` phải đủ dài để hạn chế reaper cướp job khi worker cũ còn sống.

### Bảo đảm gửi: at-least-once (cập nhật v1.2.1)
`FOR UPDATE SKIP LOCKED` chỉ **ngăn hai worker đồng thời xử lý cùng một job**, KHÔNG bảo đảm tuyệt đối không gửi trùng. Tình huống vẫn xảy ra: SMTP đã nhận email → worker chết trước khi ghi `status=sent` → reaper đưa job về `pending` → worker khác gửi lại.
- **Outbox có semantics `at-least-once` delivery**, KHÔNG phải `exactly-once`. Hệ thống không thể bảo đảm exactly-once trong tình huống SMTP đã nhận nhưng DB chưa kịp ghi `sent`.
- **Message-ID ổn định** giảm tác động của retry trùng: sinh **xác định** từ `outbox.id`, ví dụ `<inquiry-outbox-{outbox.id}@ltvietnam.com.vn>`. Retry cùng một outbox record dùng **cùng** Message-ID (không sinh mới mỗi lần). Nếu SMTP/provider hỗ trợ idempotency key, dùng `outbox.id`. Structured log chứa `outbox_id` + `message_id`; không đưa PII vào Message-ID. Email template có thể chứa mã yêu cầu nội bộ để nhân viên nhận biết bản gửi trùng.
- **Không đổi schema** (Message-ID xác định từ `outbox.id`).
> Không dùng câu "outbox bảo đảm không bao giờ gửi trùng".

### last_error không chứa PII/secret
Chỉ lưu mã lỗi + thông báo SMTP kỹ thuật đã sanitize. Không chứa nội dung inquiry, mật khẩu, token, secret.

### Idempotency
`POST /api/v1/inquiries` nhận `Idempotency-Key`; `UNIQUE(idempotency_key)`. Hai request cùng key → **không** tạo inquiry/outbox mới → trả lại kết quả request đầu tiên.

## Data retention (cập nhật v1.2.1)
`inquiries.expires_at` **nullable, KHÔNG có default SQL**. `privacy.inquiry_retention_months` = **TBD**, chỉ cấu hình sau khi doanh nghiệp phê duyệt. Giai đoạn hiện tại: `expires_at = NULL`, **không** tự purge, **không** anonymize tự động, **không** áp thời hạn mặc định. **24 tháng chỉ là một phương án tham khảo để doanh nghiệp xem xét, KHÔNG phải giá trị mặc định của hệ thống.**

## Các phương án đã xem xét
- **A. Chỉ gửi email, không lưu.** Đơn giản nhưng mất lead khi SMTP lỗi — bị loại.
- **B. Outbox + inquiries + worker retry (chọn).** Không mất dữ liệu, idempotent, sẵn sàng mở rộng CRM/đa kênh.

## Hệ quả
- 01 đưa inquiry persistence vào P0.
- 06 thêm transaction + worker (SKIP LOCKED) + reaper + idempotency; email gửi bất đồng bộ.
- 05 thêm cột lock (`locked_at/locked_by/last_attempt_at/updated_at`) + `UNIQUE(inquiry_id,channel,recipient)` + index job pending; enum cập nhật.
- Dashboard Admin có thể hiển thị số `email_failed` (widget trạng thái, không phải quản lý inquiry).

## Tài liệu bị ảnh hưởng
01, 03, 04, 05, 06, 07, 08, 10.

---

# ADR-004 — Chiến lược xuất bản đa ngôn ngữ

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
`status` trước đây chỉ nằm ở entity cha, không có publish theo từng ngôn ngữ. Không thể publish bản Việt trong khi bản Anh chưa xong; URL tiếng Anh sẽ 404 hoặc trộn ngôn ngữ. Scope yêu cầu tiếng Anh không bắt buộc hoàn thiện trong ngày ra mắt.

## Quyết định
1. Thêm `status` + `published_at` vào bảng translation của **7 entity nội dung chính**:
```text
product_translations
service_translations
project_translations
post_translations
brand_translations
page_translations
document_translations
```
2. Các bảng translation **taxonomy/config KHÔNG** có locale-status: `standard_translations, application_translations, industry_translations, product_category_translations, post_category_translations, office_translations, menu_item_translations, banner_translations, customer_translations`. Với nhóm này: **hiển thị khi có bản dịch**. Fallback chỉ áp dụng cho **dữ liệu độc lập ngôn ngữ** (mã tiêu chuẩn `standards.organization+code`, nhãn hệ thống cấu hình chung); **KHÔNG** fallback nội dung Brand detail (xem mục fallback bên dưới).
3. Quy tắc:
   - Tiếng Việt là ngôn ngữ mặc định, **bắt buộc `published`** trước khi entity được xuất bản.
   - Tiếng Anh **không bắt buộc** hoàn thiện lúc ra mắt; mỗi bản dịch xuất bản độc lập.
   - **Không auto-fallback** nội dung tiếng Việt cho URL tiếng Anh của product/service/project/post/brand/page/document (7 entity chính).
4. Điều kiện truy vấn công khai:
```text
entity.status = 'published'
AND entity.deleted_at IS NULL
AND translation.locale = requested_locale
AND translation.status = 'published'
```
5. API công khai chỉ trả translation `published`.

## Quy tắc fallback ngôn ngữ (cập nhật v1.2.1 — không mơ hồ)
- **KHÔNG fallback Brand detail** từ VI sang EN đối với: `brand_translations.name`, `brand_translations.short_description`, `brand_translations.description`, `brand_translations.seo_title`, `brand_translations.seo_description`. Khi bản EN của hãng chưa `published`: `/en/brands-partners/{slug}` **không** hiển thị nội dung VI — trả 404/trạng thái không tồn tại theo quy tắc frontend, hoặc điều hướng về danh sách hãng EN; **không trộn** nội dung tiếng Việt.
- **Chỉ fallback dữ liệu thực sự độc lập ngôn ngữ:** `model`, `SKU`, mã nội bộ, mã tiêu chuẩn (`standards.organization`, `standards.code`), **proper name chính thức của thương hiệu khi doanh nghiệp xác nhận tên đó dùng chung cho mọi locale**, nhãn hệ thống được cấu hình dùng chung. *Proper name dùng chung KHÔNG có nghĩa fallback toàn bộ Brand translation.*
- **hreflang:** chỉ sinh cặp `vi`↔`en` khi **cả hai** bản dịch của entity đều `published`. EN chưa publish → không tạo alternate hreflang EN.

## `status` trên translation (7 entity chính)
```text
draft      (mặc định)
published
hidden
```
(Không cần `archived` ở tầng translation; vòng đời archive nằm ở entity cha.)

## Các phương án đã xem xét
- **A. Status chỉ ở entity cha.** Không tách được VI/EN — bị loại.
- **B. Locale-status cho MỌI translation (16 bảng).** Nhất quán tuyệt đối nhưng over-engineering cho taxonomy/config — bị loại.
- **C. Locale-status cho 7 entity nội dung chính, taxonomy dùng fallback (chọn).** Cân bằng giữa nhu cầu thật và độ phức tạp.

## Hệ quả
- 03/04/05 thêm `status`+`published_at` vào 7 bảng translation.
- 06 dùng điều kiện truy vấn công khai đầy đủ cả locale-status.
- 07 hiển thị badge trạng thái theo từng ngôn ngữ (VI ✓ / EN Thiếu / EN Nháp).
- 08 trang tiếng Anh chưa publish trả trạng thái đúng (404/empty theo quy tắc), không trộn ngôn ngữ.

## Tài liệu bị ảnh hưởng
01, 03, 04, 05, 06, 07, 08, 10.

---

# ADR-005 — Chính sách Media

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Schema trước không nhất quán: `products.featured_image_id ON DELETE SET NULL` (xóa media làm ảnh đại diện biến mất âm thầm) trong khi `product_media` dùng `RESTRICT`. Media xóa mềm vẫn được tham chiếu gây ảnh vỡ. SVG có nguy cơ XSS.

## Quyết định
1. **Không xóa (kể cả xóa mềm) media đang được sử dụng.** Luồng:
```text
Admin yêu cầu xóa media
 → MediaUsageService quét toàn bộ quan hệ tham chiếu
 → Nếu đang dùng: 409 MEDIA_IN_USE (kèm nơi dùng)
 → Nếu không dùng: soft delete (deleted_at)
 → Chờ khoảng giữ an toàn
 → Purge file vật lý
```
2. **Mọi FK media dùng chính sách nhất quán, ưu tiên `ON DELETE RESTRICT`.** Bỏ mọi `ON DELETE SET NULL` cho FK media (`featured_image_id`, `logo_id`, `cover_image_id`, `icon_id`, `social_image_id`, `image_id`, `mobile_image_id`, `file_id`, …). Không để `SET NULL` làm mất ảnh đại diện âm thầm.
3. Query công khai **không trả media đã xóa** (`media.deleted_at IS NULL`).
4. Media đang dùng phải hiển thị rõ **nơi sử dụng** trong Admin.
5. **MVP chỉ cho phép upload:** `JPG, JPEG, PNG, WebP, PDF`. **Không hỗ trợ SVG** trong MVP.

## Danh sách nơi tham chiếu media (MediaUsageService phải quét đủ) — cập nhật v1.2
> v1.2 **bỏ** `social_image_id` khỏi `page_translations` và `product_translations` (ADR-011). MediaUsageService **không** còn quét hai cột này.
```text
products.featured_image_id, product_media.media_id,
brands.logo_id, brands.cover_image_id,
product_categories.featured_image_id, product_categories.icon_id,
applications.icon_id, industries.featured_image_id, industries.icon_id,
services.featured_image_id, projects.featured_image_id, project_media.media_id,
posts.featured_image_id, post_media.media_id,
pages.featured_image_id,
customers.logo_id, offices.featured_image_id, menu_items.icon_id,
banners.image_id, banners.mobile_image_id,
documents.file_id
```

## Các phương án đã xem xét
- **A. SET NULL + không kiểm tra.** Mất ảnh âm thầm — bị loại.
- **B. RESTRICT nhất quán + app-check 409 (chọn).** An toàn, minh bạch.

## Hệ quả
- 05 đổi mọi FK media sang RESTRICT.
- 06 thêm MediaUsageService + 409 MEDIA_IN_USE + purge có trễ.
- 07 media picker hiển thị nơi dùng, chặn xóa khi đang dùng; upload chỉ 5 loại.
- Attachment của khách (P1) lưu tách, không vào Media công khai.

## Tài liệu bị ảnh hưởng
03, 05, 06, 07, 10.

---

# ADR-006 — Phạm vi MVP

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Cần khóa phạm vi để tránh trôi phạm vi và để các tài liệu không mô tả chức năng P1/Future như đã triển khai.

## Quyết định

### P0 — Bắt buộc
```text
Authentication Admin
Media cơ bản (JPG/JPEG/PNG/WebP/PDF)
Pages
Brands và sub-brands
Product Categories
Standards
Industries
Applications (giao diện phẳng)
Products
Services
Projects
Posts
Documents
Customers
Offices
Homepage cấu trúc section cố định (bật/tắt + chọn nổi bật)
Navigation đơn giản
Product Search (pg_trgm)
Product Filters (không facet count)
Inquiry persistence + email retry (inquiries + inquiry_outbox)
Redirect
SEO nền tảng (canonical, hreflang, sitemap.xml, robots.txt, structured data)
```

### P1 — Sau MVP
```text
Upload file trong form khách hàng (attachment)
Tìm kiếm toàn website
Facet count cho bộ lọc
Kéo thả thứ tự homepage section
Kéo thả menu tree
Dashboard cảnh báo thiếu nội dung
Bulk actions
Duplicate product
Scheduled publishing
Auto-save nâng cao
```

### Future
```text
CRM, Báo giá, Ticket kỹ thuật, Cổng khách hàng,
Bảo hành, Thiết bị theo serial, Ecommerce một phần, Phân quyền chi tiết
```

## Quy tắc
- Không đưa chức năng P1/Future vào yêu cầu bắt buộc của MVP.
- Không tài liệu nào được mô tả P1/Future như đã triển khai.
- Trường/bảng chuẩn bị tương lai được phép tồn tại trong schema nếu không cản trở, nhưng ẩn khỏi UI MVP.

## Audit log P0 (bổ sung v1.2)
- **P0 KHÔNG tạo bảng `audit_logs`.** Dùng **structured application audit log** (ghi log có cấu trúc).
- Sự kiện phải log: login success/failure, password change, password reset, create, update, publish, hide, archive, delete, restore, settings change, redirect change, media delete attempt.
- Field log: `request_id, actor_user_id, action, entity_type, entity_id, result, timestamp, ip_address` (nếu chính sách cho phép).
- **Không** log: password, JWT, cookie, SMTP/CAPTCHA secret, toàn bộ inquiry message, file content, PII đầy đủ không cần thiết.
- **Không** có Admin UI xem audit log trong P0. Bảng `audit_logs` = P1/Future.

## Tài liệu bị ảnh hưởng
Tất cả (01 là nguồn chi tiết), 06, 10.

---

# ADR-007 — Định dạng và ngữ nghĩa bộ lọc sản phẩm công khai

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Backend trước mô tả đồng thời hai kiểu multi-filter (`brand=pac,herzog` và `brand_id=id1&id2`). Ngoài định dạng, **ngữ nghĩa kết hợp** chưa được chốt: một sản phẩm không thể đồng thời `brand=PAC AND brand=Herzog`.

## Quyết định

### 1. Định dạng
- **API công khai dùng slug**, nhiều giá trị dùng **query key lặp**: `?brand=pac&brand=herzog&standard=astm-d86`.
- **Không** hỗ trợ kiểu comma (`brand=pac,herzog`) hay `brand_id`. Admin API có thể dùng UUID.
- `sort`/`order` chỉ nhận whitelist backend.

### 2. Ngữ nghĩa faceted filter (mới v1.2)
- **Cùng một dimension → OR.** `?brand=pac&brand=herzog` = `brand=PAC OR brand=Herzog`.
- **Giữa các dimension khác nhau → AND.**
- Áp dụng cho: `category, brand, standard, application, industry, product_type` (nếu dùng).
- **Không** tạo AND giữa nhiều giá trị cùng một khóa.

Ví dụ: `?brand=pac&brand=herzog&standard=astm-d86&application=chung-cat`
```text
(brand = PAC OR brand = Herzog)
AND (standard = ASTM D86)
AND (application = Chưng cất)
```

### 3. Backend
- Query builder **nhóm giá trị theo dimension**; trong dimension dùng OR, giữa dimension dùng AND.
- Dùng **parameter binding** (không ghép SQL trực tiếp). Có test case cho từng tình huống.
Pseudo-query:
```sql
WHERE product.status = 'published'
  AND (brand.slug = 'pac' OR brand.slug = 'herzog')
  AND EXISTS (standard.slug = 'astm-d86')
  AND EXISTS (application.slug = 'chung-cat')
```

### 4. Frontend
- Checkbox trong cùng nhóm = OR; các nhóm kết hợp AND. Chip từng giá trị; bỏ chip chỉ loại đúng giá trị. URL query key lặp.

### 5. Facet count
- **KHÔNG** hiển thị số lượng (`PAC (20)`) trong P0. Facet count → **P1**.

## Hệ quả
01/06/08 mô tả nhất quán semantics; trang lọc theo hãng dùng `/san-pham/tat-ca?brand={slug}` (ADR-001), noindex,follow (ADR-011).

## Tài liệu bị ảnh hưởng
01, 06, 08, 10.

---

# ADR-008 — Ngữ nghĩa PATCH và cập nhật quan hệ

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Cập nhật sản phẩm gồm nhiều mảng quan hệ (categories, standards, applications, industries, media, related products). Client gửi thiếu một mảng có thể vô tình xóa dữ liệu.

## Quyết định
```text
Nếu một trường mảng quan hệ XUẤT HIỆN trong PATCH
    → thay thế TOÀN BỘ tập quan hệ thuộc trường đó.
Nếu trường KHÔNG xuất hiện
    → giữ nguyên dữ liệu cũ.
```
Toàn bộ cập nhật nằm trong **một transaction**. Áp cho: categories, standards, applications, industries, media, related_products (và các mảng quan hệ tương tự ở services/projects/posts/documents).

## Hệ quả
06 ghi rõ hợp đồng PATCH; 07 form gửi đủ mảng khi có thay đổi nhóm đó.

## Tài liệu bị ảnh hưởng
06, 07, 10.

---

# ADR-009 — Loại file upload trong MVP

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Cần chốt loại file để thiết kế validation và bảo mật upload; SVG có nguy cơ XSS.

## Quyết định
1. MVP chỉ cho phép: `JPG, JPEG, PNG, WebP, PDF`.
2. **Không SVG, không file thực thi, KHÔNG upload video** (mp4/mov/avi/webm…) trong P0.
3. Kiểm tra **magic bytes/MIME thực tế** (không chỉ đuôi file), whitelist loại, giới hạn dung lượng, đổi tên an toàn, chống path traversal.
4. Attachment của khách (form yêu cầu) là **P1**; khi triển khai phải lưu tách khỏi Media công khai, URL token ngắn hạn.
5. Video ngoài (YouTube/Vimeo) xử lý qua content block, **không** upload — chi tiết ở **ADR-012**.

## Hệ quả
05/06/07 dùng đúng whitelist; MIME whitelist không chứa video; ADR-005 tham chiếu ADR-009; ADR-012 xử lý external video.

## Tài liệu bị ảnh hưởng
01, 03, 05, 06, 07, 08, 10.

---

# ADR-010 — Tính toàn vẹn dữ liệu Catalogue và quy tắc Draft

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Nhiều quyết định về mô hình catalogue và quy tắc draft nằm rải rác, changelog tham chiếu kiểu `ADR-006 (data 4.x)` không chính thức. Cần một ADR chuyên trách.

## Quyết định
1. **Không có** `products.primary_category_id`.
2. Danh mục chính chỉ ở `product_category_links.is_primary` (đúng 1 khi publish, phải nằm trong tập đã gắn).
3. Ảnh đại diện sản phẩm ở `products.featured_image_id`.
4. `product_media` **không** có `media_role='featured'` (roles: gallery, diagram, application, interface, dimension).
5. Chỉ dùng `document_services` cho quan hệ dịch vụ–tài liệu.
6. **Không** tồn tại `service_documents`.
7. `products.brand_id NOT NULL` (vật tư không hãng dùng brand chuẩn hóa `LT Vietnam`/`Generic`/`Other`).
8. Draft cho phép thiếu nội dung mô tả (chỉ `name`/`slug` bắt buộc ở DB).
9. `PublishService` kiểm điều kiện đầy đủ khi publish (không ép ở DB constraint).
10. `applications` giữ `parent_id` trong DB nhưng **Admin P0 dùng danh sách phẳng**.
11. Trường ecommerce tương lai (`sku, price_visibility, sale_mode, warranty_months, requires_configuration`) ẩn khỏi luồng Admin P0.

## Các phương án đã xem xét
- **A. Giữ `primary_category_id` + link.is_primary song song.** Trùng nguồn, dễ lệch — bị loại.
- **B. Một nguồn duy nhất cho mỗi khái niệm (chọn).**

## Hệ quả
Thay mọi tham chiếu `ADR-006 (data 4.x)` bằng **ADR-010**. 03/04/05/06/07 đồng bộ.

## Tài liệu bị ảnh hưởng
00, 03, 04, 05, 06, 07, 10.

---

# ADR-011 — Chiến lược Canonical, Robots và SEO Metadata

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
v1.1 mô tả `canonical_url`, `robots_index`, `robots_follow`, `social_image_id` nhưng schema không hỗ trợ nhất quán và Admin vẫn có checkbox index/follow — nguồn dữ liệu SEO bị phân tán và dễ sai.

## Quyết định

### 1. Canonical tự sinh (không lưu DB ở P0)
Không lưu `canonical_url` trong database. Canonical được tạo từ: locale + route canonical của module + slug hiện tại (theo ADR-001). Admin **không** nhập canonical tùy chỉnh trong P0 (chỉ xem preview chỉ đọc).

### 2. Robots tự suy ra (không lưu DB ở P0)
Không lưu `robots_index`/`robots_follow` theo entity. Quy tắc:
```text
Published entity + published translation + canonical route → index,follow
Draft / hidden / archived / deleted                        → không có public route / noindex,nofollow
Query filter URL (?brand=, ?standard=, ...)                → noindex,follow, canonical về path gốc (vd /san-pham/tat-ca)
Search result                                              → noindex,follow
Admin / API / system / error page                          → noindex,nofollow
Landing category/standard/application (nội dung riêng)     → index,follow, self-canonical
Hồ sơ hãng /hang-doi-tac/{slug}                            → index,follow, self-canonical
```

### 3. Social image không lưu riêng theo translation (P0)
**Xóa `social_image_id`** khỏi `page_translations` và `product_translations`. Dùng **fallback chain**:
```text
Product  → products.featured_image_id
Brand    → brands.cover_image_id → brands.logo_id
Service  → services.featured_image_id
Project  → projects.featured_image_id
Post     → posts.featured_image_id
Page     → pages.featured_image_id
Document → thumbnail nếu có → ảnh mặc định
Cuối     → settings.seo.default_social_image
```

### 4. SEO fields được lưu
Translation chỉ giữ `seo_title, seo_description`. `slug` là dữ liệu nội dung (không phải trường SEO tùy chọn).

### 5. Admin SEO form P0
Hiển thị: SEO Title, SEO Description, Slug, URL preview (tự sinh), **canonical preview chỉ đọc**, social image preview (theo fallback), Google preview.
**Không** hiển thị: canonical URL tùy chỉnh, checkbox index, checkbox follow, social image picker riêng.

### 6. Frontend
Frontend sinh: title, meta description, canonical, robots, Open Graph, Twitter card (nếu dùng), hreflang — theo dữ liệu và trạng thái đã chốt (hreflang chỉ khi cả hai bản published — ADR-004).

## Các phương án đã xem xét
- **A. Lưu canonical/robots/social theo entity + checkbox Admin.** Linh hoạt nhưng phân tán nguồn, dễ sai/nhầm noindex — bị loại.
- **B. Tự sinh từ trạng thái + route + fallback (chọn).** Nhất quán, ít lỗi vận hành.

## Hệ quả
- 05 xóa `social_image_id` khỏi page/product translations; ADR-005 cập nhật MediaUsageService.
- 03/04/06/07/08 bỏ canonical_url/robots fields và checkbox; canonical/robots tự sinh.

## Tài liệu bị ảnh hưởng
02, 03, 04, 05, 06, 07, 08, 10.

---

# ADR-012 — Chính sách Video và External Embed

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
v1.1 có `documents.document_type='video'` và một số màn hình yêu cầu khu vực video, nhưng P0 không cho upload video, `documents.file_id` bắt buộc, MIME whitelist chỉ ảnh/PDF ⇒ mâu thuẫn.

## Quyết định
1. **P0 không upload video** (mp4/mov/avi/webm…).
2. **Xóa `video`** khỏi CHECK `documents.document_type`. Còn: `catalogue, brochure, datasheet, application_note, company_profile, manual, certificate, other`.
3. **Không** tạo bảng `product_videos` trong P0.
4. Video ngoài qua **content block `external_video`** trong nội dung của pages/products/brands/services/projects/posts:
```json
{ "type": "external_video", "provider": "youtube", "url": "https://...", "title": "...", "caption": "..." }
```
5. **Provider whitelist P0: `youtube`, `vimeo`.** Backend: validate URL, xác nhận domain/provider, chuẩn hóa URL, **không** lưu raw iframe, **không** lưu script, **không** cho domain ngoài whitelist, **không** dùng embed do Admin nhập trực tiếp. Frontend tự tạo iframe/embed an toàn từ provider + video ID đã validate.
6. Admin Block Editor có block "External Video" (provider/url/title/caption). **Không** upload video, **không** file video trong Media Picker, **không** khu vực product video riêng bắt buộc.
7. **P1:** nếu cần quản lý video sản phẩm độc lập → bảng `product_videos(id, product_id, provider, external_url, title, thumbnail_media_id, display_order)`. **Không** tạo trong P0.

## Các phương án đã xem xét
- **A. Upload video vào Media + document_type=video.** Tốn lưu trữ, ngoài phạm vi P0, rủi ro bảo mật — bị loại.
- **B. External embed whitelist provider (chọn).** Nhẹ, an toàn, đủ nhu cầu P0.

## Hệ quả
01/03/04/05 bỏ document_type video; 06 validate provider; 07 block editor external video; 08 render an toàn từ block đã validate.

## Tài liệu bị ảnh hưởng
01, 03, 04, 05, 06, 07, 08, 10.

---

# ADR-013 — Chiến lược Migration Baseline và Schema Versioning

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Tài liệu từng mô tả đồng thời hai chiến lược: cấu trúc nằm inline trong migration 001–070, **và** một migration `071_v1_2_columns` (ALTER) cho DB đã có v1.1. Đồng thời trigger `updated_at` có nơi ghi migration 068, nơi ghi 070. Dự án **chưa bắt đầu code, chưa có database production/shared environment** ⇒ không cần migration nâng cấp giả định.

## Quyết định
1. **Dùng v1.2.1 làm baseline đầu tiên.** Migration **001–070 chứa cấu trúc cuối cùng của v1.2.1**.
2. **KHÔNG có migration `071_v1_2_columns` trong chuỗi active.** Nội dung 071 chỉ là **ghi chú lịch sử** trong Changelog/archive. Không chạy `071` trên fresh database.
3. **Trigger `set_updated_at` được gắn tại migration `070_updated_at_triggers`.** Thứ tự chốt: `067 foreign_key_indexes`, `068 search_indexes`, `069 partial_indexes`, `070 updated_at_triggers`. Không ghi migration 068 cho trigger.
4. **Rollback fresh baseline: `070 → 001`.** Không có rollback `071` trong chuỗi active.
5. Khi bắt đầu code, migration 001–070 được tạo từ baseline v1.2.1. **Sau khi chạy trên shared environment đầu tiên, các migration phải được đóng băng** (không sửa lại — thay đổi sau dùng migration mới).
6. **Upgrade tương lai:** nếu tồn tại một database v1.1 thật bên ngoài dự án, tạo **upgrade migration riêng sau khi xác nhận schema thực tế**; upgrade migration đó **không** thuộc baseline v1.2.1 hiện tại. Không viết sẵn migration 071 giả định.

## Các phương án đã xem xét
- **A. Baseline v1.2 (001–070) + 071 ALTER cho DB v1.1.** Gây nhầm migration nào active khi chưa có DB v1.1 — bị loại.
- **B. Baseline v1.2.1 duy nhất, 071 chỉ là lịch sử (chọn).** Một nguồn sự thật migration, rõ ràng cho lần đầu triển khai.

## Hệ quả
- 05 mô tả một baseline 001–070; trigger tại 070; bỏ 071 khỏi mô tả active (chuyển note lịch sử).
- 00/10 ghi baseline v1.2.1; 10 giữ 071 như ghi chú lịch sử.
- Tổng số bảng vẫn 63; không đổi cấu trúc bảng ở v1.2.1.

## Tài liệu bị ảnh hưởng
00, 05, 06, 10.

---

## Bảng tham chiếu ADR → Tài liệu

| ADR | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
|-----|----|----|----|----|----|----|----|----|----|
| 001 URL | ● | ● | ● |  |  |  | ● |  | ● |
| 002 Slug |  |  | ● | ● | ● | ● | ● |  | ● |
| 003 Inquiry |  | ● |  | ● | ● | ● | ● | ● | ● |
| 004 Locale |  | ● |  | ● | ● | ● | ● | ● | ● |
| 005 Media |  |  |  | ● |  | ● | ● | ● |  |
| 006 MVP | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 007 Filter |  | ● |  |  |  |  | ● |  | ● |
| 008 PATCH |  |  |  |  |  |  | ● | ● |  |
| 009 Upload |  | ● |  | ● |  | ● | ● | ● | ● |
| 010 Catalogue | ● |  |  | ● | ● | ● | ● | ● |  |
| 011 SEO |  |  | ● | ● | ● | ● | ● | ● | ● |
| 012 Video |  | ● |  | ● | ● | ● | ● | ● | ● |
| 013 Migration | ● |  |  |  |  | ● | ● |  |  |
