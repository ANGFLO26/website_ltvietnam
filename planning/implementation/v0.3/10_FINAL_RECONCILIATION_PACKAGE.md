# 10 — FINAL RECONCILIATION / VERIFICATION PACKAGE

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22
**Gửi:** Codex (Final Verification) + ChatGPT. **Yêu cầu:** xác nhận correction đã áp đúng + **tìm issue còn lại** trước khi khóa v1.0. KHÔNG cần đồng ý.

Bản độc lập tóm tắt v0.3 sau Round 5B correction pass (v0.2 + D17–D20 + 14 correction).

---

## 1. Quyết định người dùng (D1–D20)
D1–D16 (giữ v0.2: NestJS/một-Next-app/pnpm-monorepo/Kysely+raw-SQL/worker-riêng/single-VPS/persistent-volume/in-process-single-instance/routing-matrix/Nest-redirect+Next-delivery/Nest-SEO/sitemap-robots-Nest/content-migration/Git-prerequisite/Node-24-22). **Mới:** D17 Next-delivery redirect **ACCEPTED**; D18 API compatibility (B26) CONFIRMED; D19 idempotency fingerprint durable DB 071+; D20 public media `/media/*` + doc download qua Nest.

## 2. Topology (`12`)
Single VPS: Nginx/Caddy → {Next web (public+admin), Nest API, worker process, PostgreSQL 16, media volume, backup}. `/api/v1`,`/health`,`/sitemap*`,`/robots.txt`,`/api/v1/documents/:slug/download` → **Nest**; page routes + `/admin` → **Next**; **`/media/*` → proxy → media volume**.

## 3. Redirect delivery (D17 — Correction 3)
Nest authoritative resolver; Next emit **explicit HTTP 301** trước render (302 chỉ temporary); no client-side/JS SEO redirect; cache invalidation old/new/route-cache/page/sitemap; A→B→C không chain; resolver down → 503/500 an toàn (không cached-200-cũ). **P0 technical spike** verify 301 với Next version thật.

## 4. Media delivery (D20 — Correction 4)
`/media/*` public (storage-safe path/nosniff/no-listing/versioned cache/no-traversal); document download qua Nest (publication/locale/deleted/existence → stream/`X-Accel-Redirect`).

## 5. Stack & Phase
NestJS + một Next app + worker riêng, pnpm monorepo, Kysely + raw SQL baseline, Node 24/22. **13 phase labels:** P0,P1,P2,P3,P4,P5,P6A,P6B,P7,P8,P9,P10,P11. Critical path `P0→P1→P2→P3→P4→P5→P6A→P6B→P8→P10→P11`; **P7 parallel**.

## 6. Migration (CASE B — Correction 5)
`doc/verify/` **chỉ có aggregate** `schema_up.sql` (70 block markers) + `schema_down.sql` + `verify_checks.sql`. **KHÔNG có 70 file riêng lẻ.** P1 **materialize** executable set từ Approved schema (10 bước); concat ≡ verified aggregate → checksum + freeze; 071+ sau freeze.

## 7. Health (Correction 6)
Tách 4: liveness `/health/live` · readiness `/health/ready` (config+PG+storage; **KHÔNG** SMTP/worker) · worker `/health/worker` · degraded status (HEALTHY/DEGRADED/UNAVAILABLE). **SMTP/worker lỗi → API vẫn nhận Inquiry → 202.**

## 8. API compatibility (D18)
`/api/v1` backward-compatible; breaking → `/api/v2`/deprecation; CI breaking-change + client-freshness; mixed-version smoke; DB expand→migrate/backfill→contract. Deployment order: expand DB → deploy backward-compat API → deploy Next → backfill → remove deprecated sau window → contract.

## 9. Idempotency (D19)
Fingerprint durable PostgreSQL (071+); input canonicalized (loại timestamp/request_id/headers/captcha); same key+same fp → result cũ; same key+diff fp → 409 `IDEMPOTENCY_KEY_REUSED`.

## 10. Outbox reconciliation (Correction 12)
Trace fields + operational report (sent/pending/processing/retrying/failed/stale/duplicate-suspected); email đã gửi không rollback nhưng reconcile; no full PII.

