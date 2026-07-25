# 01 — LOCKED DECISIONS & OPEN QUESTIONS

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Phân loại mọi quyết định thành 4 nhóm:
- **LOCKED** — đã chốt trong `doc/` (ADR/schema/scope). Không được đổi trong implementation.
- **OPEN DECISION** — kỹ thuật chưa chốt; có phương án + khuyến nghị; **cần người dùng chốt** trước coding.
- **BUSINESS DECISION** — cần doanh nghiệp (DN) quyết; không phải kỹ thuật.
- **IMPLEMENTATION DETAIL** — chi tiết code, không cần nâng thành ADR; do implementer chọn theo chuẩn.

> Nguyên tắc: không biến IMPLEMENTATION DETAIL thành ADR nếu chưa cần. Không âm thầm chốt OPEN DECISION.

---

## PHẦN A — LOCKED (nguồn: doc/ v1.2.1)

| # | Quyết định | Trạng thái | Nguồn | Ảnh hưởng implementation |
|---|---|---|---|---|
| A1 | Kiến trúc **Modular monolith**, REST, prefix `/api/v1`, tách `public / admin / auth` | Locked | 06, 09 | Layout module `Controller→DTO/Validator→Application Service→Repository`; module KHÔNG gọi repository module khác — giao tiếp qua Service/QueryPort |
| A2 | **Phân lớp module** cố định + danh sách 25 module MVP | Locked | 06 §I | Không tự thêm/bớt module; ranh giới rõ để phân công 2 AI |
| A3 | **PostgreSQL 16+**, schema `ltv`, PK `UUID gen_random_uuid()`, `TIMESTAMPTZ`, trạng thái `VARCHAR+CHECK` (không native enum), extensions `pgcrypto`+`citext`+`pg_trgm` | Locked | 05 §I | ORM/migration tool phải hỗ trợ schema riêng, CHECK, citext, raw SQL |
| A4 | **Migration baseline 001–070** (63 bảng); trigger `set_updated_at` tại **070**; thứ tự `067 fk_indexes → 068 search_indexes → 069 partial_indexes → 070 updated_at_triggers`; rollback **070→001**; **KHÔNG** có `071` active | Locked | ADR-013, 05 §XIV/XV | Schema lên **một khối** ở P1 (không "DB per slice"); sau khi chạy shared env đầu tiên → **đóng băng** 001–070 |
| A5 | **URL chi tiết phẳng** (`/san-pham/{slug}`, `/dich-vu/{slug}`, `/du-an/{slug}`, `/tin-tuc/{slug}`, `/hang-doi-tac/{slug}`, `/tai-lieu/{slug}`); **list theo nhóm** (`/san-pham/danh-muc|tieu-chuan|ung-dung/{slug}`, `/tin-tuc/danh-muc/{slug}`) | Locked | ADR-001, 02 | Router phẳng; API một-slug khớp `UNIQUE(locale,slug)` |
| A6 | **Hồ sơ hãng** `/hang-doi-tac/{slug}` (index, self-canonical) ≠ **lọc theo hãng** `/san-pham/tat-ca?brand={slug}` (noindex,follow, canonical `/san-pham/tat-ca`); `/san-pham/hang/{slug}` → **301** | Locked | ADR-001/011, 02 | Hai loại trang, không canonical sang nhau; redirect rule |
| A7 | **Slug lifecycle**: `UNIQUE(locale,slug)` thường (không partial); slug đã publish **không tái dùng**; xóa mềm giữ slug; `first_published_at` × **12 bảng translation có slug**; **SlugService kiểm 3 nguồn** (translation slug hiện tại · `redirects.source_path` · route bảo lưu) theo **public path đầy đủ**; đổi slug đã publish → tạo redirect 301 trong 1 transaction; hard-delete chỉ khi `first_published_at IS NULL` + draft + không redirect + không phụ thuộc | Locked | ADR-002, 05, 06 | SlugService + redirect middleware = service lõi dùng chung mọi entity có slug |
| A8 | **Inquiry**: lưu DB trước email; `inquiries` + `inquiry_outbox`; trả **202** sau commit; worker `FOR UPDATE SKIP LOCKED`; **stale-lock reaper**; idempotency `UNIQUE(idempotency_key)`; `UNIQUE(inquiry_id,channel,recipient)`; semantics **at-least-once** (KHÔNG exactly-once); **Message-ID ổn định** sinh xác định từ `outbox.id`; backoff 1p/5p/15p/1h/6h | Locked | ADR-003, 05, 06 | Worker nền + outbox; test concurrency bắt buộc; không dùng câu "không bao giờ gửi trùng" |
| A9 | **email_status ∈ {email_pending, email_sent, email_failed}** (bỏ `received`); **outbox.status ∈ {pending, processing, sent, failed}** | Locked | ADR-003, 03 §XIX | CHECK constraint từ chối `received` |
| A10 | **Locale publication** cho 7 entity chính (product/service/project/post/brand/page/document): translation có `status`+`published_at`; điều kiện công khai = entity published + not deleted + translation.locale=locale + translation.status=published; **KHÔNG fallback Brand detail** VI→EN; hreflang chỉ khi **cả hai** bản published | Locked | ADR-004, 03, 06 | Query công khai có điều kiện locale-status; PublishService set `first_published_at` một lần |
| A11 | Taxonomy/config translation (standard/application/industry/product_category/post_category/office/menu_item/banner/customer) **KHÔNG** có locale-status (hiển thị khi có bản dịch); nhưng 5 taxonomy có slug (`standard/application/industry/product_category/post_category`) **CÓ** `first_published_at` | Locked | ADR-004, 03 §3/§3b, 04 | Chỉ fallback dữ liệu độc lập ngôn ngữ (model/SKU/mã tiêu chuẩn/proper name khi DN xác nhận/nhãn hệ thống) |
| A12 | **Media**: mọi FK media `ON DELETE RESTRICT`; không xóa media đang dùng → **409 MEDIA_IN_USE**; **MediaUsageService** quét ~22 tham chiếu; chỉ `JPG/JPEG/PNG/WebP/PDF`; **không SVG, không upload video**; kiểm **magic-bytes/MIME thực**; đổi tên an toàn; chống path traversal; query công khai loại `deleted_at IS NOT NULL` | Locked | ADR-005/009, 05, 06 | `media` là dependency cứng cho hầu hết module |
| A13 | **Phạm vi P0/P1/Future** khóa; trường ecommerce (`sku, product_type, price_visibility, sale_mode, warranty_months, requires_configuration`) tồn tại trong schema nhưng **ẩn UI**; `applications` giữ `parent_id` nhưng **Admin P0 hiển thị phẳng** | Locked | ADR-006/010, 01, 07 | Không đưa P1/Future vào P0; không mô tả P1 như đã có |
| A14 | **Filter công khai**: dùng **slug**, **query key lặp**; **cùng dimension → OR, khác dimension → AND**; áp cho `category/brand/standard/application/industry/product_type`; **parameter binding** (không ghép SQL); **không facet count** (P1); `sort/order` whitelist; admin API dùng UUID | Locked | ADR-007, 06 | Filter query builder có test case cho từng tổ hợp |
| A15 | **PATCH replace-tập-quan-hệ**: trường mảng có mặt → thay toàn bộ tập; vắng → giữ nguyên; toàn bộ trong 1 transaction | Locked | ADR-008, 06 | Hợp đồng update mọi module có quan hệ |
| A16 | **Catalogue integrity**: KHÔNG `products.primary_category_id` (dùng `product_category_links.is_primary`, đúng 1 khi publish); ảnh đại diện ở `products.featured_image_id`; `product_media` KHÔNG có role `featured`; KHÔNG `service_documents` (dùng `document_services`); `products.brand_id NOT NULL`; draft chỉ cần `name`+`slug`; PublishService kiểm đầy đủ khi publish (không ép ở DB) | Locked | ADR-010, 05 §XIII | |
| A17 | **SEO**: canonical & robots **tự sinh** theo locale+route+trạng thái (KHÔNG lưu DB, KHÔNG checkbox Admin); translation chỉ giữ `seo_title`+`seo_description`; bỏ `social_image_id`; **social image fallback chain**; sitemap `sitemap.xml`/`sitemap-{locale}.xml` + `robots.txt` do backend sinh; structured data (Organization/LocalBusiness/Product-không-giá/Article/BreadcrumbList/FAQPage) | Locked | ADR-011, 05, 06 §XII, 08 | Module `seo` + canonical/robots resolver (unit test) |
| A18 | **External video**: content block `external_video` provider ∈ `{youtube, vimeo}`; backend validate domain + trích video ID + chuẩn hóa URL; **KHÔNG** lưu raw iframe/script; **KHÔNG** upload video; `documents.document_type` bỏ `video` | Locked | ADR-012, 05 | Lỗi → `422 VIDEO_PROVIDER_NOT_ALLOWED`/`VIDEO_URL_INVALID` |
| A19 | **Auth Admin**: Argon2id; JWT trong **HttpOnly + Secure + SameSite=Strict** cookie (không localStorage); phiên **8h**; **CSRF token** cho mọi POST/PATCH/DELETE; **CORS** origin cụ thể + credentials; rate-limit login 5/15'/IP + khóa sau N lần; reset token hạn ngắn, vô hiệu khi `password_changed_at` đổi | Locked | 06 §III, 01 §20 | |
| A20 | **Health**: `/health/live` public `{status:ok}`; `/health/ready` **nội bộ** (DB/storage/outbox/email), không lộ chi tiết/secret. **Audit log P0**: structured application log (**KHÔNG bảng `audit_logs`**), field `request_id/actor_user_id/action/entity_type/entity_id/result/timestamp/ip`; không log secret/PII đầy đủ; không Admin UI | Locked | 06 §IX/XI, ADR-006 | |
| A21 | **Redis KHÔNG bắt buộc** MVP (cache ngắn + rate-limit in-process); **storage adapter** local→S3/CDN; **SMTP adapter**; **worker nền** outbox; `GET /products/landing` **riêng** cho `/san-pham` (KHÔNG dùng `GET /home`) | Locked | 06 §I/IV | Khi scale ngang mới chuyển rate-limit/queue sang store dùng chung |
| A22 | **Search** pg_trgm (tên/model/hãng/danh mục/tiêu chuẩn/mô tả); đổi engine (Meilisearch/Elastic) sau **không đổi API**; **P0 chỉ product search** (toàn site = P1) | Locked | 06 §IX, 08 | |
| A23 | **Data retention**: `inquiries.expires_at` nullable **KHÔNG default**; `privacy.inquiry_retention_months` = **TBD**; hiện tại không tự purge/anonymize | Locked (giá trị = TBD) | ADR-003, 05 | Giá trị tháng là BUSINESS DECISION (C1) |
| A24 | **Response chuẩn** `{data}`/`{data,meta}`; **lỗi** `{error:{code,message,details,request_id}}`; HTTP 200/201/202/204/400/401/403/404/409/422/429/500; danh sách mã lỗi nghiệp vụ chốt ở 06 §X; **validation 3 lớp** (frontend → DTO → DB CHECK) | Locked | 06 §X | Contract test đối chiếu tài liệu |
| A25 | **Enum thống nhất** (03 §XIX): `banners.link_type`, `menu_items.link_type`, `product_media.media_role`, status, translation.status, `documents.document_type`, `email_status`, `outbox.status` | Locked | 03 §XIX, 05 | |

