# PLAN_CHANGELOG — Implementation Plan LT Vietnam

Theo dõi thay đổi **bản kế hoạch triển khai** (không phải tài liệu thiết kế `doc/`). Trạng thái plan tách biệt với trạng thái thiết kế (v1.2.1 Approved).

---

## v0.2 — 2026-07-22 — PROPOSED FOR FINAL RECONCILIATION (Round 4)

**Tác giả:** Claude (Round 4 — response to Codex Round 3 audit). **Trạng thái:** `PROPOSED FOR FINAL RECONCILIATION` (KHÔNG Approved/Ready to Code/Planning Complete).

### User-confirmed decisions D1–D16 (đưa vào plan)
NestJS (D1) · một Next app public+admin (D2) · pnpm monorepo apps/api-web-worker+packages (D3) · Kysely runtime + raw SQL bắt buộc (D4) · raw SQL baseline 001–070 + manifest/checksum + 071+ (D5) · worker process riêng + lifecycle (D6) · single VPS Docker Compose (D7) · persistent volume StoragePort (D8) · in-process cache/rate-limit single-instance only (D9) · reverse-proxy routing matrix (D10) · Nest authoritative redirect + Next delivery (D11) · Nest authoritative SEO + Next serialize (D12) · sitemap/robots ở Nest (D13) · content migration workstream (D14) · Git integrity P0 prerequisite (D15) · Node 24/22 cấm EOL (D16).

### Issue disposition (chi tiết `11`)
- **CR-01 ACCEPT** (topology `12` + D7/D10–D13).
- **HI-01..21 ACCEPT** (nhiều = USER-CONFIRMED/REMOVE/RENAME): config direction, auth port, health registry, validator sớm, thin vertical, critical-path fix, P6A/P6B, deployment topology, worker lifecycle, B2 split, seed 3-pipeline, content migration, rollback matrix, test gaps, **remove Users CRUD**, **remove auto-save**, Node 24/22, Git blocker, task-level RACI, concurrency, API compatibility.
- **ME-01..08 ACCEPT** (25 module, P8 rename bỏ Search, edges, taxonomy list-only, decision staging, migration registry, evidence move, perf budget).
- **LO-01 DEFER WITH GATE** (không sửa Approved ở R4). **OBS-01/02/03 CLOSED — NO CHANGE**.
- **Không REJECT** — không issue nào bị chứng minh sai bởi nguồn Approved.

### File thay đổi so v0.1
- `00` version/status v0.2; 25 module; strategy thin-vertical; critical path không cycle; gate mới; 13 phase + CM.
- `01` D1–D16 = USER-CONFIRMED; B2→B2a/B2b; thêm B22–B26; staging deadline; hạ B6/B7/B15/B20.
- `02` constraints topology/CM/compat/thin-UI; thin deliverable P4–P7; P9/P10 completion.
- `03` DAG: config→logging→DB; bỏ Auth↔Users cycle; health probe registry; validator P3; P6A/P6B; edges P8; 25 module.
- `04` renumber P0–P11 + P6A/P6B; thin UI/E2E; rollback matrix theo side-effect; 3 seed pipeline; Git checklist P0; worker lifecycle P7; idempotency mismatch.
- `05` bỏ Users CRUD row; product search P5; thêm rows redirect-delivery/compat/backup/content-migration.
- `06` §K tests; MANDATORY/CONDITIONAL/DEFERRED; evidence provenance; perf budget.
- `07` DoR P0 root gate; thin UI DoR; DoD generated-client/backward-compat/evidence/task-review; rollback không default down.
- `08` RACI task/PR-level; migration registry+CI; evidence commit-SHA ngoài plan; Git prerequisite.
- `09` R-23..R-32; R-03/R-05/R-20 cập nhật; R-25 OPEN BLOCKER.

### File mới
- `10_FINAL_RECONCILIATION_PACKAGE` (thay `10_CODEX_REVIEW_PACKAGE` v0.1).
- `11_ROUND3_ISSUE_DISPOSITION`.
- `12_REQUEST_ROUTING_AND_DEPLOYMENT_TOPOLOGY` (CR-01).
- `13_CONTENT_MIGRATION_WORKSTREAM` (HI-12/D14).

### Dependency sửa
config→logging→DB; bỏ users→auth; health registry incremental; ContentBlock/ExternalVideo validator trước P5; customers→projects; post_categories→posts; navigation configured-source; homepage→banners/media/pages/settings/industries; SEO sitemap→route providers+base URL; redirect delivery từ P4; OpenAPI→generated-client→FE deploy.

### Phase tách/đổi tên
P6→P6A+P6B; P8 bỏ "Search"; P9 Admin Completion; P10 Public Completion; P11 + Content Delta; P7 parallel (bỏ hard P7→P8).

### Scope leakage loại
`/admin/users` + Users CRUD; auto-save nâng cao (khỏi P0); rich taxonomy detail (→P1).

### Tests/rollback/CM/RACI/Git/evidence bổ sung
Xem `06`/`04`/`13`/`08`. Node 20 loại (D16). 25 module thống nhất.

### Nguyên tắc giữ
Không code; không init/sửa Git; không sửa `doc/` Approved; không sửa `v0.1/`; không tự phê duyệt; mâu thuẫn Approved → DESIGN CLARIFICATION (D11, `12` §8).

### Còn mở (Round 5+)
OPEN B23–B26; business C1–C9; **D11 clarification chưa ký**; **Git chưa khôi phục (R-25)**. Trạng thái giữ `PROPOSED FOR FINAL RECONCILIATION`.

---

## v0.1 — 2026-07-22 — PROPOSED FOR CROSS-REVIEW (Round 1)
12 file `00`–`10` + changelog tại `planning/implementation/v0.1/`. Chiến lược Hybrid; 12 phase; dependency graph; critical path; risk register R-01..R-22; Codex review package. (Lịch sử giữ nguyên trong `v0.1/`.)