## 11. Performance budget (Correction 10)
16 metric có **số/range** (`06` §13): query count list≤5/detail≤8/homepage≤12; payload list≤150KB/detail≤400KB; upload≤15MB/10MB, ≤8000px, ≤40MP, timeout≤20s; DB timeout≤3s; outbox batch 10–50; worker timeout≤30s; route-resolution≤800ms; sitemap chunk>10k; p95 staging list≤400ms/detail≤600ms; Lighthouse Perf≥80/A11y≥90/SEO≥95. Không SLA; P0/P3/P5 đo, P11 chốt.

## 12. Content migration (`13`)
CM0–CM4 song song P4–P11; **CM2 production write hard-disabled** (allowlist+approval+confirmation+backup+least-privilege; không dựa NODE_ENV). Business owner OPEN (C7).

## 13. Gate separation (Correction 1)
**Gate A Plan Approval** (no Critical/High; D1–D20+D17+D18; disposition; Codex final verification; user duyệt — **không Git**) vs **Gate B Coding Start** (`P0 READY TO START`: Git hợp lệ + toolchain + Docker/PG + decisions + P0 DoR). **Git R-25 = Gate B blocker.**

## 14. Correction disposition (`14`)
14 correction + 4 decision (D17–D20) tất cả **APPLIED**; không REJECT; không design conflict mới.

## 15. Remaining open decisions
before-P2: B23/B24 · before-P3: B25 · before-P7: SMTP/CAPTCHA/worker-batch/fingerprint-detail · before-P8/P10: canonical domain · before-P11: RPO/RTO/freeze/SPF-DKIM-DMARC/retention/discontinued.

## 16. Business decisions không chặn Gate A
C1–C4/C6. Chặn release: C5, C7, C9.

## 17. Gate B blocker
`.git` rỗng → R-25 (Gate B). Round 5B chỉ lập kế hoạch khôi phục; không chạy lệnh Git.

## 18. Issue disposition summary (Round 3 — `11`)
CR 1/1 ACCEPT · HIGH 21/21 ACCEPT · MEDIUM 8/8 ACCEPT · LOW 1 DEFER · OBS 3 CLOSED · REJECT 0.

## 19. Blocker classification (§S báo cáo)
- **Plan Approval (Gate A):** không blocker kỹ thuật; chờ Codex final verification + user duyệt.
- **P0 Coding Start (Gate B):** **Git R-25**.
- **Phase-specific:** B23/B24 (P2), B25 (P3), SMTP/CAPTCHA (P7), domain (P8/P10).
- **Release:** C5, C7, C9.

## 20. Câu hỏi cho Final Verification (tìm issue còn lại)
1. Explicit 301 + Next streaming SSR/CDN — còn edge case redirect-sau-render nào không (spike P0 đủ chưa)?
2. `/media/*` phục vụ từ reverse proxy — làm sao đồng bộ soft-delete/purge giữa DB và volume (orphan) mà không lộ file đã xóa?
3. Fingerprint durable 071+: header-only hash vs bảng phụ vs cột — phương án nào an toàn nhất **không** đổi baseline 001–070? (đã ghi 071+ expand/backfill).
4. Readiness không phụ thuộc SMTP/worker — có kịch bản nào storage-fail mà vẫn nên nhận inquiry (chỉ cần DB) không?
5. Materialization CASE B: split theo 70 block markers có rủi ro sai ranh giới `down` không? Verify concat ≡ aggregate đủ chưa?
6. Degraded status (HEALTHY/DEGRADED/UNAVAILABLE) — ngưỡng backlog/oldest-pending cụ thể nên đặt ở đâu (P7 hay P11)?
7. Gate A/Gate B tách — có tài liệu nào còn trộn Git vào Plan Approval không?
8. Performance budget: số đề xuất có chỗ nào phi thực tế cho B2B catalogue không?

## 21. Verdict Round 5B
`PLAN v0.3 PROPOSED FOR FINAL VERIFICATION` — mọi correction APPLIED; không Critical/High chưa xử lý. Chờ **Codex Final Verification** + user duyệt (Gate A); Git khôi phục (Gate B). **KHÔNG** Approved/Ready to Code/Planning Complete.
