# 14 — ROUND 5B CORRECTION DISPOSITION

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22
**Nguồn:** ChatGPT Final Reconciliation Review (Round 5) + quyết định điều phối **D17–D20**.

Correction pass nhỏ trên v0.2 (không viết lại). Bảng disposition cho 14 correction + 4 decision.

---

## PHẦN A — Decisions D17–D20

| Decision | Disposition | Files changed | Section | Validation |
|---|---|---|---|---|
| **D17** Next-delivery redirect ACCEPTED | **APPLIED** | `01` B22/D17; `12` §8 | 12 §8 đổi thành `DESIGN CLARIFICATION ACCEPTED — NEXT-DELIVERY INTERPRETATION` | Grep không còn "REQUIRED BEFORE CODE" active cho redirect; D17 trong decision log |
| **D18** API compatibility policy (B26 CONFIRMED) | **APPLIED** | `01` B26→D18; `04` P0; `06` §Contract; `07` DoD; `08` | B26 = USER-CONFIRMED | Grep "B26" không còn OPEN; deployment order 6 bước |
| **D19** Idempotency fingerprint durable DB 071+ | **APPLIED** | `01` D19; `04` P7; `05` #26; `06` §K; `09` | fingerprint durable PostgreSQL, migration 071+ | Grep fingerprint durable + 071+ + 409 |
| **D20** Public media `/media/*` + doc download qua Nest | **APPLIED** | `01` D20; `12` §2/media; `06` | routing matrix có `/media/*` + `/api/v1/documents/:slug/download` | Grep `/media/*` + doc-via-Nest |

## PHẦN B — 14 Correction

| # | Correction | Disposition | Files changed | Section | Validation |
|---|---|---|---|---|---|
| C1 | **Gate separation** (Plan Approval vs Coding Start) | **APPLIED** | `00` §7; `04` P0; `07` C; `08` §5; `09` R-25; `10` §17/§19; changelog | Gate A / Gate B / `P0 READY TO START` | Git chỉ chặn Gate B; Gate A không có Git |
| C2 | **B23–B26 staging** (không before-P0 blocker) | **APPLIED** | `01` C.3; `07` A.2/A.3 | before-v1.0 / before-P0 / before-P2 / before-P3 | Bỏ câu "D1–D16 + B22–B26 đều before-P0"; B23/B24 before-P2; B25 before-P3 |
| C3 | **Exact HTTP 301 delivery** | **APPLIED** | `12` §3/§8/§9/§10; `04` P0 spike | explicit 301, trước render, cache invalidation, no client-side SEO redirect | P0 technical spike tồn tại |
| C4 | **Media routing matrix** | **APPLIED** | `12` §2/§2b; `06` media tests | `/media/*` + doc download; public/protected rules | 2 dòng matrix + tests |
| C5 | **Migration 001–070 materialization** | **APPLIED — CASE B** | `04` P1; `08` §5; `10` §I | aggregate-only; materialize là P1 deliverable | Không tuyên bố 70 file tồn tại; 10-step |
| C6 | **API/worker health split** | **APPLIED** | `03` health; `04` P2/P7; `05` #4; `06`; `07`; `09` R-33; `10` §J | liveness/readiness/worker/degraded; SMTP-fail không chặn inquiry | 4 loại health |
| C7 | **B26 compatibility → D18** | **APPLIED** | `01` D18; `04` P0; `06`; `07` | P0 tooling + DoD API + deployment order | (xem D18) |
| C8 | **Idempotency fingerprint → D19** | **APPLIED** | `04` P7; `06`; `05` | durable DB 071+; inputs canonicalized; 409 | (xem D19) |
| C9 | **Phase count = 13 labels** | **APPLIED** | `00`; `02`; `04`; `05` | "13 phase labels" | Grep "13 phase"; không "12 Phase" |
| C10 | **`/tim-kiem` product-only MVP** | **APPLIED** | `00`; `02`; `04` P8; `05` #16; `12` matrix | product-only, no site-wide | site-wide = P1 |
| C11 | **Performance numeric budget** | **APPLIED** | `06` §13 | bảng có số/range + owner + phase | 16 metric có số |
| C12 | **CM2 production write guard** | **APPLIED** | `13` §CM2/§9 | hard-disable default + allowlist/approval/confirm | không dựa NODE_ENV |
| C13 | **Outbox reconciliation report** | **APPLIED** | `04` P7/P11; `06`; `09` R-29 | trace fields + operational report | no full PII |
| C14 | **File 14 disposition** | **APPLIED** | `14` (file này) | bảng đầy đủ | 14 correction + 4 decision |

## PHẦN C — Ghi chú diễn giải Approved (không đổi thiết kế)
- **D17/§12 §8:** "backend redirect middleware phục vụ trước router" (`06` §IX) diễn giải là **Nest authoritative resolver + Next emit redirect-before-render** — được điều phối viên chấp nhận; không đổi schema/URL/scope; không tạo ADR.
- **D20:** `/api/v1/documents/:slug/download` (Approved `06` §IV, `08` M4) giữ nguyên là điểm kiểm publication; `/media/*` chỉ phục vụ media công khai không cần publication-gate (ảnh marketing/variants) — nhất quán ADR-005 (query công khai loại `deleted_at`).
- **D19:** thêm `request_fingerprint` là **implementation schema change 071+**, KHÔNG sửa baseline Approved 001–070, KHÔNG tạo migration trong Round này.

## PHẦN D — Verdict
Không correction nào REJECT; tất cả APPLIED. Không phát sinh design conflict mới. Trạng thái v0.3 = `PROPOSED FOR FINAL VERIFICATION` (chờ Codex final verification).
