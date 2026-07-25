# 10 — CODEX REVIEW PACKAGE

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22
**Gửi tới:** Codex (independent auditor — Round 3)
**Yêu cầu:** KHÔNG cần đồng ý. Hãy **tìm lỗi, thiếu sót, rủi ro, thứ tự sai, test/rollback/security còn hở**. Không sửa plan trực tiếp trước khi báo cáo.

Bản này độc lập, đủ để Codex phản biện mà không cần đọc lại toàn bộ `doc/` (nhưng nên đối chiếu ADR khi nghi ngờ).

---

## 1. Mục tiêu dự án

Website B2B LT Vietnam: giới thiệu năng lực, sản phẩm, hãng đối tác, dịch vụ kỹ thuật; khách xem thông tin, tìm/lọc sản phẩm, tải tài liệu công khai, **gửi yêu cầu** để công ty liên hệ. **Không** ecommerce/giỏ hàng/thanh toán/tài khoản khách. Hai đối tượng: khách (không đăng nhập) + **một** tài khoản Admin. Song ngữ VI (mặc định) + EN (`/en`, publish độc lập).

## 2. Các quyết định đã KHÓA (tóm tắt — chi tiết `01` A)

Modular monolith REST `/api/v1` (public/admin/auth) · PostgreSQL 16, schema `ltv`, UUID, VARCHAR+CHECK, ext pgcrypto/citext/pg_trgm · **migration baseline 001–070 đóng băng, trigger tại 070, rollback 070→001, không 071 active** · URL chi tiết phẳng + list theo nhóm; hồ sơ hãng (index,self-canonical) ≠ lọc `?brand=` (noindex,follow) · slug không tái dùng + `first_published_at`×12 + SlugService 3-nguồn + redirect khi đổi slug · inquiry lưu DB trước email, 202, worker SKIP LOCKED+reaper, idempotency, **at-least-once** + Message-ID ổn định từ `outbox.id` · locale publication 7 entity chính, **không fallback brand**, hreflang cả-hai-published · media RESTRICT + 409 + MediaUsageService, không SVG/video, magic-bytes · filter slug key-lặp, cùng-dim OR/khác-dim AND, không facet count · PATCH replace-set transaction · catalogue: không primary_category_id, is_primary ở link, brand_id NOT NULL, PublishService · SEO canonical/robots tự sinh (không lưu DB), social image fallback · external_video youtube/vimeo, không raw iframe · auth Argon2id + JWT HttpOnly cookie + CSRF + CORS · health live/ready + structured audit log (không bảng) · Redis không bắt buộc · search pg_trgm.

## 3. Open decisions (cần Codex có ý kiến về khuyến nghị — `01` B)

**Gốc: B1 backend framework** (khuyến nghị NestJS/TS) kéo theo ORM/migration, FE (Next.js public + React admin), monorepo, test frameworks, OpenAPI, Docker, CI/CD, storage/email/CAPTCHA/logging/error-tracking/secret/cache/**worker runtime**/lint. **Business:** retention inquiry, duyệt logo KH, email xác nhận khách, redirect SP ngừng KD, domain+SPF/DKIM/DMARC, mức EN. → Codex: khuyến nghị stack có hợp lý cho ràng buộc SSR-SEO + outbox concurrency + 2-AI không? Có lựa chọn tốt hơn?

## 4. Chiến lược implementation được đề xuất (`02`)

**Hybrid:** Foundation-first P0–P3 (tooling/DB baseline một-khối/core-auth/media) — vì schema lên một khối (ADR-013) và media+users là dependency cứng; **Vertical slice P4–P7** (taxonomy → **products nút thắt** → content → inquiry) chia 2 AI theo module độc lập; **Cross-cutting P8–P11** (nav/home/seo/redirect → hardening) với FE scaffold sớm theo OpenAPI.

## 5. Danh sách phase (`04`)

P0 Tech decisions & bootstrap · P1 DB baseline 001–070 · P2 Core/auth/users/settings/health/audit · P3 Media · P4 Taxonomy (brands+SlugService, categories, standards, applications, industries) · P5 **Products** + filter/search/landing · P6 Content (pages/services/projects/posts/documents/customers/offices + external_video) · P7 Inquiry+outbox worker · P8 Nav/homepage/redirect/seo/search · P9 Admin FE · P10 Public FE · P11 Integration/security/perf/a11y/release.

## 6. Critical path (`03`/`04`)

`tooling → DB 001–070 → core+auth → media → brands+categories(+standards/apps/industries) → PRODUCTS+filter/search → public product pages → SEO/redirect → hardening/release`. **Nút thắt = products (P5).**

## 7. Dependency graph (`03`)

Tầng: 0 tooling → 1 DB(một khối) → 2 core/auth/users/settings/health → 3 media → 4 taxonomy(song song) → 5 PRODUCTS→search → 6 content(song song) → 7 inquiry → 8 nav/home/seo/redirect → 9/10 FE → 11 hardening. Service lõi ngang: SlugService, PublishService, MediaUsageService, filter builder, canonical/robots resolver, locale condition.

## 8. Test strategy (`06`)

