# 06 — TEST & QUALITY STRATEGY

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

9 lớp kiểm thử. Nguyên tắc: mỗi test ghi rõ **kiểm chứng điều gì** — không "test đầy đủ". Test **viết trước** (điều kiện DoR). Mọi PASS phải kèm **evidence** (điều kiện DoD) — báo PASS không evidence bị coi là test giả (R-14).

---

## 1. Static checks (mọi phase, CI)
- **Format** (Prettier/Biome) · **Lint** (ESLint + rules bảo mật) · **Type check** (tsc `--noEmit`).
- **Dependency audit** (npm/pnpm audit; chặn High/Critical).
- **Dead code** (ts-prune/knip).
- **Circular module dependency** — bắt buộc (06 §I: module không gọi repo module khác) qua ESLint import rules / madge. Vi phạm → fail CI.

## 2. Unit tests (service/logic thuần, không DB thật)
Tập trung:
- **PublishService** — mọi nhánh thiếu (missing primary category/overview/short_description/featured_image/brand-deleted) → mã lỗi đúng; set `first_published_at` một lần.
- **SlugService** — kiểm 3 nguồn theo public path đầy đủ; reject slug hiện tại / `redirects.source_path` / route bảo lưu; sinh slug hợp lệ.
- **Filter query builder** — cùng-dim OR, khác-dim AND, tổ hợp; parameter binding (không ghép chuỗi).
- **Canonical/robots resolver** — bảng ADR-011 đầy đủ loại trang.
- **MediaUsageService** — quét đủ ~22 tham chiếu (mock repo).
- **Inquiry idempotency** — cùng key → trả kết quả cũ.
- **Outbox retry/backoff** — chuỗi 1p/5p/15p/1h/6h; Message-ID xác định từ `outbox.id`.
- **Locale publication rules** — điều kiện công khai; không fallback brand; hreflang cả-hai-published.
- **external_video validate**; **customer_visibility resolver**; **email header sanitize** (CR/LF); **last_error sanitize**.

## 3. Database integration tests (Postgres 16 thật)
- **63-table migration** 001→070 PASS; **rollback** 070→001; **migration lần hai** idempotent.
- **FK**: RESTRICT (xóa media đang dùng → lỗi), CASCADE (xóa product → translations/links mất), SET NULL (parent/customer).
- **Unique**: `(locale,slug)`, `idempotency_key`, `(inquiry_id,channel,recipient)`, `standards UPPER(org,code)`.
- **CHECK**: `email_status` từ chối `received`; `document_type` từ chối `video`; `outbox.status` chấp nhận `processing`.
- **Triggers**: `set_updated_at` cập nhật `updated_at` (gắn tại 070).
- **Transactions**: publish rollback khi thiếu; đổi slug + redirect atomic.
- **Soft delete**: giữ slug; query công khai loại `deleted_at`.
- **Slug reservation**: slug đã publish không tái dùng.
- **Primary category**: đúng 1 `is_primary`, nằm trong tập đã gắn.
- **Outbox locking**: `FOR UPDATE SKIP LOCKED` (xem lớp 5).

## 4. API tests (contract + behavior)
- **Public** endpoints: chỉ trả published/not-deleted/đúng locale.
- **Admin** endpoints: auth bắt buộc; xem draft/hidden/archived.
- **Auth/Authorization**: thiếu cookie → 401; CSRF thiếu → 403; CORS lạ → chặn.
- **Validation**: 400/422 với mã lỗi nghiệp vụ (06 §X).
- **Pagination**: `page/page_size` (max 100), meta đúng.
- **Filters**: slug key-lặp OR/AND; sort whitelist.
- **Locale**: `?locale`→Accept-Language→vi.
- **Error format**: `{error:{code,message,details,request_id}}`.
- **Idempotency**: `POST /inquiries` cùng key.
- **Contract**: đối chiếu OpenAPI (schema drift → fail).

## 5. Concurrency tests (BẮT BUỘC — ADR-003)
- **Hai worker claim cùng một outbox job** → chỉ một chuyển `processing`.
- **SKIP LOCKED** — job bị lock không bị worker khác lấy.
- **Stale-lock reaper** — `processing` quá `processing_timeout` → `pending`.
- **Retry cùng Message-ID** — SMTP đã nhận + worker chết trước ghi `sent` → gửi lại **cùng** Message-ID (at-least-once).
- **Hai request cùng Idempotency-Key** → một inquiry/outbox.
- **Hai request đổi cùng slug** đồng thời → chỉ một thắng, không tạo redirect loop/trùng.

