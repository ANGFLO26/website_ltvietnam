# 09 — ADR: CÁC QUYẾT ĐỊNH KIẾN TRÚC WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
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
ADR-014  Ngôn ngữ lưu trữ nội dung và ranh giới frontend/backend
ADR-015  Lọc và duyệt theo cây phân cấp
```

> **Nhật ký v1.2:** ADR-001/002/003/004/005/007/009 cập nhật; thêm ADR-010/011/012.
> **Nhật ký v1.2.1:** ADR-003 bổ sung semantics **at-least-once** + Message-ID ổn định; ADR-004 làm rõ fallback; retention TBD; thêm **ADR-013**.
> **Nhật ký v1.3:** **ADR-014** chốt ranh giới dịch thuật frontend/backend — bỏ 12 bảng translation, giữ 4. **ADR-015** chốt lọc theo cây phân cấp (`ancestor_ids`). **ADR-001** đổi cấu trúc URL sang tiếng Anh ở gốc + tiền tố `/vi`. **ADR-002** slug đơn cho entity một ngôn ngữ, danh sách route bảo lưu sinh tự động. **ADR-004** viết lại theo ADR-014. **ADR-013** baseline v1.3 (52 bảng). Chi tiết ở `10_CHANGELOG`.

---

# ADR-001 — Chiến lược URL công khai

**Trạng thái:** Accepted · **Ngày:** 2026-07-21 · **Sửa đổi:** 2026-07-29 (v1.3)

## Bối cảnh
Bản v1.2.1 đặt tiếng Việt ở đường dẫn gốc và tiếng Anh ở tiền tố `/`. Đối chiếu với website đang vận hành `ltvietnam.com.vn` cho thấy toàn bộ nội dung hiện tại là **tiếng Anh**: menu, tiêu đề trang, meta description, tên sản phẩm. Đặt tiếng Việt ở gốc buộc phải biên soạn toàn bộ nội dung tiếng Việt trước khi ra mắt, và đẩy mọi URL đang có sang `/` kèm redirect hàng loạt.

Ngoài ra, hai tập route bất đối xứng (gốc tiếng Việt + `/`) khiến danh sách route bảo lưu của SlugService chỉ phủ được một ngôn ngữ, tạo khả năng va chạm URL.

## Quyết định

### 1. Tiếng Anh ở gốc, tiếng Việt ở tiền tố `/vi`
```text
/products/{product-slug}          ← mặc định, luôn tồn tại
/vi/services/{service-slug}       ← chỉ tồn tại khi có nội dung tiếng Việt
```
Tiền tố `/vi` **chỉ áp dụng cho bốn nhóm có bản dịch thật** (ADR-014): `pages`, `posts`, `services`, `projects`.

### 2. Đoạn đường dẫn dùng tiếng Anh cho cả hai ngôn ngữ
`/vi/news/{slug}` chứ **không** phải `/vi/news/{slug}`. Từ khóa SEO nằm ở slug, không nằm ở đoạn route. Đổi lại chỉ còn **một** tập route phải bảo vệ.

### 3. Trang chi tiết dùng URL phẳng
```text
/products/{product-slug}      /services/{service-slug}    /projects/{project-slug}
/news/{post-slug}             /brands/{brand-slug}        /resources/{document-slug}
```
Không dùng URL lồng cha–con: `/services/{parent}/{child}`, `/news/{category}/{post}`, `/brands/{parent}/{child}`.

### 4. Trang danh sách / phân loại dùng URL theo nhóm
```text
/products/category/{category-slug}
/products/standard/{standard-slug}
/products/application/{application-slug}
/news/category/{post-category-slug}
```

### 5. API công khai khớp URL phẳng
```text
GET /api/v1/products/:slug     GET /api/v1/services/:slug    GET /api/v1/projects/:slug
GET /api/v1/posts/:slug        GET /api/v1/brands/:slug      GET /api/v1/documents/:slug
```

### 6. Hồ sơ hãng vs trang lọc sản phẩm theo hãng
Hai loại trang khác nhau, **không canonical sang nhau**:
- **Hồ sơ hãng** `/brands/{brand-slug}`: `robots=index,follow`, self-canonical.
- **Lọc theo hãng** `/products/all?brand={brand-slug}`: `robots=noindex,follow`, canonical về `/products/all`.
- Không dùng `/products/brand/{slug}` làm landing indexable. Nếu tồn tại → **301** sang `/products/all?brand={slug}`.

### 7. Thương hiệu con là brand độc lập
Có slug riêng, cũng dùng `/brands/{child-slug}`. Quan hệ cha–con thể hiện qua `parent_id` + `ancestor_ids`, không qua URL (ADR-015).

### 8. Landing phân loại chỉ index khi có nội dung biên tập
`/products/category|standard|application/{slug}` chỉ `index,follow` + self-canonical **khi mô tả không rỗng**. Nếu rỗng → `noindex,follow` + canonical về trang danh sách cha. Quy tắc này ngăn trang mỏng trùng lặp với URL lọc (chi tiết ADR-011).

### 9. Đường dẫn gốc `/`
Phục vụ trang chủ tiếng Anh. Không tự chuyển hướng theo `Accept-Language` để tránh ảnh hưởng crawler.

## Các phương án đã xem xét
- **A. Tiếng Việt ở gốc + `/` (v1.2.1).** Buộc biên soạn tiếng Việt trước khi ra mắt; đẩy toàn bộ URL đang có sang `/`; hai tập route bất đối xứng — **bị thay thế**.
- **B. Cả hai đều có tiền tố (`/` + `/vi`).** Đối xứng hoàn toàn, nhưng đổi mọi URL đang có và mất URL gốc sạch cho thị trường chính — bị loại.
- **C. Tiếng Anh ở gốc + `/vi` cho nội dung có bản dịch (chọn).** Giữ dấu vết SEO đang có, một tập route, cộng thêm ngôn ngữ sau này không phải sửa URL cũ.

## Lý do lựa chọn
Phương án C khớp hiện trạng nội dung, không phát sinh redirect hàng loạt, và **cộng thêm được**: muốn thêm `/vi/products/{slug}` sau này thì URL tiếng Anh không đổi.

## Hệ quả
- `02` viết lại bảng URL công khai.
- ADR-002 §8: danh sách route bảo lưu sinh tự động từ bảng route.
- Entity một ngôn ngữ dùng `UNIQUE(slug)` thay vì `UNIQUE(locale, slug)` (ADR-014).
- hreflang chỉ sinh cho bốn nhóm có bản dịch (ADR-011).

## Tài liệu bị ảnh hưởng
00, 01, 02, 03, 05, 06, 08, 10.

---

# ADR-002 — Vòng đời và chính sách sử dụng slug

**Trạng thái:** Accepted
**Ngày:** 2026-07-21

## Bối cảnh
Vòng audit chỉ ra `UNIQUE(locale, slug)` không lọc `deleted_at` nên slug của nội dung xóa mềm vẫn chiếm namespace. Có đề xuất dùng partial unique index để tái sử dụng slug. Tuy nhiên tái sử dụng slug đã từng công khai gây nhầm lẫn SEO (một URL từng trỏ nội dung A nay trỏ nội dung B) và phá lịch sử liên kết.

## Quyết định
1. Ràng buộc slug **thường** (không partial), không cho tái sử dụng slug của nội dung đã xóa mềm:
   - Entity **một ngôn ngữ** (ADR-014): `UNIQUE(slug)` trên chính bảng entity.
   - Entity **có bản dịch** (`pages`, `posts`, `services`, `projects`): `UNIQUE(locale, slug)` trên bảng translation.
2. Slug **đã từng xuất bản không được tái sử dụng** cho nội dung khác.
3. Nội dung **xóa mềm vẫn giữ slug** (slug bị "khóa" vĩnh viễn ở trạng thái đã xóa mềm).
4. **Đổi slug** ⇒ hệ thống tự tạo redirect 301 từ slug cũ sang slug mới.
5. Nội dung **ngừng kinh doanh**: ưu tiên giữ trang, không xóa URL (xem ADR liên quan mục sản phẩm ngừng KD ở 01/06/08).
6. Chỉ **bản nháp CHƯA từng xuất bản** mới được **xóa vĩnh viễn** để giải phóng slug, theo quy trình có xác nhận.

## Cập nhật v1.2 — cơ chế thực thi (không chỉ nguyên tắc)

### 7. Cột `first_published_at` (cập nhật v1.3)
`first_published_at TIMESTAMPTZ NULL` đặt **cùng nơi với `status` điều khiển việc công khai**:
- **Trên bảng entity** cho entity một ngôn ngữ: `brands, product_categories, standards, applications, industries, products, documents, post_categories`.
- **Trên bảng translation** cho entity có bản dịch: `page_translations, post_translations, service_translations, project_translations`.

> **Sửa lỗi v1.2.1:** bản cũ đặt cột này trên 5 bảng translation taxonomy vốn **không có `status`**, nên không có sự kiện publish nào set được nó. Cột vĩnh viễn NULL khiến điều kiện hard-delete ở §9 luôn đúng và slug đã công khai có thể bị cấp lại. v1.3 đặt cột cạnh `status` nên PublishService luôn set được.
- `first_published_at`: thời điểm URL của bản dịch **lần đầu** công khai; **set một lần**, **không** ghi đè khi hide/archive/unpublish/republish; dùng để xác định "đã từng xuất bản".
- `published_at`: thời điểm phiên bản hiện tại được publish/republish (có thể cập nhật lại).
- `scheduled_publish_at`: **chỉ P1** khi làm scheduled publishing. **Không** dùng `published_at` để lưu lịch tương lai.

### 8. SlugService kiểm 3 nguồn theo **public path đầy đủ**
Trước khi chấp nhận slug/public path mới, kiểm **public path hoàn chỉnh** (vd `/products/optidist`, không chỉ chuỗi `optidist`) trên:
- **(A)** slug hiện tại trong bảng tương ứng (entity hoặc translation);
- **(B)** `redirects.source_path` — namespace URL đã từng dùng, không được cấp lại;
- **(C)** tập route hệ thống bảo lưu.

**Tập (C) phải được SINH TỰ ĐỘNG từ bảng route ở `02` PHẦN II lúc build, không viết tay.** Quy tắc sinh:
1. Lấy mọi đoạn cấp 1 và cấp 2 của mọi route hệ thống.
2. Nhân với mọi tiền tố locale đang hoạt động (`""` và `/vi`).
3. Cộng thêm tiền tố kỹ thuật: `/api`, `/admin`, `/media`, `/health`, `/_next`, `/static`.

Tập sinh ra tại thời điểm v1.3:
```text
/          /about      /products   /brands     /services   /projects
/news      /resources  /contact    /search     /request-success
/privacy-policy   /terms-of-use   /cookie-policy
/products/all  /products/category  /products/standard  /products/application
/news/category
/vi + toàn bộ danh sách trên
/api  /admin  /media  /health  /_next  /static
```

**Bắt buộc có test đối chiếu tập bảo lưu với bảng route; test fail khi hai bên lệch nhau.**

> **Sửa lỗi v1.2.1:** danh sách cũ viết tay và chỉ có tiếng Việt, thiếu `/brands`, `/about` và **toàn bộ** đoạn route tiếng Anh — một slug tên `products` có thể tạo ra `/products` đè lên trang landing sản phẩm.

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
- 05 đặt `first_published_at` cạnh `status` (8 bảng entity + 4 bảng translation).
- SlugService set `first_published_at` lần đầu publish; không ghi đè về sau.
- Tập route bảo lưu là artifact sinh ra, có test đối chiếu.

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

**Trạng thái:** Accepted · **Ngày:** 2026-07-21 · **Viết lại:** 2026-07-29 (v1.3, theo ADR-014)

## Bối cảnh
Bản v1.2.1 cho **cả 16 nhóm nội dung** có bảng translation và bắt tiếng Việt phải `published` trước khi entity được xuất bản. Đối chiếu thực tế: website hiện tại là tiếng Anh, tên thiết bị là danh từ riêng kỹ thuật không dịch, và không ai sẽ viết mô tả tiếng Việt cho 150–200 máy phân tích.

ADR-014 chốt lại ranh giới: chỉ giữ bảng translation ở nơi **thật sự sẽ có người viết bản thứ hai**.

## Quyết định

### 1. Chỉ bốn entity có xuất bản theo ngôn ngữ
```text
pages · posts · services · projects
```
Bảng translation của bốn entity này có `status` + `published_at` + `first_published_at`, xuất bản độc lập từng ngôn ngữ.

### 2. Mọi entity còn lại lưu nội dung một ngôn ngữ trên chính bảng entity
```text
brands · product_categories · standards · applications · industries
products · documents · customers · offices · banners · menu_items · post_categories
```
Ngôn ngữ lưu trữ là **tiếng Anh** (ADR-014). Không có bảng translation, không có `locale`, không có trạng thái theo ngôn ngữ.

### 3. Không có "ngôn ngữ bắt buộc"
Bỏ quy tắc "tiếng Việt phải published trước". Với bốn entity có bản dịch, **mỗi bản dịch xuất bản độc lập**; không bản nào là điều kiện của bản nào. Entity `published` + ít nhất một translation `published` là đủ để có trang công khai.

### 4. Không auto-fallback giữa hai bản dịch
Với bốn entity có bản dịch: `/vi/news/{slug}` chỉ tồn tại khi bản tiếng Việt `published`. Không hiển thị nội dung tiếng Anh dưới URL tiếng Việt. Khi thiếu → 404 hoặc điều hướng về danh sách tiếng Việt; **không trộn ngôn ngữ**.

### 5. Điều kiện truy vấn công khai
```sql
-- Entity một ngôn ngữ
WHERE entity.status='published' AND entity.deleted_at IS NULL

