# 06 — TEST & QUALITY STRATEGY

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

9 lớp test v0.1 **giữ** + bổ sung toàn bộ **Codex §K1** (HI-14) + phân **MANDATORY P0 / CONDITIONAL / DEFERRED WITH DOCUMENTED RISK** (§K2). Evidence **chuyển khỏi plan** (ME-07). Budget performance tạm (ME-08).

> Test viết trước (DoR). PASS phải kèm **evidence có commit SHA + command + env/version + exit code + raw log**; PASS không artifact = **NOT RUN** (R-14/`08`).

---

## 1–9. Chín lớp (giữ v0.1, tóm tắt)
Static (format/lint/type/dep-audit/dead-code/**circular-dep**) · Unit · DB integration · API/contract · **Concurrency** · E2E · Security · SEO · Performance. Chi tiết lớp giữ như `v0.1/06`; phần dưới là **bổ sung bắt buộc §K1** theo nhóm.

## 10. Bổ sung MANDATORY (§K1) theo nhóm

### Auth/session (P2)
JWT verification-key overlap/**rotation drill**; cookie expiry; **logout/current-session semantics**; password-change/reset invalidation; **reset replay + 2 concurrent reset**; **CSRF rotation** login/logout; **account-lock race**; **trusted proxy/IP spoof**; distributed brute force (chỉ khi multi-instance — CONDITIONAL).

### Browser security (P2/P9/P10)
CSP/HSTS/referrer/permissions/**nosniff**/frame policy (public+admin); SSR error không lộ stack; **JSON-LD/metadata escaping**.

### Upload/PDF (P3)
**oversized pixel dimensions**; **image decompression/resource bomb**; **PDF active-content/download policy**; **EXIF orientation/privacy**; **filename Unicode**; **processor timeout/memory cap**; concurrent duplicate; MIME spoof; SVG reject.

### Slug/redirect (P4)
2 create cùng slug; 2 rename về cùng slug; **redirect source race**; **A→B→C không chain**; **restore soft-delete**; same slug text khác locale; **redirect phải xảy ra trước render** (qua topology `12` §9).

### Product relations (P5)
2 primary category concurrent; **PATCH replace-set race/lost update**; **publish khi taxonomy archive/delete**; self related-product; duplicate links. → **Chốt optimistic-concurrency/row-lock strategy trước P5** (HI-20).

### Inquiry/outbox (P7)
**graceful shutdown**; **SMTP success rồi crash**; retry exhaustion; **clock skew/boundary**; provider timeout; **reaper/worker race**; **same idempotency key/different payload → 409 `IDEMPOTENCY_KEY_REUSED`**; **recipient snapshot**; **poison job**; **batch fairness/starvation**.
> Idempotency mismatch: nếu schema chưa có fingerprint field → `IMPLEMENTATION/SCHEMA REVIEW REQUIRED` (không tự thêm cột baseline ở R4).

### SEO (P8/P10)
base URL theo environment; trailing slash; query sorting/allowlist; pagination canonical; VI/EN duplicate rules; **404/410**; sitemap size/pagination; **XML escaping**; structured-data escaping.

### Media consistency (P3/P11)
concurrent duplicate checksum; **purge/read race**; DB record nhưng file thiếu; file còn nhưng DB purge; generated variant cleanup/rollback (orphan reconciliation).

### Contract/E2E/deploy (P0/P9/P10/P11)
**OpenAPI backward compatibility**; **generated client freshness** (CI fail khi stale); **mixed API/FE version smoke**; **SSR hydration mismatch**; mobile responsive; keyboard/focus/a11y; **download Content-Disposition/nosniff**; **locale switch giữ entity mapping**.

### Content migration (`13`, P4–P11)
counts/checksums; slug collision; **redirect coverage** (sampled+automated); broken-link scan; **delta idempotency**; file availability; visual sample QA.

## 11. §K2 — Phân loại gate

**MANDATORY P0/release gate:** toàn bộ §10 trừ các mục CONDITIONAL/DEFERRED dưới.

**CONDITIONAL:**
- Automated JWT key-rotation service — defer nếu có manual overlap/rollback drill + key inventory.
- Distributed rate-limit test — **không cần khi single-instance** (D9); **bắt buộc ngay khi multi-instance**.
- Antivirus/CDR cho PDF — defer nếu force download + `nosniff` + no inline + size limit + documented residual risk.
- Sitemap index/chunking — defer khi dataset < 50.000 URL + CI test/alert; **XML escaping KHÔNG defer**.
- HTTP range — defer nếu contract "full download only" + file bounded; **Content-Disposition/nosniff KHÔNG defer**.
- Exhaustive device/browser matrix — defer; **keyboard/focus + breakpoint chính + mobile form là P0**.

**DEFERRED WITH DOCUMENTED RISK:** ghi rõ rủi ro tồn dư + owner + điều kiện kích hoạt lại.

## 12. Evidence & provenance (ME-07 — chuyển khỏi plan)
Evidence lưu **`implementation/evidence/<commit-sha>/<phase>/`** hoặc **CI artifact store** — **KHÔNG** dưới `planning/implementation/v0.1|v0.2/`. Mỗi evidence: commit SHA + command + environment/version + exit code + raw log + checksum/artifact URL. Plan chỉ **link index**.

## 13. Performance budget tạm (ME-08 — `PRELIMINARY ENGINEERING BUDGET — TO BE VALIDATED ON STAGING`, không SLA)
- **Query count budget** list/detail (đo bằng no-N+1 EXPLAIN/query-count).
- **Payload limit** response list/detail.
- **Upload** max bytes + max pixels (B25).
- **DB query timeout**.
- **Outbox** batch size + processing timeout (B24/before-P7).
- **Sitemap** generation strategy (stream/chunk threshold).
- **Public API p95** target ở **dev/staging** (không phải production SLA).
- **Lighthouse** target sơ bộ.
- **No-N+1** acceptance (bắt buộc P5/P8/P10).
> Ngưỡng production SLO chốt ở P11 theo hạ tầng thật (D7).

## 14. Ma trận lớp × phase (bổ sung)

| Phase | Static | Unit | DB-I | API | Conc | E2E | Sec | SEO | Perf | Migr |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | ✓ | | | ✓(codegen) | | ✓ | ✓ | | ✓(budget) | ✓(executor) |
| P1 | ✓ | | ✓ | | | | ✓ | | ✓ | **✓** |
| P2 | ✓ | ✓ | ✓ | ✓ | **✓**(reset/lock race) | ✓ | **✓** | | ✓ | |
| P3 | ✓ | ✓ | ✓ | ✓ | ✓(dup/purge) | ✓ | **✓**(bomb/EXIF/PDF) | | ✓ | |
| P4 | ✓ | **✓** | ✓ | ✓ | **✓**(slug) | ✓(redirect-before-render) | ✓ | ✓ | ✓ | |
| P5 | ✓ | **✓** | ✓ | ✓ | **✓**(relations) | ✓ | ✓ | ✓ | **✓** | (071+) |
| P6A | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | | ✓ | |
| P6B | ✓ | ✓ | ✓ | ✓ | **✓**(replace-set) | ✓ | ✓ | | ✓ | |
| P7 | ✓ | ✓ | ✓ | ✓ | **✓**(shutdown/poison) | ✓ | ✓ | | ✓ | |
| P8 | ✓ | **✓** | ✓ | ✓ | | ✓ | ✓ | **✓** | ✓ | |
| P9 | ✓ | ✓ | | ✓ | | ✓ | ✓ | | ✓ | |
| P10 | ✓ | ✓ | | ✓ | | **✓**(14+hydration/a11y) | ✓ | **✓** | ✓ | |
| P11 | ✓ | ✓ | ✓ | ✓(**compat/mixed-version**) | ✓ | ✓ | **✓** | ✓ | **✓**(load) | ✓(restore) |

## 15. Chất lượng "test thật"
Test fail khi logic sai (mutation-sanity P11); DB integration dùng **Postgres thật** (không SQLite); concurrency chạy đa tiến trình/kết nối thật; screenshot không thay raw result.
