# PLAN_CHANGELOG — Implementation Plan LT Vietnam

Theo dõi thay đổi **bản kế hoạch triển khai** (không phải `doc/`). Trạng thái plan tách biệt thiết kế (v1.2.1 Approved).

---

## v0.3 — 2026-07-22 — PROPOSED FOR FINAL VERIFICATION (Round 5B Correction Pass)

**Tác giả:** Claude (Round 5B — correction sau ChatGPT Final Reconciliation Review). **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` (KHÔNG Approved/Ready to Code/Planning Complete). Giữ nguyên v0.2 (không sửa).

### Decisions mới D17–D20
- **D17** Next-delivery redirect **ACCEPTED** (`12` §8 = `DESIGN CLARIFICATION ACCEPTED — NEXT-DELIVERY INTERPRETATION`; không Backend-Gateway P0).
- **D18** API compatibility policy (B26 CONFIRMED → USER-CONFIRMED): `/api/v1` backward-compatible, breaking → `/api/v2`, CI breaking-change + client-freshness, mixed-version, DB expand→migrate→contract.
- **D19** Idempotency fingerprint **durable PostgreSQL**, migration **071+** (không sửa 001–070; không tạo migration ở Round này); same key+diff fp → 409 `IDEMPOTENCY_KEY_REUSED`.
- **D20** Public media `/media/*` (nosniff/no-listing/storage-safe/versioned) + document download qua Nest (publication gate).

### 14 Correction (chi tiết `14`)
1. **Gate tách đôi:** Gate A Plan Approval vs Gate B Coding Start; `P0 READY TO START`; **Git R-25 = Gate B blocker (không Gate A)**.
2. **B23–B26 staging:** B23/B24 before-P2, B25 before-P3 (không before-P0); bỏ câu "D1–D16+B22–B26 đều before-P0".
3. **Exact HTTP 301:** explicit 301, redirect-before-render, no client-side SEO redirect, cache invalidation old/new, A→B→C không chain, resolver-down 503/500; **P0 technical spike**.
4. **Media routing:** `/media/*` + document download qua Nest + tests.
5. **Migration materialization = CASE B** (chỉ aggregate; P1 materialize executable 001–070, 10 bước, concat ≡ verified aggregate → checksum + freeze).
6. **Health split 4 loại:** liveness/readiness(no SMTP-worker)/worker/degraded; **SMTP lỗi → API vẫn nhận Inquiry → 202**.
7. **B26 → D18:** P0 tooling + DoD API + deployment order.
8. **Idempotency fingerprint (D19).**
9. **13 phase labels** (sửa "12 Phase"); `/tim-kiem` **product-only**.
10. **Performance budget có số/range** (16 metric, `06` §13; không SLA).
11. **CM2 production write hard-disable** (allowlist/approval/confirmation; không NODE_ENV).
12. **Outbox reconciliation report** (trace + operational; email đã gửi không rollback nhưng reconcile).
13–14. File `14` disposition đầy đủ.

### File thay đổi so v0.2
`00` gate/13-phase/status; `01` D17–D20 + staging đúng; `02` 13-phase/product-search; `03` health 4 loại; `04` P0 spike/P1 materialize/P2 readiness/P7 fingerprint+reconciliation; `05` health/media/fingerprint/search rows; `06` media-delivery tests + numeric budget; `07` gate tách + staging + DoD API; `08` Git Gate B + materialization owner; `09` R-33 + R-25 Gate B; `10` Final Verification Package; `12` `/media/*` + explicit 301 + D17 accepted; `13` CM2 guard.

### File mới
`14_ROUND5_CORRECTION_DISPOSITION.md`.

### Nguyên tắc giữ
Không code; không migration SQL; không sửa Git; không sửa `doc/` Approved; không sửa `v0.1/`,`v0.2/`; không tự phê duyệt; không ADR mới. Diễn giải Approved ghi rõ + nguồn (`14` PHẦN C).

### Còn mở
Gate A: chờ Codex final verification + user duyệt. Gate B: Git R-25. Phase: B23/B24(P2), B25(P3), SMTP/CAPTCHA(P7), domain(P8/P10). Release: C5/C7/C9.

---

## v0.2 — 2026-07-22 — PROPOSED FOR FINAL RECONCILIATION (Round 4)
16 file tại `planning/implementation/v0.2/`. Response to Codex Round 3 audit (CR-01 + HI-01..21 + ME-01..08); D1–D16; file `11`/`12`/`13` mới; P6A/P6B; critical path bỏ cycle. (Lịch sử giữ trong `v0.2/`.)

## v0.1 — 2026-07-22 — PROPOSED FOR CROSS-REVIEW (Round 1)
12 file tại `planning/implementation/v0.1/`. Hybrid; 12 phase; dependency graph; risk R-01..R-22. (Lịch sử giữ trong `v0.1/`.)