-- Entity có bản dịch
WHERE entity.status='published' AND entity.deleted_at IS NULL
  AND t.locale = :locale AND t.status='published'
```

### 6. Nhãn giao diện không nằm trong database
Nhãn menu, nút, nhãn form, thông báo lỗi do **frontend** dịch bằng file ngôn ngữ (ADR-014). `menu_items.label` lưu nhãn mặc định; `menu_items.label_i18n_key` (nullable) cho phép frontend tra khóa dịch riêng.

### 7. hreflang
Chỉ sinh cặp `en`↔`vi` cho bốn entity có bản dịch, và **chỉ khi cả hai bản `published`**. Entity một ngôn ngữ không sinh hreflang.

## `status` trên translation (4 entity)
```text
draft (mặc định) · published · hidden
```
Vòng đời `archived` nằm ở entity cha.

## Các phương án đã xem xét
- **A. Locale-status cho mọi translation (16 bảng).** Nhất quán tuyệt đối, over-engineering — bị loại từ v1.2.
- **B. Locale-status cho 7 entity chính (v1.2.1).** Vẫn buộc dịch tên 200 thiết bị và toàn bộ taxonomy — **bị thay thế**.
- **C. Locale-status cho 4 entity thật sự sẽ có bản dịch (chọn).** Khớp thực tế biên soạn nội dung; giảm 16 bảng translation còn 4.

## Lý do lựa chọn
Bảng translation chỉ tạo giá trị khi có người viết bản thứ hai. Ở đâu không có, nó chỉ thêm join, thêm trạng thái, thêm khả năng sai — mà không thêm nội dung nào.

## Hệ quả
- 05: bỏ 12 bảng translation, gộp trường vào bảng cha; 63 bảng → 52.
- 03: cập nhật danh sách bảng và nhóm trường dùng chung.
- 06: điều kiện truy vấn công khai tách hai trường hợp.
- 07: badge trạng thái theo ngôn ngữ chỉ hiện ở bốn entity có bản dịch.
- 08: trang `/vi/...` chỉ tồn tại cho bốn nhóm đó.
- ADR-011: hreflang thu hẹp phạm vi tương ứng.

## Tài liệu bị ảnh hưởng
01, 02, 03, 04, 05, 06, 07, 08, 10.

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
01/06/08 mô tả nhất quán semantics; trang lọc theo hãng dùng `/products/all?brand={slug}` (ADR-001), noindex,follow (ADR-011).

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
Entity published (+ translation published nếu có)          → index,follow, self-canonical
Draft / hidden / archived / deleted                        → không có public route / noindex,nofollow
Query filter URL (?brand=, ?standard=, ...)                → noindex,follow, canonical về /products/all
Search result                                              → noindex,follow
Admin / API / system / error page                          → noindex,nofollow
Landing category/standard/application CÓ mô tả              → index,follow, self-canonical
Landing category/standard/application KHÔNG có mô tả        → noindex,follow, canonical về /products/all
Hồ sơ hãng /brands/{slug}                                  → index,follow, self-canonical
```

