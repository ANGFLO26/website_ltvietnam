# 06 — TEST & QUALITY STRATEGY

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

9 lớp + Codex §K1 (giữ v0.2) + Round 5B: **media delivery tests** (Correction 4), **numeric performance budget** (Correction 10), **fingerprint/reconciliation** tests.

> PASS phải kèm evidence có commit SHA + command + env/version + exit code + raw log; PASS không artifact = **NOT RUN**. Evidence ngoài plan (`implementation/evidence/<sha>/<phase>/`).

---

## 1–9. Chín lớp (giữ v0.2)
Static (gồm circular-dep) · Unit · DB integration · API/contract · Concurrency · E2E · Security · SEO · Performance.

## 10. Bổ sung MANDATORY §K1 (giữ v0.2) + Round 5B

### Auth/session (P2)
key rotation/overlap; cookie expiry; logout/session; reset replay + 2 concurrent reset; password-change/reset invalidation; CSRF rotation; account-lock race; trusted proxy/IP spoof; CSP/HSTS/nosniff/frame; SSR error no-stack; JSON-LD/metadata escaping. **Readiness KHÔNG phụ thuộc SMTP/worker** (Correction 6).

### Media delivery + upload/PDF (P3 — Correction 4)
oversized pixel; decompression bomb; PDF active-content/download; EXIF privacy; Unicode filename; processor timeout/memory; concurrent duplicate; MIME spoof; SVG reject. **`/media/*` + document download:** **path traversal · wrong MIME · soft-deleted file · missing file · cache headers · Content-Disposition · nosniff**; document download **gated qua Nest** (publication/locale/deleted); client không truy cập protected path.

### Slug/redirect (P4 — Correction 3)
2 create/2 rename cùng slug; source race; A→B→C không chain; restore soft-delete; same slug khác locale; **explicit HTTP 301 (status chính xác)**; **redirect trước render**; **cache invalidation old/new path**.

### Product relations (P5)
2 primary category concurrent; replace-set race/lost-update; publish khi taxonomy archive/delete; self related-product; duplicate links. Lock strategy chốt trước P5.

### Inquiry/outbox (P7 — Correction 8/12)
graceful shutdown; SMTP success rồi crash; retry exhaustion; clock skew; provider timeout; reaper/worker race; poison; fairness; recipient snapshot; **same key+same fingerprint → result cũ**; **same key+different fingerprint → 409 `IDEMPOTENCY_KEY_REUSED`** (fingerprint **durable DB**, 071+); **outbox reconciliation report** (sent/pending/processing/retrying/failed/stale/duplicate-suspected trace); **SMTP down → API vẫn nhận inquiry (readiness OK)**.

### SEO (P8/P10)
base URL environment; trailing slash; query sort/allowlist; pagination canonical; VI/EN duplicate; 404/410; sitemap size/pagination; XML escaping; structured-data escaping.

### Contract/E2E/deploy (P0/P9/P10/P11 — D18)
OpenAPI backward compatibility; generated client freshness (CI fail khi stale); mixed API/FE version smoke; SSR hydration mismatch; mobile responsive; keyboard/focus/a11y; download Content-Disposition/nosniff; locale switch mapping.

### Content migration (`13`, P4–P11)
counts/checksums; slug collision; redirect coverage (sampled+automated); broken-link; delta idempotency; file availability; visual QA. **CM2 production guard** (từ chối ghi khi thiếu approval/allowlist/confirmation).

## 11. §K2 — Phân loại gate (giữ v0.2)
MANDATORY P0/release; CONDITIONAL (distributed rate-limit chỉ khi multi-instance; JWT key-rotation service defer nếu manual drill; PDF CDR defer nếu force-download+nosniff+limit; sitemap chunking defer <50k URL nhưng **XML escaping không defer**; HTTP range defer nếu full-download-only nhưng **Content-Disposition/nosniff không defer**; device matrix defer nhưng keyboard/focus+mobile P0); DEFERRED WITH DOCUMENTED RISK.

