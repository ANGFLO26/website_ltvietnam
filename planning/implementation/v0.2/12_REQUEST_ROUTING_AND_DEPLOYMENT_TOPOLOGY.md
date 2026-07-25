# 12 — REQUEST ROUTING & DEPLOYMENT TOPOLOGY

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22
**Giải quyết:** CR-01. **Quyết định người dùng:** D7, D10, D11, D12, D13.

Mục tiêu: một **request topology chạy được** với **một owner duy nhất** cho public redirect/SEO, tương thích Approved `06` §I/§IX/§XII và ADR-011 §6.

---

## 1. Deployment diagram (single persistent host — D7)

```
                          Internet
                             │
                             ▼
                   ┌───────────────────┐
                   │  Nginx / Caddy    │  (reverse proxy, TLS, trusted proxy headers)
                   └───────┬───────────┘
          ┌────────────────┼─────────────────────────┐
          ▼                ▼                          ▼
   ┌────────────┐   ┌────────────┐            ┌────────────────┐
   │ Next.js web│   │ NestJS API │            │ Worker process │  (D6, cùng codebase)
   │ (public +  │   │ /api/v1,   │            │ outbox: claim/ │
   │  /admin)   │   │ health,    │            │ drain/reaper/  │
   │            │   │ sitemap,   │            │ heartbeat      │
   │            │   │ robots     │            └───────┬────────┘
   └─────┬──────┘   └─────┬──────┘                    │
         │ internal route │                           │
         │ resolution     ▼                           ▼
         └──────────►┌────────────────────────────────────┐
                     │        PostgreSQL 16 (schema ltv)   │
                     └────────────────────────────────────┘
                     ┌────────────────────────────────────┐
                     │  Persistent media volume (StoragePort - D8) │
                     └────────────────────────────────────┘
   Backup: DB dump + media volume (D7)
```

Thành phần: reverse proxy · Next.js web (public + `/admin`) · NestJS API · worker process riêng · PostgreSQL 16 · persistent media volume · backup. **No serverless, no Redis P0** (D7). In-process cache/rate-limit chỉ single-instance (D9).

## 2. Routing matrix

| Path | External owner | Internal destination | Cache | Auth | Notes |
|---|---|---|---|---|---|
| `/api/v1/*` (public) | Proxy | Nest API | tùy endpoint (public GET cache ngắn) | public | slug-based |
| `/api/v1/admin/*` | Proxy | Nest API | no-store | admin (JWT cookie+CSRF) | |
| `/api/v1/auth/*` | Proxy | Nest API | no-store | mixed | login/logout/me/reset |
| `/health/live` | Proxy | Nest | no-cache | public | `{status:ok}` |
| `/health/ready` | Proxy/internal | Nest | no-cache | **internal only** | probe registry (`03`) |
| `/sitemap.xml` | Proxy | **Nest** (D13) | cache ngắn | public | chỉ published theo locale |
| `/sitemap-*.xml` | Proxy | **Nest** (D13) | cache ngắn | public | |
| `/robots.txt` | Proxy | **Nest** (D13) | cache | public | |
| `/admin/*` | Proxy | **Next** | **no-store** | admin | SSR dynamic; security = Nest authz |
| Public page routes (`/san-pham/*`, `/hang-doi-tac/*`, `/dich-vu/*`, `/du-an/*`, `/tin-tuc/*`, `/tai-lieu/*`, `/gioi-thieu*`, `/lien-he`, `/tim-kiem`, `/en/*`, `/`) | Proxy | **Next** | theo route (published→cache; filter/search→no-index) | public | Next gọi Nest route-resolution trước render |

**Nguyên tắc chống xung đột ownership:** sitemap/robots **chỉ** Nest phục vụ (proxy route root URL tới Nest — D13); Next **không** phục vụ các root URL này. Page routes **chỉ** Next; Nest **không** render page.

## 3. Page request lifecycle (redirect-before-render)

```
1. Browser → Proxy → Next nhận page route (vd /san-pham/optidist-2)
2. Next gọi Nest internal Route-Resolution contract (server-side, trước render)
3. Nest trả một trong:
      - result=redirect   → { status_code, target_path }
      - result=content    → { route_kind, entity_id, locale, canonical_path, robots, alternates, SEO meta }
      - result=not_found  → 404 theo locale
      - (result=gone      → 410, chỉ khi future policy dùng)
4a. Nếu redirect  → Next emit HTTP 301/302 tới target_path **TRƯỚC render** (không render page rồi mới redirect)
4b. Nếu content   → Next fetch content API + render; serialize <head> từ SEO metadata contract
4c. Nếu not_found → Next render 404 locale-aware (noindex,nofollow)
```
Nest **authoritative** cho redirect record/slug lifecycle/route resolution/target validation/loop-chain prevention (D11). Next chỉ **delivery adapter** (emit HTTP), không tự tạo logic redirect nghiệp vụ.