**Ghi chú phân loại:** "URL EN dùng tiền tố `/en`" (02) = LOCKED. "`applications` phẳng ở Admin" = LOCKED (đã chốt là *phẳng*). Việc `menu_items` dùng `custom_url` còn `banners` dùng `external_url` — 03 §XIX cho phép khác tên nhưng **khuyến nghị dùng `custom_url` cho cả hai khi code** → đây là **IMPLEMENTATION DETAIL** (không nâng thành OPEN DECISION), ghi nhận để implementer thống nhất.

---

## PHẦN B — OPEN DECISIONS (công nghệ — cần người dùng chốt)

Tài liệu khóa *kiến trúc* nhưng **KHÔNG khóa ngôn ngữ/framework**. Bảng dưới: mỗi quyết định có phương án + khuyến nghị + có cần người dùng chốt.

> **Quan trọng:** Claude KHÔNG tự chọn. Khuyến nghị dưới là để phản biện trong cross-review. Quyết định gốc là **B1** — nó kéo theo B2–B21.

| # | Quyết định | Phương án A | Phương án B | Phương án C | Khuyến nghị | Lý do | Cần chốt? |
|---|---|---|---|---|---|---|---|
| B1 | **Backend framework/runtime** | **NestJS (Node/TypeScript)** | Laravel (PHP) | FastAPI hoặc Django (Python) | **A (NestJS/TS)** | Một ngôn ngữ chung cho BE+FE (giảm ma sát 2 AI); module/DI hợp modular-monolith; hệ Postgres/queue tốt; dễ chia sẻ type với FE qua OpenAPI | **CÓ** |
| B2 | **ORM / query builder / migration tool** | **Prisma** (+ raw cho SKIP LOCKED) | Drizzle / Kysely (SQL-first) | TypeORM / Knex | **B (Kysely/Drizzle)** hoặc A tùy B1 | Filter builder OR/AND + outbox `FOR UPDATE SKIP LOCKED` cần **raw SQL kiểm soát**; migration phải khớp baseline 001–070 sẵn có (05); tránh ORM che mất SQL | **CÓ** |
| B3 | **Public frontend** | **Next.js (SSR/SSG)** | Nuxt (nếu B1=khác) | Server-rendered template (BE render) | **A (Next.js)** | SEO nặng: SSR/ISR, canonical/hreflang/sitemap/structured data, i18n `/en` — Next hỗ trợ tốt | **CÓ** |
| B4 | **Admin frontend** | **React SPA (Vite)** hoặc Next admin | Vue SPA | Cùng app Next với public | **A (React SPA riêng)** | Block editor, media picker, spec editor, relation selector → SPA phong phú; tách khỏi public để bảo mật/CORS rõ (`admin.` origin) | **CÓ** |
| B5 | **Monorepo vs multi-repo** | **Monorepo** (pnpm workspaces/Turborepo) | Multi-repo | — | **A (monorepo)** | Chia sẻ type/OpenAPI/lint; dễ atomic PR khi API đổi; hợp 1 người điều phối 2 AI | **CÓ** |
| B6 | **Package manager** | **pnpm** | npm | yarn | **A (pnpm)** | Nhanh, workspace tốt | Có (nhẹ) |
| B7 | **Test frameworks** | **Vitest (unit)** + Supertest (API) + Playwright (E2E) | Jest + … | — | **A** | Nhanh, hợp TS; Playwright cho 14 luồng E2E | Có (nhẹ) |
| B8 | **API doc / OpenAPI** | **OpenAPI 3.1** sinh từ decorators/schema | Viết tay | — | **A** | Contract test + chia sẻ type FE; là "hợp đồng" giữa BE và 2 FE | **CÓ** |
| B9 | **Docker + local dev** | **docker-compose** (Postgres + app + mailhog) | Local cài tay | Devcontainer | **A** | Postgres 16 + SMTP giả (MailHog) + worker; tái lập môi trường verify | **CÓ** |
| B10 | **CI/CD** | **GitHub Actions** | GitLab CI | — | Theo nơi đặt repo | Chạy static+unit+integration+migration test; lưu evidence | **CÓ** |
| B11 | **Hosting/deployment** | VPS + Docker | PaaS (Render/Fly/Railway) | Cloud (AWS/GCP) | **Chờ DN** (ràng buộc domain/email/storage) | Phụ thuộc B12/B13 + ngân sách DN | **CÓ (DN)** |
| B12 | **Storage provider** (adapter đã khóa A21) | **Local disk** (MVP) → S3 sau | S3/R2 ngay | — | **A (local MVP)** | Adapter cho phép đổi sau; MVP đơn giản, backup gồm media | Có |
| B13 | **Email/SMTP provider** | SMTP DN + relay (SES/Postmark/SendGrid) | SMTP thuần | — | **Chờ DN** | Cần domain + SPF/DKIM/DMARC (C5) | **CÓ (DN)** |
| B14 | **CAPTCHA provider** | **Cloudflare Turnstile** | reCAPTCHA v3 | hCaptcha | **A (Turnstile)** | Miễn phí, ít xâm phạm, có `captcha_score` | Có |
| B15 | **Logging library** | **pino** (structured JSON) | winston | — | **A (pino)** | Structured audit log (A20) + nhóm log 06 §XIII; nhanh | Có (nhẹ) |
| B16 | **Error tracking** | **Sentry** | tự log | — | **A (Sentry)** | Bắt lỗi production; không log PII/secret | Có |
| B17 | **Secret management** | `.env` + CI secrets (MVP) | Vault/SM | — | **A (MVP)** + không commit | Đơn giản MVP; nâng cấp sau | Có |
| B18 | **Cache** (A21: Redis optional) | **In-process LRU** (MVP) | Redis | — | **A (in-process MVP)** | Đúng A21; chuyển Redis khi scale ngang | Có |
| B19 | **Worker runtime** (outbox) | **In-process scheduler** (cùng app, batch) | Process riêng | BullMQ+Redis | **A (in-process MVP)** nhưng thiết kế **an toàn nhiều instance** | 06 §VII yêu cầu SKIP LOCKED an toàn kể cả nhiều instance; DB-outbox không cần Redis | **CÓ** |
| B20 | **Lint/format** | **ESLint + Prettier** (+ import/cycle rules) | Biome | — | **A** | Static check: dead-code, **circular module dependency** (06 §I) | Có (nhẹ) |
| B21 | **Runtime version** | **Node LTS (20/22)** | — | — | Node LTS | Ổn định | Có (nhẹ) |