## 12. Evidence & provenance
`implementation/evidence/<commit-sha>/<phase>/` hoặc CI artifact — **KHÔNG** dưới `planning/.../v0.x/`. Mỗi evidence: SHA + command + env/version + exit code + raw log + checksum. Plan chỉ link index.

## 13. PRELIMINARY ENGINEERING BUDGET — TO BE VALIDATED ON STAGING (Correction 10 — có SỐ/RANGE)

> Không phải SLA. Owner = C (đề xuất) + Tech/Ops (validate). Phase xác nhận: **P0** (đặt) · **P3/P5** (đo+điều chỉnh) · **P11** (chốt SLO sau load test).

| # | Metric | Proposed value/range | Lý do | Phase chốt |
|---|---|---|---|---|
| 1 | Product list max SQL queries/request | **≤ 5** (target 1–3 + count) | batch load, no-N+1; 1 list + 1 count + vài join gộp | P5 đo, P11 chốt |
| 2 | Product detail max SQL queries/request | **≤ 8** | detail + brand + categories + specs + standards + applications + media + related (batch) | P5 đo |
| 3 | Homepage max SQL queries/request | **≤ 12** | nhiều section, batch mỗi nhóm, cache ngắn | P5/P8 đo |
| 4 | Product list payload max | **≤ 150 KB** (20 items) | card fields gọn, không content nặng | P5 |
| 5 | Product detail payload max | **≤ 400 KB** | có specs/relations; ảnh qua `/media/*` không trong JSON | P5 |
| 6 | Max upload bytes | **≤ 15 MB/file** (PDF), **≤ 10 MB** (ảnh) | B2B catalogue/datasheet; chống DoS | P3 (B25) |
| 7 | Max image width/height | **≤ 8000 px** mỗi chiều | chống oversized; đủ cho in ấn nguồn | P3 |
| 8 | Max total pixels | **≤ 40 MP** | chống decompression bomb | P3 |
| 9 | Image processing timeout | **≤ 20 s/file** | resize/webp; hủy nếu quá | P3 |
| 10 | DB statement timeout (public query) | **≤ 3 s** (target < 500 ms) | chống query treo; public nhẹ | P2/P5 |
| 11 | Outbox batch size | **10–50 jobs/lần** (default 20) | throughput vs lock time | P7 |
| 12 | Worker processing timeout/job | **≤ 30 s** (SMTP), lease **≥ 2×** processing timeout | reaper không cướp job sống | P7 |
| 13 | Route-resolution timeout (Next→Nest) | **≤ 800 ms** (target < 200 ms) | trước render; fail an toàn nếu quá (`12` §7) | P4/P8 |
| 14 | Sitemap URL threshold/chunking | **chunk khi > 10.000 URL/file** (giới hạn cứng 50.000) | sitemap spec; stream/chunk | P8 |
| 15 | Public API p95 (staging) | **≤ 400 ms** list, **≤ 600 ms** detail | mục tiêu dev/staging, không SLA | P11 |
| 16 | Lighthouse (preliminary) | Perf **≥ 80**, A11y **≥ 90**, SEO **≥ 95** (mobile) | B2B SSR, ảnh tối ưu | P10/P11 |

**No-N+1 acceptance** bắt buộc P5/P8/P10. Nếu chưa đủ dữ liệu chốt một số → dùng range trên + deadline (phase chốt) + test dùng để chốt (EXPLAIN/load test).

## 14. Ma trận lớp × phase (giữ v0.2, thêm media-delivery P3, fingerprint P7, 301 P4/P8)
P0 codegen+301-spike · P1 migration(materialize) · P2 auth-race+readiness · P3 media-delivery-security · P4 slug+explicit-301 · P5 relations+perf-budget · P6A/B replace-set · P7 shutdown+fingerprint+reconciliation · P8 SEO+301+cache-invalidation · P9 · P10 14-luồng+hydration+a11y · P11 compat/mixed-version+load+restore+CM.

## 15. Chất lượng "test thật"
Fail khi logic sai (mutation-sanity P11); DB thật (không SQLite); concurrency đa tiến trình; screenshot không thay raw result.