## 4. Route-resolution contract (schema logic — không chốt tên endpoint cuối)

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
- Chỉ field phù hợp mới xuất hiện (redirect chỉ khi `result=redirect`; alternates chỉ khi cả hai bản published — ADR-004).
- **`canonical_path` là RELATIVE** — KHÔNG lưu/không trả absolute canonical trong DB; absolute base URL ghép từ environment đã chốt (B23/before-P8-P10).
- Filter/search route → `robots=noindex,follow`, `canonical_path` về path gốc (vd `/san-pham/tat-ca`).

## 5. SEO metadata contract

Phân biệt 3 concern (có thể gộp response để giảm round-trip nhưng **không duplicate business logic**):
- **Route resolution** (§4) — Nest.
- **Content API** (dữ liệu entity) — Nest.
- **SEO metadata** — Nest cung cấp: `title, description, canonical_path (relative), robots, alternates[{locale,path}], social_image_url, structured_data_input`. Next **serialize** `<title>`/meta/canonical(absolute)/robots/hreflang/OG/JSON-LD.

`packages/route-rules` (shared, D12): route templates + route-kind constants + contract types + normalization thuần. **KHÔNG** DB/business resolution ở frontend package.

## 6. Failure behavior

| Tình huống | Hành vi bắt buộc |
|---|---|
| Nest timeout / resolver unavailable | Next trả **503/500 an toàn** (không phát canonical/robots đoán mò); **không** render content với SEO sai |
| Redirect lookup failure | Không tự ý 200 page; trả lỗi tạm thời để retry; không "nuốt" redirect |
| Content API failure | Trang lỗi thân thiện (không stack trace); **không** cache lỗi |
| Cache | **Không cache 500 như 404**; không cache redirect sai; TTL riêng cho content vs redirect |
| Observability | `request_id` (`X-Request-ID`) truyền **end-to-end** Proxy→Next→Nest→worker; log tương quan |

## 7. Security

- **Internal route-resolution API**: chỉ gọi từ Next server-side (internal network / shared secret / mTLS tùy hạ tầng); không expose public.
- **Trusted proxy**: cấu hình forwarded headers (`X-Forwarded-For/Proto/Host`) chỉ tin từ proxy; IP extraction cho rate-limit/audit (B23/B24).
- **Canonical host allowlist**: chỉ sinh canonical/redirect target thuộc host cho phép → chống **open-redirect** và **cache poisoning** (host header injection).
- **Admin**: `no-store`, dynamic SSR; security thật = **Nest authorization** (không phải tách bundle — D2).
- **Cookie**: HttpOnly+Secure+SameSite=Strict; same public origin cho page + `/api/v1` giảm CORS/CSRF phức tạp (D10).

## 8. Design clarification — cụm "backend redirect middleware"

Approved `06` §IX: "redirect middleware **phục vụ trước router**" và ADR-011 §6: frontend sinh metadata. Trong topology D10, **public page routes đi tới Next**, nên NestJS redirect middleware **không thấy** request page (chỉ thấy `/api/v1/*`). D11 chọn mô hình **Next-delivery** (Next emit redirect sau khi hỏi Nest resolver).

**Kết luận:** `DESIGN CLARIFICATION REQUIRED BEFORE CODE`.

**Lý do:** Về *authority & semantics*, mô hình D11 **tương thích** ý định Approved — Nest vẫn authoritative cho redirect record/validation/loop-prevention, và redirect vẫn xảy ra **trước render**. Tuy nhiên về *literal*, "middleware phục vụ trước router (ở backend)" ngụ ý HTTP redirect được **backend** phát; trong D10 điểm phát chuyển sang Next/edge. Đây là thay đổi *điểm phát HTTP* (không phải thay đổi owner logic). Theo nguyên tắc "không âm thầm sửa thiết kế / không âm thầm đổi owner", cần **user + architecture owner ký xác nhận** một trong hai:
- **(Đề xuất) Next-delivery interpretation:** chấp nhận Next emit redirect sau khi hỏi Nest resolver (đơn giản, một hop) — ghi rõ là diễn giải tương thích của "backend authoritative redirect".
- **Backend-gateway alternative:** mọi public page request đi qua Nest redirect gateway rồi mới proxy sang Next (khớp literal nhất, thêm một hop).

Không chọn/không ký → **không code P8 redirect delivery**. (Đối chiếu `06` §IX, ADR-011 §6, ADR-001/002.)

## 9. Redirect-before-render test (bắt buộc — `06`)
E2E qua topology production-like: đổi slug published → request path cũ → nhận **301 trước render** → landing path mới; A→B→C không tạo chain; `/san-pham/hang/{slug}` → 301 `/san-pham/tat-ca?brand={slug}`. Chứng minh từ **P4** (redirect delivery proof), không chờ P8.
