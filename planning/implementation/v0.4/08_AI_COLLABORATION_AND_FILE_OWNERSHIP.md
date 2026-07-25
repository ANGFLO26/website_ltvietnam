# 08 — AI COLLABORATION, RACI AND FILE OWNERSHIP

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

## 1. Roles

- **Implementation owner (I):** người/agent được giao một task/PR cụ thể; chịu trách nhiệm scope, tests và evidence.
- **Independent reviewer (R):** không sửa chính PR đó; đọc code/test/evidence và rerun critical cases.
- **Fresh integration reviewer (F):** review fan-in PR khi nhiều owner đã sửa thành phần.
- **User/maintainer (U):** quyết định business/technology được dành quyền, merge authority, Pre-P0 Git, release approval.
- **Ops/DB/Security/Content owners:** accountable theo chuyên môn; C7 là business content owner.

Tên agent cụ thể có thể thay đổi; independence và responsibility không thay đổi.

## 2. RACI

| Work item | Responsible | Accountable | Consulted/Reviewer | Informed/Evidence owner |
|---|---|---|---|---|
| Plan final verification/promotion | Independent auditor | U | Architecture/owners | Plan owner |
| Pre-P0 Git restore/init | Authorized operator | U | Maintainer | Operator |
| P0 scaffold/tooling/spike | Technical owner | U/Tech lead | Independent reviewer | CI owner |
| P1 materialize 001–070 | DB owner | U/DB lead | Independent DB reviewer | CI + DB owner |
| Migration 071+ allocation | DB owner | U/DB lead | Independent reviewer | Registry/CI |
| Shared services | Assigned single owner | Tech lead | Reviewer not modifying PR | CI owner |
| Module feature PR | Module owner | Maintainer | Other independent reviewer | PR owner/CI |
| Fan-in integration PR | Integration owner | Maintainer | Fresh reviewer | Release evidence owner |
| OpenAPI/client | API contract owner | Tech lead | FE/API independent reviewer | CI |
| D19/worker reconciliation | Inquiry/worker owner | Ops/Tech lead | DB+concurrency reviewer | Operations evidence owner |
| Media purge/restore | Media/Ops owner | Ops lead | Security + DB reviewer | Operations evidence owner |
| CM0–CM4 | Implementer + Content team | **C7**; U at go-live | SEO/QA/Legal/Ops | C7/release captain |
| Security acceptance | Security owner | U/Tech lead | Independent reviewer | Security evidence owner |
| Release/cutover | Release captain | U | C7, Ops, DB, app reviewers | Release captain |

## 3. File/folder ownership principles

- Ownership follows application module; shared services have exactly one active owner and explicit handoff.
- OpenAPI/contracts/route rules and migration registry are serialized shared files with CODEOWNERS.
- Generated files are regenerated/committed by designated owner and checked for freshness.
- Migration numbers are monotonic; baseline 001–070 freezes only after P1 acceptance; all new schema work is `IMPLEMENTATION MIGRATION 071+`.
- Concurrent edits to shared files require prior coordination; integration PR receives fresh review.

## 4. Review independence and truth

- An implementer/agent cannot approve its own plan correction or code PR.
- Reviewer examines source, tests and raw evidence; status text/screenshot alone is insufficient.
- Conflicting reviewer conclusions become `OPEN DISAGREEMENT` with concrete evidence, then escalate to user/architecture authority.
- Approved ADR/schema/scope wins over implementation preference. Missing authority becomes staged decision, never silent invention.

## 5. Git and evidence governance

Pre-P0 Git actions belong only to user/authorized operator. After Gate B, use protected `main`, scoped feature/phase branches, non-interactive PR workflow and intentional commits. No force-push to protected history. Rollback uses revert/forward fix/restore appropriate to side effect.

Evidence path: `implementation/evidence/<sha>/<phase>/` or immutable CI store. Evidence owner records command, environment/version, config/lock checksum, exit code, raw log and sanitized result.

## 6. Handoff

Owner submits scope + contract diff + tests + evidence + rollback → reviewer reruns critical paths → owner resolves findings → fresh reviewer handles shared fan-in where required → user/maintainer merges → risk/changelog/evidence index updates. No task is DONE before the chain is complete.

## 7. Operational ownership

- Core readiness: API/Ops owner.
- Media readiness/purge/consistency: Media + Ops, with DB reviewer.
- Worker health/reconciliation/manual outcomes: Worker + Ops.
- C7 owns content in-scope, inventory, old→new map, rights, CM3 and CM4 sign-off through go-live.
- Release captain owns recovery decision points but cannot waive user go-live approval.