### 2b. Landing phân loại chỉ index khi có nội dung biên tập (mới v1.3)
`/products/category|standard|application/{slug}` và URL lọc `/products/all?standard={slug}` trả **cùng một tập sản phẩm**. Cho phép index cả hai là nội dung trùng lặp.

Quy tắc: landing chỉ `index,follow` + self-canonical **khi trường mô tả không rỗng**. Nếu rỗng → `noindex,follow` + canonical về `/products/all`. Quy tắc này tự đúng theo thời gian, không cần ai nhớ bật/tắt.

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
1. **Dùng v1.3 làm baseline đầu tiên.** Baseline chứa cấu trúc cuối cùng của v1.3 (**52 bảng**), thay cho baseline v1.2.1 (63 bảng) vốn **chưa từng chạy trên môi trường nào**.
2. **KHÔNG có migration `071_v1_2_columns` trong chuỗi active.** Nội dung 071 chỉ là **ghi chú lịch sử** trong Changelog/archive. Không chạy `071` trên fresh database.
3. **Trigger `set_updated_at` gắn ở migration cuối của baseline**, sau toàn bộ index. Trigger được sinh tự động cho mọi bảng có cột `updated_at`.
4. **Rollback fresh baseline: chạy ngược tới migration đầu.** Baseline v1.3 tham chiếu `doc/verify/v1.3/schema_up.sql` và `schema_down.sql`.
5. Khi bắt đầu code, migration 001–070 được tạo từ baseline v1.2.1. **Sau khi chạy trên shared environment đầu tiên, các migration phải được đóng băng** (không sửa lại — thay đổi sau dùng migration mới).
6. **Upgrade tương lai:** nếu tồn tại một database v1.1 thật bên ngoài dự án, tạo **upgrade migration riêng sau khi xác nhận schema thực tế**; upgrade migration đó **không** thuộc baseline v1.2.1 hiện tại. Không viết sẵn migration 071 giả định.

