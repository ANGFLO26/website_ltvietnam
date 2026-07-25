# 03 — MODULE DEPENDENCY GRAPH & CRITICAL PATH

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

**25 application modules** + infrastructure/worker/frontend-app/shared-services riêng. Giữ correction v0.2 (config→logging→DB; bỏ Auth↔Users cycle; validator trước P5; P6A/P6B; edges P8). **Round 5B bổ sung:** health tách 4 loại (Correction 6).

Loại phụ thuộc: **S** schema · **D** domain/service · **A** API · **U** UI · **Se** seed · **I** hạ tầng.

---

## 1. Bootstrap direction
```
Repository/tooling (D1–D20, Git) → Config (không đọc DB) → Logging+Error primitives
   → Database pool + Migration executor (raw SQL, D5) → feature modules
```
`settings` (DB-backed) = module runtime, KHÔNG đồng nhất bootstrap Config. **Không** cạnh `config → DB`.

## 2. Auth / Users (không cycle)
`Users/Identity (owns repo) → exposes UserAuthenticationQueryPort → Auth application service` [một chiều]; guard ở app composition. Users **không** import Auth. P0 một tài khoản: `/auth/me`+profile+change-password. **Không Users CRUD.**

## 3. Health — tách 4 loại (Correction 6)
```
Health:
  (a) API liveness  /health/live     — API process sống (KHÔNG kiểm SMTP/worker/backlog/remote-storage dài)
  (b) API readiness /health/ready    — config + PostgreSQL + storage BẮT BUỘC để phục vụ request hiện tại
                                        → SMTP/worker lỗi KHÔNG làm mất readiness nếu vẫn lưu inquiry→202
  (c) Worker health /health/worker    — PostgreSQL + heartbeat + lease + claim + reaper + email-config/provider signal
  (d) Degraded operational status     — HEALTHY/DEGRADED/UNAVAILABLE (backlog/oldest-pending/email_failed/
                                        SMTP-failures/heartbeat-stale) — KHÔNG loại API khỏi traffic
Probe registry: DB probe (P2) → storage probe (P3) → worker heartbeat/email (P7)
Deployment profile khai báo probe REQUIRED; required-chưa-đăng-ký ⇒ readiness FAIL
```
> **Nguyên tắc bắt buộc:** SMTP lỗi hoặc worker tạm dừng → **API vẫn nhận Inquiry → lưu DB+outbox → trả 202**. Readiness API **không** phụ thuộc SMTP/worker.

## 4. Shared services trước P5
`ContentBlock schema + ExternalVideo validator + Sanitization policy` ở **P3**; dùng lại P5/P6. Cùng nhóm: SlugService, PublishService, MediaUsageService, filter builder, canonical/robots resolver, locale condition, **route-resolution contract** (`12`).

## 5. Bảng DAG (25 module) — giữ như v0.2, sửa health
| Module | Phụ thuộc cứng | Phase |
|---|---|---|
| config/logging/errors (infra) | tooling | P0/P2 |
| DB pool + migration executor (infra) | config/logging | P1 |
| users(identity+port) | DB | P2 |
| auth | DB, users(port), config, logging | P2 |
| settings | DB | P2 |
| **health (liveness/readiness registry + worker + degraded)** | DB (P2); storage (P3); worker+email (P7) | P2→P7 |
| media (+StoragePort) | DB, users | P3 |
| ContentBlock/ExternalVideo validator (shared) | media | **P3** |
| brands / product_categories / standards / applications / industries | media, SlugService, locale | P4 |
| redirects (delivery) | SlugService, route-resolution (`12`) | **P4→P8** |
| products | media, brands(NOT NULL), 3 taxonomy, SlugService, PublishService, validator, locale | P5 |
| search (**product-only**) | products (pg_trgm) | P5 |
| pages/customers/offices/post_categories; services/documents/posts/projects core | media, SlugService, locale (+customers→projects, post_categories→posts) | P6A |
| cross-module links | P6A core + products | P6B |
| inquiries + outbox worker (+fingerprint 071+) | settings(email), products/services(SET NULL), SMTP, CAPTCHA | P7 |
| navigation | menus/menu_items, is_featured, configured source | P8 |
| homepage | homepage_sections, banners, media, pages, settings, industries, +published modules | P8 |
| seo | route providers, redirects, settings/base-url | P8 |
| Next web app (public + admin) | route-resolution + SEO contract + OpenAPI client | thin P4+, completion P9/P10 |

## 6. Edges (giữ v0.2)
**Bỏ:** config→DB; users→auth; P2 health hard-check storage/outbox; P8 hard-edge P7; validator chỉ-từ-P6.
**Thêm:** DB dùng config+logging; auth→UserAuthenticationQueryPort; health registry incremental; validator trước P5; customers→projects; post_categories→posts; navigation→configured-source; homepage→banners/media/pages/settings/industries; SEO sitemap→route providers+base URL; redirect delivery→public router từ P4; OpenAPI→generated-client→FE deploy.

## 7. Critical path
```
P0 decisions/Git → P1 raw baseline(materialize) → P2 core/auth → P3 media+content-security
→ P4 taxonomy + slug/redirect proof → P5 product thin vertical → P6A content core → P6B relationships
→ P8 web delivery → P10 public completion → P11 content delta/hardening/release
```
**P7 parallel** sau P5+service core. **13 phase labels** (P0,P1,P2,P3,P4,P5,P6A,P6B,P7,P8,P9,P10,P11).

## 8. Nhánh song song & nút thắt
Sau P3: 5 taxonomy; content core; FE shell. Sau P4: navigation core, SEO route-rules. Sau P5+service core: P7 song song P6B. Admin liên tục, hội tụ P9. Content migration CM0(P4)→CM4(P11). Nút thắt: P5 products; P6B+P8 fan-in; topology (trước P4); Claude shared-service (giảm bằng RACI `08`).
