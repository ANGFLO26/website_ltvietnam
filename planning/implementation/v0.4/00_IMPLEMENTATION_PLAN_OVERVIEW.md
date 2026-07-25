# 00 — IMPLEMENTATION PLAN OVERVIEW — WEBSITE LT VIETNAM

**Plan version:** v0.4  
**Ngày:** 2026-07-22  
**Trạng thái:** `PROPOSED FOR FINAL VERIFICATION`  
**Loại tài liệu:** standalone candidate baseline; chưa được người dùng phê duyệt và chưa được promote thành v1.0.

## 1. Mục đích và thẩm quyền

Plan này mô tả đầy đủ cách triển khai MVP Website LT Vietnam sau correction FV-01–FV-14. Nội dung normative nằm trong chính bộ v0.4. Lịch sử plan chỉ là provenance, không phải tài liệu bắt buộc để implementer hiểu hoặc thực hiện kế hoạch.

Thứ tự nguồn sự thật khi có mâu thuẫn:

`ADR → Phạm vi MVP → PostgreSQL Schema → ERD → Mô hình dữ liệu → Backend/API → Admin Wireframe → Public Frontend Wireframe → D1–D20 → plan này → audit reports`.

Plan không được âm thầm đổi Approved scope, schema hoặc URL. Baseline SQL 001–070 không bị sửa. Mọi implementation schema mới được ghi `IMPLEMENTATION MIGRATION 071+`; Round 6 không tạo SQL.

## 2. Baseline bất biến

- Kiến trúc: modular monolith REST, một Next.js app cho public và `/admin`, NestJS API, worker process riêng, PostgreSQL 16, single persistent VPS/Docker Compose.
- **25 application modules:** auth, users, media, settings, pages, homepage, brands, product-categories, standards, applications, industries, products, services, customers, projects, post-categories, posts, documents, offices, navigation, redirects, search, inquiries, seo, health.
- Infrastructure, worker, frontend app và shared services không được đếm thành application module thứ 26.
- **13 phase labels:** P0, P1, P2, P3, P4, P5, P6A, P6B, P7, P8, P9, P10, P11.
- Chiến lược: **Hybrid**; P0–P3 foundation, P4–P7 thin vertical, P8 convergence, P9/P10 completion, P11 release; P7 chạy song song sau P5 + service core; CM0–CM4 song song.
- Search P0 chỉ là **product-only search**. Không site-wide search P0.
- Scope giữ P0/P1/Future; applications P0 phẳng; không Users CRUD, auto-save nâng cao, facet count, scheduled publish, video upload, Inquiry Admin CRM UI hoặc ecommerce UI.

## 3. Critical path

```text
Pre-P0 Git prerequisite → Gate B → P0 → P1 → P2 → P3 → P4 → P5
→ P6A → P6B → P8 → P10 → P11
```

P7 chạy song song với P6B/P8-partial khi P5 và service core đã sẵn sàng. P9 hội tụ Admin trước P10/P11. CM0–CM4 đi từ P4 đến P11; C7 phải được assign trước khi CM0 chạy thật.

## 4. Hai gate độc lập

### Gate A — Plan promotion eligibility

- Không Critical; không High chưa xử lý; Medium có disposition và gate rõ.
- v0.4 standalone; A1–A25 và D1–D20 đầy đủ.
- FV-01–FV-14 có disposition kiểm chứng được.
- Scope audit PASS; independent final verification PASS.
- Người dùng phê duyệt promotion.

Git, B23, B24 và B25 không chặn Gate A. v0.4 hiện chưa đạt Gate A vì chưa có independent final verification PASS và user approval.

### Gate B — Coding start

- **Pre-P0 Git restoration** do user/authorized operator hoàn thành: repository root, `main`, remote hoặc quyết định no-remote, baseline commit, clean/known status, tag `docs-v1.2.1-approved`.
- Toolchain khả dụng; Docker/PostgreSQL 16 khả dụng; CI/evidence path sẵn sàng.
- P0 đạt DoR; kế hoạch spike HTTP 301 đã viết.

B23/B24 chỉ chặn P2. B25 chỉ chặn P3. Spike HTTP 301 PASS là P0 DoD, không phải điều kiện bắt đầu P0.

## 5. Các contract correction bắt buộc

- **FV-01 / D19:** Idempotency-Key global unique; fingerprint v1 versioned; atomic inquiry+outbox transaction; deterministic conflict/replay; timeout/legacy policy.
- **FV-02:** Readiness Model B: `/health/ready` chỉ core config+PostgreSQL; media và worker readiness riêng. Storage/SMTP/worker down không làm mất lead khi PostgreSQL up.
- **FV-03 / D20:** Media Semantics A — `PUBLIC-UNTIL-PURGE`; purge mặc định sơ bộ 30 ngày, configurable; cache TTL bounded 24 giờ; consistency và restore scan bắt buộc.
- **FV-04:** CASE B materialization có per-migration, prefix/down, failure injection, history, lock và non-transactional DDL acceptance; aggregate equivalence cần nhưng chưa đủ.
- **FV-08:** durable `inquiry_outbox_attempts` direction, retention tối thiểu sơ bộ 90 ngày, duplicate-suspected classification và no-blind-resend.
- **FV-09:** route resolver target p95 `< 200 ms`, preliminary fail-fast ceiling `350 ms`; chỉ tune 250–400 ms sau staging evidence.

## 6. Milestones

| Milestone | Sau | Acceptance tóm tắt |
|---|---|---|
| M0 | P0 | Repo đã được Gate B xác minh; scaffold/tooling; exact 301 spike PASS |
| M1 | P3 | Materialized DB, auth/core, Model B readiness, media/security foundation |
| M2 | P5 | Catalogue/product search usable end-to-end |
| M3 | P6B | Content core và quan hệ chéo hoàn chỉnh |
| M4 | P7 | Inquiry atomic, worker drain/reaper, durable reconciliation |
| M5 | P8 | Navigation/homepage/redirect/SEO delivery hoàn chỉnh |
| M6 | P10 | Admin và Public completion, scope-clean |
| M7 | P11 | CM4, security/performance/restore/release evidence; user go-live decision |

## 7. Tình trạng blocker

- **Gate A blockers:** independent final verification chưa PASS; user chưa phê duyệt. Không còn High được chủ ý defer trong nội dung v0.4.
- **Gate B blockers:** Pre-P0 Git restoration và kiểm chứng môi trường/toolchain/CI chưa hoàn thành.
- **Phase-specific:** B23/B24 trước P2; B25 trước P3; concurrency strategy trước P5; SMTP/CAPTCHA/worker tuning trước P7; domain/base URL trước P8/P10.
- **Content/release:** C7 trước CM0 thực và xuyên CM4/go-live; C5 và C9 trước release; C1 trước khi kích hoạt retention nghiệp vụ.

## 8. Giới hạn Round 6

Không source code, không migration SQL, không Git mutation, không sửa tài liệu Approved, không cleanup/archive/delete/move lịch sử và không tạo v1.0. Trạng thái duy nhất của candidate này là `PROPOSED FOR FINAL VERIFICATION`.