## Các phương án đã xem xét
- **A. Baseline v1.2 (001–070) + 071 ALTER cho DB v1.1.** Gây nhầm migration nào active khi chưa có DB v1.1 — bị loại.
- **B. Baseline v1.2.1 duy nhất, 071 chỉ là lịch sử (chọn).** Một nguồn sự thật migration, rõ ràng cho lần đầu triển khai.

## Hệ quả
- 05 mô tả baseline v1.3; trigger ở migration cuối.
- 00/10 ghi baseline v1.3.
- **Tổng số bảng: 52** (63 − 12 bảng translation + 1 bảng `content_media_refs`).
- Baseline v1.3 đã được chạy và kiểm chứng trên PostgreSQL 16.2 thật; bằng chứng ở `doc/verify/v1.3/README_V1_3.md`.

## Tài liệu bị ảnh hưởng
00, 05, 06, 10.

---

# ADR-014 — Ngôn ngữ lưu trữ nội dung và ranh giới frontend/backend

**Trạng thái:** Accepted · **Ngày:** 2026-07-29

## Bối cảnh
Bản v1.2.1 tạo 16 bảng translation, coi mọi văn bản hiển thị là dữ liệu đa ngôn ngữ của backend. Thực tế có hai loại văn bản rất khác nhau bị gộp làm một:

