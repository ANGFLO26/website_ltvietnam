# 12 — REQUEST ROUTING & DEPLOYMENT TOPOLOGY

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22
**Quyết định:** D7, D10, D11, **D17 (Next-delivery accepted)**, **D20 (public media)**.

---

## 1. Deployment diagram (single persistent host — D7)

```
                          Internet
                             │
                             ▼
                   ┌───────────────────┐
                   │  Nginx / Caddy    │  (reverse proxy, TLS, trusted proxy headers)
                   └───────┬───────────┘
     ┌──────────┬──────────┼──────────────┬─────────────────────┐
     ▼          ▼          ▼              ▼                     ▼
┌─────────┐ ┌────────┐ ┌────────────┐ ┌─────────────┐   ┌────────────────┐
│Next web │ │Nest API│ │ /media/*   │ │Worker proc. │   │ PostgreSQL 16  │
│public + │ │/api/v1,│ │ → media    │ │ (D6)        │   │ (schema ltv)   │
│ /admin  │ │health, │ │ volume     │ │ outbox      │   └────────────────┘
│         │ │sitemap,│ │ (D20)      │ │ claim/drain/│   ┌────────────────┐
│         │ │robots  │ │            │ │ reaper/hb   │   │ Persistent     │
└────┬────┘ └───┬────┘ └────────────┘ └──────┬──────┘   │ media volume   │
     │ internal │                            │          │ (StoragePort)  │
     │ resolver ▼                            ▼          └────────────────┘
     └────────►  PostgreSQL / media volume
   Backup: DB dump + media volume (D7)
```
No serverless / no Redis P0. In-process cache/rate-limit single-instance only (D9).

## 2. Routing matrix

| Path | External owner | Internal destination | Cache | Auth | Notes |
|---|---|---|---|---|---|
| `/api/v1/*` (public) | Proxy | Nest API | tùy endpoint | public | slug-based |
| `/api/v1/admin/*` | Proxy | Nest API | no-store | admin (JWT+CSRF) | |
| `/api/v1/auth/*` | Proxy | Nest API | no-store | mixed | |
| `/api/v1/documents/:slug/download` | Proxy | **Nest → protected file delivery** | no-store/policy | **public publication check** | PDF/document; Nest kiểm publication/locale/deleted/existence (D20) |
| `/health/live` | Proxy | Nest | no-cache | public | liveness |
| `/health/ready` | Proxy/internal | Nest | no-cache | **internal** | readiness (config+PG+storage) |
| `/health/worker` (hoặc heartbeat) | internal | Worker | no-cache | internal | worker health (D6) |
| `/sitemap.xml`, `/sitemap-*.xml` | Proxy | **Nest** (D13) | cache ngắn | public | chỉ published theo locale |
| `/robots.txt` | Proxy | **Nest** (D13) | cache | public | |
| **`/media/*`** | Proxy | **Nginx/Caddy → persistent media volume / storage adapter** (D20) | **immutable/versioned hoặc TTL theo loại** | public | public marketing images/variants |
| `/admin/*` | Proxy | Next | no-store | admin | SSR dynamic; security = Nest authz |
| Public page routes | Proxy | Next | theo route | public | Next gọi Nest route-resolution trước render |

### 2b. Public media (`/media/*`) rules (D20)
Content-addressed/versioned filename-path · **không** directory listing · MIME allowlist · **`X-Content-Type-Options: nosniff`** · **không** dùng user filename làm storage key trực tiếp · cache key **không** phụ thuộc Host header không tin cậy · variant mới = URL/version mới · soft-deleted theo purge/retention rõ · orphan reconciliation.

### 2c. Protected/controlled document delivery (D20)
Nest kiểm: document published + locale + deleted status + file existence → **stream** hoặc **protected internal redirect** (`X-Accel-Redirect`/tương đương). Client **không** truy cập protected filesystem path trực tiếp.

## 3. Page request lifecycle (redirect-before-render — Correction 3)