9 lớp: static (gồm **circular-dep**) · unit (PublishService/SlugService/filter/resolver/MediaUsage/idempotency/backoff/locale/video) · DB integration (63-table migrate+rollback+lần-hai, FK/unique/CHECK/trigger/soft-delete/slug/primary/outbox-lock) · API/contract · **concurrency** (2-worker SKIP LOCKED, reaper, retry cùng Message-ID, 2 idempotency-key, 2 đổi slug) · E2E (14 luồng) · security (SVG/MIME/XSS/CSRF/CORS/header-injection/path-traversal/secret/PII) · SEO · performance (N+1). Evidence bắt buộc.

## 9. Risk register quan trọng (`09`)

Cao: R-05 migration drift · R-07 locale/fallback · R-08 slug/redirect · R-09 inquiry mất/trùng · R-13 SEO canonical · R-14 test giả · R-19 upload/injection. Điều phối 2 AI: R-04 xung đột · R-20 tích hợp muộn. DN: R-10/R-15/R-16.

## 10. Các điểm Claude CHƯA CHẮC CHẮN (đề nghị Codex soi kỹ)

1. **Worker runtime (B19):** MVP dùng **in-process scheduler** an toàn nhiều instance (DB-outbox, SKIP LOCKED) thay vì process/queue riêng — có đủ an toàn khi chạy nhiều instance app không? Có nên tách worker process ngay từ P7?
2. **Ranh giới P5/P6 cho external_video:** validate video test ở P5 (product content) hay dồn P6 (service dùng chung)? Hiện đặt service ở P6 nhưng product ở P5 có content video.
3. **SlugService hoàn thiện ở P4 (brands)** rồi tái dùng — có rủi ro thiết kế thiếu khi product (P5) có ràng buộc slug khác (public path `/san-pham/...`) không?
4. **Thứ tự P7 vs P8:** inquiry (P7) trước seo/nav (P8) — nhưng homepage/nav cần products/content xong (P5/P6). Có nên đảo P7 sau P8? (Hiện để P7 trước vì inquiry độc lập với SEO.)
5. **Ngưỡng performance** chưa số hóa (chờ hạ tầng B11) — chấp nhận để P11 chốt hay cần đặt ngưỡng tạm ngay?
6. **Baseline verify** hiện là kết quả một-lần (POSTGRESQL16 ALL CHECKS PASSED) — plan yêu cầu Codex chạy lại độc lập ở P1; đủ chưa?
7. **In-process cache + rate-limit (A21/B18):** khi chạy nhiều instance, rate-limit in-process không nhất quán — MVP chấp nhận hay cần Redis sớm hơn?
8. **Migration mới ≥071 do một DB owner cấp số** — cơ chế này đủ chống trùng số khi 2 AI cùng cần migration trong một phase không?

## 11. Những nội dung Codex CẦN PHẢN BIỆN

- Thứ tự phase & critical path có tối ưu? Có phase nên **gộp/tách/đảo**? (đặc biệt P7↔P8, P5 nút thắt).
- Dependency graph có **thiếu cạnh** nào (vd navigation cần settings? seo cần redirects trước?)?
- Test strategy có **thiếu lớp/case** nào? (đặc biệt concurrency, SEO, upload security).
- Rollback từng phase có khả thi? Phase nào **khó rollback** mà chưa nêu?
- Phân công 2 AI + ownership có **điểm nghẽn** (Claude ôm quá nhiều service lõi → bottleneck)?
- Có OPEN DECISION nào Claude **bỏ sót** hoặc **âm thầm giả định**?
- Có chỗ nào **P1/Future rò rỉ** vào P0 không?
- Khuyến nghị stack (B1) có phù hợp ràng buộc thật (SSR-SEO, outbox, 2-AI)?

## 12. Câu hỏi cụ thể cho Codex

Q1. Có nên **tách worker outbox thành process riêng ngay P7** thay vì in-process? Rủi ro at-least-once thay đổi thế nào?
Q2. Critical path đặt **products (P5)** làm nút thắt — có đường phụ thuộc dài hơn Claude bỏ sót (vd seo/homepage phụ thuộc toàn bộ content) khiến P8 mới là nút thắt thật?
Q3. Việc **freeze baseline 001–070** rồi mọi thay đổi dùng migration ≥071 — có mâu thuẫn nào với việc phát triển lặp (nếu phát hiện thiếu index/constraint khi code P5)?
Q4. Có test **concurrency** nào còn thiếu ngoài 6 case ở `06` lớp 5?
Q5. Có rủi ro **SEO/locale** (R-07/R-13) nào chưa có test tương ứng trong `04`?
Q6. Phân vùng P6 (C: services/projects/external_video; X: pages/customers/offices/documents/posts) có tạo **phụ thuộc chéo** gây chặn không (vd posts link tới projects/services do C làm)?
Q7. Danh sách **mã lỗi nghiệp vụ** (06 §X) có đủ cho mọi nhánh 422/409 trong plan không?
Q8. Có nên thêm phase/nhánh cho **data migration website cũ** (03 §XX / 06 §XII checklist) mà plan hiện chưa tách riêng?

> Định dạng báo cáo Codex mong đợi: **Critical / High / Medium** issues · **Alternative sequence** (nếu có) · **Missing tests** · **Missing rollback** · **Feasibility concerns** · **Questions for Claude**.