- **Nhãn giao diện** — "Products", "View details", "Send request", thông báo lỗi, nhãn form. Cố định, do lập trình viên viết, không thay đổi theo dữ liệu.
- **Nội dung do admin nhập** — mô tả sản phẩm, bài viết, giới thiệu công ty. Thay đổi liên tục, chỉ tồn tại nếu có người viết.

Gộp hai loại khiến backend phải gánh cả việc dịch nhãn giao diện, và khiến mọi bảng nội dung phải có bản dịch dù không ai định viết.

## Quyết định

### 1. Nhãn giao diện thuộc về frontend
Toàn bộ nhãn giao diện nằm trong file ngôn ngữ của frontend. Backend **không** lưu, **không** phục vụ nhãn giao diện. Người xem đổi ngôn ngữ hiển thị bằng công tắc trên giao diện.

### 2. Nội dung do admin nhập thuộc về backend
Không thể khác: frontend không sinh ra được nội dung mà admin chưa nhập.

### 3. Quy tắc quyết định một bảng translation có đáng tồn tại không

> **Một bảng translation chỉ đáng tồn tại nếu sẽ có người ngồi xuống viết bản thứ hai.**

Áp dụng tại thời điểm v1.3:

| Nội dung | Quy mô | Sẽ có bản tiếng Việt do người viết? | Bảng translation |
|---|---|---|---|
| Sản phẩm | 150–200 | Không — tên thiết bị là danh từ riêng kỹ thuật | ❌ |
| Hãng | ~18 | Không | ❌ |
| Danh mục · Tiêu chuẩn · Ứng dụng · Ngành | ~50 | Không — chỉ là tên | ❌ |
| Tài liệu (metadata) | — | Không | ❌ |
| Khách hàng · Văn phòng · Banner · Menu | — | Nhãn giao diện | ❌ |
| **Trang giới thiệu** | ~10 | **Có** | ✅ |
| **Tin tức** | tăng dần | **Có** — nơi SEO tiếng Việt có giá trị thật | ✅ |
| **Dịch vụ** | 4–10 | **Có** — bán cho nhà máy trong nước | ✅ |
| **Dự án** | — | **Có** | ✅ |