```
1. Browser → Proxy → Next page route
2. Next server request boundary gọi Nest Route-Resolution TRƯỚC SSR/streaming
3. Nest trả: redirect | content | not_found | (gone)
4a. redirect → Next emit NATIVE HTTP response status EXPLICIT 301 (permanent) trước render
              (302 CHỈ khi business rule thật sự yêu cầu temporary)
4b. content  → Next fetch content API + render; serialize <head> từ SEO contract
4c. not_found→ 404 locale-aware (noindex,nofollow)
```
- **KHÔNG** dùng framework helper nếu helper phát 307/308; phải trả **status explicit 301**.
- **KHÔNG** render HTML trước khi phát redirect; **KHÔNG** redirect ở client-side effect; **KHÔNG** JS redirect cho SEO URL.
- Nest authoritative redirect/slug/route/validation/loop-chain (D11/D17). Next chỉ delivery adapter.

## 4. Route-resolution contract

```json
{
  "result": "content | redirect | not_found | gone",
  "route_kind": "product | brand | service | project | post | document | page | taxonomy_list",
  "entity_id": "uuid-or-null",
  "locale": "vi | en",
  "canonical_path": "/san-pham/optidist-2",
  "robots": "index,follow | noindex,follow | noindex,nofollow",
  "alternates": [ { "locale": "en", "path": "/en/products/optidist-2" } ],
  "redirect": { "status_code": 301, "target_path": "/san-pham/optidist-2-new" }
}
```
`canonical_path` **relative**; absolute base URL từ environment (before-P8/P10). Filter/search → `robots=noindex,follow`, canonical về path gốc.

## 5. SEO metadata contract
Nest cung cấp `title/description/canonical_path(relative)/robots/alternates/social_image_url/structured_data_input`; Next serialize `<head>`/JSON-LD. `packages/route-rules` chỉ route templates/kind-constants/contract-types/normalization thuần — không DB/business resolution ở FE (D12).

## 6. Cache invalidation khi đổi slug (Correction 3)
Khi **A → B**, invalidate: **old path A · new path B · route-resolution cache · page cache · relevant sitemap cache**. Khi **A → B → C**, request A redirect **thẳng tới C** (không chain).

## 7. Failure behavior (Correction 3)
- Resolver unavailable/timeout → **không** trả cached-200-cũ nếu path có thể là redirect; trả **503/500 an toàn**; **không** cache lỗi (không cache 500 như 404/redirect).
- Không phát canonical/robots đoán mò khi backend down.
- `request_id` (`X-Request-ID`) end-to-end Proxy→Next→Nest→worker.

## 8. Design clarification — "backend redirect middleware"

**Trạng thái: `DESIGN CLARIFICATION ACCEPTED — NEXT-DELIVERY INTERPRETATION` (D17).**

Điều phối viên **chính thức chấp nhận**: Nest authoritative cho redirect records/slug/route/target-validation/loop-chain; **Next = HTTP delivery adapter** (gọi Nest resolver trước render, emit redirect trước render, không business logic). Đây là diễn giải tương thích của "redirect middleware phục vụ trước router" (Approved `06` §IX) — authority + redirect-before-render được bảo toàn; điểm phát HTTP ở Next/edge. **Không dùng Backend-Gateway ở P0.** (Đối chiếu `06` §IX, ADR-011 §6, ADR-001/002; không đổi schema/URL/scope — `14` PHẦN C.)

## 9. Redirect-before-render test (bắt buộc — `06`)
E2E qua topology production-like: đổi slug published → path cũ → **HTTP 301 explicit trước render** → landing path mới; A→B→C không chain; `/san-pham/hang/{slug}` → 301 `/san-pham/tat-ca?brand={slug}`. Chứng minh từ **P4**.

## 10. P0 technical spike (Correction 3)
**Deliverable P0:** "Verify explicit HTTP 301 mechanism against the exact Next.js version selected." Kết quả spike phải chứng minh: **status chính xác 301** · **xảy ra trước render** · hoạt động với **reverse proxy** · hoạt động với **route cache invalidation**. (Không viết code trong các Round planning; spike thực hiện ở P0 khi coding.)
