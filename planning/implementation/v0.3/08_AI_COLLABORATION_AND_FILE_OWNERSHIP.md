# 08 — AI COLLABORATION, RACI & FILE OWNERSHIP

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

Task/PR-level RACI (giữ v0.2). Round 5B: **Git = Gate B prerequisite** (không phải Gate A); migration **materialization** owner (CASE B).

---

## 1. Vai trò
- **Claude (C):** tác giả plan; foundation + service lõi; không tự duyệt plan/PR mình.
- **Codex (X):** independent reviewer; implement module biên; không sửa plan trước khi báo cáo.
- **ChatGPT:** tổng hợp/phản biện; **fresh integration reviewer** khi cả C+X đã sửa.
- **Người dùng:** chốt D1–D20 + business; chạy lệnh (Git/migration/deploy); giữ **merge authority**; phê duyệt cuối (**Gate A** + go-live).

## 2. RACI task/PR-level

| Task/PR | Implementer | Reviewer | Approver | Runner | Evidence owner |
|---|---|---|---|---|---|
| **Materialize baseline 001–070** (CASE B) | DB owner (C) | X: đọc materialized SQL + rerun + **so concat ≡ verified aggregate** | User | CI/User Postgres 16 | CI artifact + User |
| Core shared-service PR | C **hoặc** X (một) | AI không sửa PR | User | CI | CI |
| Module PR của C / X | C / X | X / C | User/maintainer | CI | CI |
| Integration PR (C+X đã sửa) | Một integration owner | **Fresh reviewer/ChatGPT** | User | CI/User | Release evidence owner |
| OpenAPI/client generation (D18) | API contract owner | AI còn lại review diff | User | CI freshness job | CI |
| Migration number/checksum (071+) | DB owner cấp/commit | AI còn lại + CI rule | User | CI/staging | Migration registry + CI |
| Release/cutover | Release captain (user chỉ định) | C/X phần không tự sửa | User | User/CI | Release captain |

## 3. Quy tắc chống "AI hallucinated PASS"
Evidence bắt buộc: SHA + command + env/version + exit code + raw log + checksum/artifact URL. Reviewer đọc code/test gốc + rerun test trọng yếu. Screenshot không thay raw result; "PASS" không artifact = **NOT RUN**. PR allowlist/**CODEOWNERS**; shared files merge tuần tự. **AI không merge/approve code của chính mình**; user giữ merge authority.

## 4. File/folder ownership
Ownership theo thư mục module. Service lõi shared (SlugService/PublishService/MediaUsageService/filter builder/canonical-robots resolver/route-resolution/ContentBlock-video validator) = **Claude owner tại một thời điểm** + explicit handoff/delegation (giảm bottleneck); integration contract freeze theo PR. OpenAPI spec shared, đổi qua PR + cập nhật FE+BE consumer (atomic). Generated files có owner; sinh lại + commit bởi owner.

## 5. Git strategy (không chạy lệnh Git ở planning — Gate B)
- **Repository hiện KHÔNG hợp lệ** (`.git` rỗng) → **Gate B prerequisite** (KHÔNG chặn Gate A Plan Approval). Khôi phục/clone/init **sau user approval**; verify root/status/branch/remote/history/tag. R-25 = Gate B blocker.
- Branch chính `main` (bảo vệ). Branch `phase/<n>-<slug>` hoặc `feat/<module>-<owner>`. Conventional Commits. PR checklist = DoD (`07` B) + link evidence + reviewer là AI khác/fresh reviewer.

### Migration sync (materialization CASE B + registry)
- **P1 materialize** executable 001–070 từ Approved schema (không tồn tại sẵn — Correction 5); concat-up ≡ `schema_up.sql`, concat-down ≡ `schema_down.sql`; PASS → **checksum manifest + freeze**.
- **Registry/history table** + checked-in manifest/checksum.
- **CI reject:** duplicate number · non-monotonic · checksum drift (applied không đổi hash) · missing up/down.
- **CODEOWNERS** migration directory; **serialized allocation PR** (071+ tuần tự). Baseline 001–070 freeze sau shared env đầu; thay đổi = 071+.

### Evidence & tag
Evidence: `implementation/evidence/<commit-sha>/<phase>/` hoặc CI artifact — KHÔNG dưới `planning/.../v0.x/`. Tag M0–M7. Rollback: revert PR (không force-push `main`); DB = restore backup / forward fix (không default destructive down).

## 6. Handoff & xung đột
Owner → PR+evidence+DoD → reviewer độc lập đọc code/test+rerun → owner xử lý → user chạy test/migration/deploy thật → merge khi DoD+review+CI+user → changelog+tag. Xung đột 2 AI → "OPEN DISAGREEMENT" → ChatGPT → user quyết. Xung đột file → owner module thắng; service lõi thuộc Claude. Xung đột ADR → ADR thắng; thiếu → OPEN DECISION/DESIGN CLARIFICATION.

## 7. Cross-review vòng
R1 v0.1 → R2 ChatGPT → R3 Codex audit → R4 Claude response (v0.2) → **R5 ChatGPT Final Reconciliation → R5B Claude correction (v0.3 — file này)** → **Codex Final Verification** → (Gate A) v1.0 → (Gate B) coding.