Kết quả: **16 bảng translation → 4**.

### 4. Ngôn ngữ lưu trữ mặc định là tiếng Anh
Khớp nội dung hiện có và khớp việc tên thiết bị/hãng/tiêu chuẩn vốn là tiếng Anh.

### 5. Tên model thiết bị không dịch
`products.name` và `products.model` là danh từ riêng kỹ thuật (`OptiDist Atmospheric Distillation`, `HVM 472`), dùng chung mọi ngôn ngữ. Đây là mở rộng có chủ đích của nhóm "dữ liệu độc lập ngôn ngữ" mà ADR-004 v1.2.1 đã định nghĩa (`model`, `SKU`, mã tiêu chuẩn, tên riêng thương hiệu).

### 6. Thêm ngôn ngữ về sau là thao tác cộng thêm
Muốn có bản tiếng Việt cho sản phẩm sau này: tạo bảng `product_translations` bằng migration mới, thêm route `/vi/products/{slug}`. **URL tiếng Anh không đổi, không phát sinh redirect.**

## Các phương án đã xem xét
- **A. Giữ 16 bảng translation (v1.2.1).** Nhất quán trên giấy, nhưng 12 bảng sẽ vĩnh viễn chỉ có một hàng mỗi entity — **bị thay thế**.
- **B. Bỏ toàn bộ translation, dịch máy phía frontend.** Schema đơn giản nhất, nhưng mất hẳn SEO tiếng Việt kể cả cho tin tức — bị loại.
- **C. Giữ translation ở nơi thật sự có người viết (chọn).**

## Hệ quả
- 05: 63 bảng → 52; gộp trường của 12 bảng translation vào bảng cha.
- 05: `product_specifications`, `product_standards`, `project_products`, `project_media`, `media` bỏ cặp cột `*_vi`/`*_en`, còn một cột.
- ADR-004 viết lại theo quyết định này.
- ADR-001: URL tiếng Anh ở gốc, `/vi` chỉ cho bốn nhóm có bản dịch.
- 06: điều kiện truy vấn công khai tách hai trường hợp.
- 07: badge locale chỉ hiện ở bốn entity có bản dịch.

## Tài liệu bị ảnh hưởng
01, 02, 03, 04, 05, 06, 07, 08, 10.

---

# ADR-015 — Lọc và duyệt theo cây phân cấp

**Trạng thái:** Accepted · **Ngày:** 2026-07-29

## Bối cảnh
Năm nhóm dữ liệu có cấu trúc cây: `brands`, `product_categories`, `applications`, `services`, `post_categories`. Bản v1.2.1 chỉ có `parent_id` và **không tài liệu nào quy định** lọc theo nút cha có bao gồm nhánh con hay không.