## 6. E2E tests (14 luồng tối thiểu)
1. Admin đăng nhập. 2. Upload media. 3. Tạo brand/category/product **draft** (chỉ Tên VI+Hãng+Danh mục chính). 4. **Publish sản phẩm VI**. 5. **EN chưa publish không xuất hiện**. 6. Lọc **`(PAC OR Herzog) AND ASTM D86`**. 7. **Đổi slug → redirect 301**. 8. Gửi Inquiry khi **SMTP hoạt động**. 9. Gửi Inquiry khi **SMTP lỗi** → vẫn "đã tiếp nhận". 10. **Retry outbox** → sent. 11. **Tài liệu công khai tải bằng slug**. 12. **Brand EN chưa publish không fallback VI**. 13. **Video YouTube/Vimeo hợp lệ** render. 14. **Raw iframe/domain lạ bị từ chối**.

## 7. Security tests
Auth cookie (HttpOnly/Secure/SameSite) · CSRF · CORS · Rate limit (login/inquiry/search/public) · Password hashing (Argon2id) · **Header injection** (CR/LF email) · **XSS trong content block** (sanitize whitelist) · **SVG rejection** · **MIME spoofing** · **Path traversal** (tên file) · **Secret exposure** (settings mask, không log secret) · **PII logging** (audit log không PII đầy đủ). Dependency audit. (Khuyến nghị pentest nhẹ ở P11.)

## 8. SEO tests
Canonical (chi tiết self / filter về `/san-pham/tat-ca`) · Robots (noindex filter/search; noindex,nofollow admin/error) · Hreflang (chỉ cả-hai-published) · Sitemap (chỉ published theo locale; không filter/search) · Redirect (301 đổi slug; `/san-pham/hang/{slug}`→301) · **Noindex cho filter/search** · Structured data (Organization/Product-không-giá/Article/BreadcrumbList/FAQPage).

## 9. Performance tests
Product list · Product detail (batch, no N+1) · Homepage aggregate · `/products/landing` · Search (pg_trgm) · Outbox batch · **N+1 detection** (EXPLAIN/quét query count). Ngưỡng cụ thể chốt ở P11 theo hạ tầng (B11).

---

## 10. Ma trận lớp test × phase (tối thiểu)

| Phase | Static | Unit | DB-I | API | Conc | E2E | Sec | SEO | Perf | Migr |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | ✓ | | ✓ | | | | ✓ | | ✓ | **✓** |
| P2 | ✓ | ✓ | ✓ | ✓ | | ✓ | **✓** | | ✓ | |
| P3 | ✓ | ✓ | ✓ | ✓ | | ✓ | **✓** | | ✓ | |
| P4 | ✓ | **✓** | ✓ | ✓ | | ✓ | ✓ | | ✓ | |
| P5 | ✓ | **✓** | ✓ | ✓ | | ✓ | ✓ | | **✓** | |
| P6 | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | | ✓ | |
| P7 | ✓ | ✓ | ✓ | ✓ | **✓** | ✓ | ✓ | | ✓ | |
| P8 | ✓ | **✓** | ✓ | ✓ | | ✓ | ✓ | **✓** | ✓ | |
| P9 | ✓ | ✓ | | ✓ | | ✓ | ✓ | | ✓ | |
| P10 | ✓ | ✓ | | ✓ | | **✓** | ✓ | **✓** | ✓ | |
| P11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** | ✓ | **✓** | ✓ |

## 11. Evidence & báo cáo
Mỗi phase lưu trong `planning/implementation/v0.1/evidence/<phase>/` (khi coding): test report (junit/coverage), log concurrency/security, EXPLAIN, screenshot/recording E2E, sample sitemap/robots/email (che PII). Không có evidence = không tính PASS.

## 12. Chất lượng "test thật"
- Test phải **fail khi logic sai** (mutation-sanity ngẫu nhiên vài chỗ ở P11).
- Không mock lớp cần kiểm chứng thật (DB integration dùng Postgres thật, không SQLite).
- Concurrency test chạy đa tiến trình/đa kết nối thật, không giả lập tuần tự.