**Ghi chú:** nếu B1 = Laravel/Python thì B2–B7 đổi tương ứng (Eloquent/migrations; SQLAlchemy/Alembic; PHPUnit/Pytest; Blade/Inertia hoặc Jinja). Toàn bộ khuyến nghị trên **giả định B1=A**; nếu DN chọn khác, Claude sẽ cập nhật cả cụm.

---

## PHẦN C — BUSINESS DECISIONS (DN quyết)

| # | Câu hỏi | Nguồn | Chặn gì | Phương án tham khảo |
|---|---|---|---|---|
| C1 | `inquiry_retention_months` là bao nhiêu? | ADR-003, 10 §E | Purge/anonymize (không chặn P0 build) | Hiện: NULL/không purge. 24 tháng chỉ tham khảo. |
| C2 | Ai duyệt logo khách hàng trước khi công khai? | 10 §E, 07 | Quy trình vận hành customers | Admin duyệt tay + cờ `is_public` |
| C3 | Có gửi **email xác nhận cho khách** không? P0 hay P1? | 10 §E | Có thể thêm channel outbox | MVP: chỉ email nội bộ; xác nhận khách = P1 (thêm channel) |
| C4 | Redirect khi sản phẩm **ngừng kinh doanh**? | ADR-002, 10 §E | Rule discontinued | Mặc định giữ URL; chỉ redirect khi DN duyệt từng ca |
| C5 | **Domain + SPF/DKIM/DMARC** đã sẵn sàng? | 06 §VII, 10 §E | Deliverability email (chặn P7 test thật + release) | Cần DN cấu hình DNS |
| C6 | **Mức hoàn thiện tiếng Anh** lúc ra mắt? | ADR-004, 10 §E | Nội dung EN publish (không chặn code) | EN publish độc lập; không bắt buộc lúc launch |

---

## PHẦN D — IMPLEMENTATION DETAILS (implementer tự chọn theo chuẩn, không cần ADR)

- Cấu trúc thư mục module cụ thể, tên class/hàm, DTO shape nội bộ.
- Thư viện phụ (uuid, date, validation lib như zod/class-validator) — miễn khớp validation 3 lớp.
- Chuẩn hoá `external_url` vs `custom_url` → khuyến nghị dùng `custom_url` cho cả hai khi code (03 §XIX).
- Định dạng phiên bản ảnh (thumbnail/small/medium/large) — miễn có WebP + tối ưu.
- Cách sinh `X-Request-ID`; format log line (miễn có field bắt buộc A20).
- Backoff cụ thể trong khoảng đã cho (1p/5p/15p/1h/6h là ví dụ có thể cấu hình).

> Các mục này **không** cần người dùng chốt; nêu ra để tránh nhầm chúng thành OPEN DECISION.