Hậu quả đo được trên dữ liệu thật: PAC là hãng mẹ, sản phẩm gắn vào các thương hiệu con HERZOG/ISL/ALCOR. Truy vấn `WHERE brand.slug='pac'` trả về **0 sản phẩm**. Tương tự, cây danh mục 3–4 cấp trở nên vô dụng vì lọc cấp 1 không lấy được sản phẩm gắn ở cấp 3.

ADR-007 định nghĩa rất kỹ ngữ nghĩa OR/AND **giữa các chiều lọc** nhưng bỏ trống **chiều dọc của cây**.

## Quyết định

### 1. Lọc theo một nút luôn bao gồm toàn bộ nhánh con
Chọn "PAC" trả về sản phẩm của PAC và của mọi thương hiệu con. Chọn danh mục cấp 1 trả về sản phẩm của mọi danh mục con. Đây là kỳ vọng mặc định của người dùng.

### 2. Cơ chế: mảng tổ tiên vật chất hóa
Mỗi bảng cây có thêm:
```sql
ancestor_ids UUID[] NOT NULL DEFAULT '{}',   -- từ gốc xuống cha trực tiếp, đúng thứ tự
depth        INTEGER NOT NULL DEFAULT 0,
CHECK (NOT (id = ANY(ancestor_ids)))          -- chặn vòng lặp
CREATE INDEX ... USING GIN (ancestor_ids);
```

### 3. Truy vấn chuẩn cho nhánh con
```sql
WHERE id = :node_id OR ancestor_ids @> ARRAY[:node_id]::uuid[]
```
Dùng index GIN, không đệ quy, không N+1.

### 4. Breadcrumb bằng một truy vấn
`ancestor_ids` đã chứa đủ chuỗi tổ tiên theo thứ tự, lấy bằng một câu `WHERE id = ANY(...)` rồi sắp theo `depth`.

### 5. Bảo toàn tính đúng khi đổi cha
Khi `parent_id` của một nút đổi, `ancestor_ids` và `depth` của **nút đó và toàn bộ nhánh con** phải được tính lại **trong cùng transaction**. Bắt buộc có test đồng thời cho thao tác này.

### 6. Ngữ nghĩa lọc kết hợp với ADR-007
Mở rộng nhánh con xảy ra **trước** khi áp ngữ nghĩa OR/AND. Cùng một chiều vẫn OR, khác chiều vẫn AND:
```text
?brand=pac&brand=baker-hughes&standard=astm-d86
  → (nhánh PAC OR nhánh Baker Hughes) AND standard = ASTM D86
```

## Các phương án đã xem xét
- **A. Chỉ `parent_id` + recursive CTE.** Không thêm cột, luôn đúng, nhưng mỗi truy vấn lọc phải chạy đệ quy — khó đạt ngân sách truy vấn mà chiến lược kiểm thử đặt ra.
- **B. Closure table.** Mạnh nhất, nhưng thêm 5 bảng và chi phí ghi cao cho dữ liệu ít thay đổi.
- **C. Mảng tổ tiên vật chất hóa + GIN (chọn).** Không thêm bảng, đọc rất nhanh, chỉ phải cập nhật khi đổi cha — việc hiếm.

## Hệ quả
- 05: thêm `ancestor_ids`, `depth`, index GIN, CHECK chống vòng lặp cho 5 bảng cây.
- 06: query builder mở rộng nhánh con trước khi áp OR/AND; bổ sung test.
- 01/08: mô tả bộ lọc nói rõ chọn nút cha bao gồm nhánh con.

## Bằng chứng
Đã kiểm chứng trên PostgreSQL 16.2 với dữ liệu mô phỏng đúng cấu trúc website hiện tại: cách cũ trả 0 sản phẩm, cách mới trả 3. Chi tiết ở `doc/verify/v1.3/README_V1_3.md`.

## Tài liệu bị ảnh hưởng
01, 03, 05, 06, 08, 10.

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
| 014 Ngôn ngữ nội dung | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 015 Lọc theo cây |  | ● |  | ● |  | ● | ● |  | ● |
