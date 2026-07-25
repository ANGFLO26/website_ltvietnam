# 08 — AI COLLABORATION, RACI & FILE OWNERSHIP

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

Chuyển từ phase-level sang **task/PR-level RACI** (HI-19). Migration registry+CI (ME-06). Evidence gắn commit SHA, ngoài plan (ME-07). **Git invalid = P0 prerequisite** (HI-18/D15). AI không tự approve/merge.

---

## 1. Vai trò (giữ v0.1, tinh chỉnh)
- **Claude (C):** tác giả plan; foundation + service lõi; **không tự duyệt plan/PR mình**.
- **Codex (X):** independent reviewer mọi task; implement module biên sau phân vùng; **không sửa plan trước khi báo cáo** (audit).
- **ChatGPT:** tổng hợp/phản biện; **fresh integration reviewer** khi cả C+X đã sửa.
- **Người dùng:** chốt D1–D16 + business; chạy lệnh (Git/migration/deploy); cung cấp output thật; **giữ merge authority**; phê duyệt cuối.

## 2. RACI task/PR-level (HI-19 — §M audit)

| Task/PR | Implementer | Reviewer | Approver | Runner | Evidence owner |
|---|---|---|---|---|---|
| Raw baseline 001–070 | DB owner (C) | X đọc SQL + rerun độc lập | User | CI/User Postgres 16 | CI artifact + User |
| Core shared-service PR | C **hoặc** X (một) | AI **không** sửa PR | User | CI | CI |
| Module PR của C | C | X | User/maintainer | CI | CI |
| Module PR của X | X | C | User/maintainer | CI | CI |
| Integration PR (cả C+X đã sửa) | Một integration owner | **Fresh reviewer/ChatGPT** không sửa logic | User | CI/User | Release evidence owner |
| OpenAPI/client generation | API contract owner | AI còn lại review diff | User | CI freshness job | CI |
| Migration number/checksum | DB owner cấp/commit | AI còn lại + CI rule | User | CI/staging | Migration registry + CI |
| Release/cutover | Release captain (user chỉ định) | C/X phần không tự sửa | User | User/CI | Release captain |

## 3. Quy tắc chống "AI hallucinated PASS" (§M2)
- Evidence **bắt buộc**: commit SHA + command + env/version + exit code + raw log + checksum/artifact URL.
- Reviewer **đọc code/test gốc + rerun test trọng yếu**; không dựa summary implementer.
- Screenshot không thay raw result; **"PASS" không artifact = NOT RUN**.
- PR path allowlist/**CODEOWNERS**; shared files merge tuần tự.
- **AI không merge/approve code của chính mình**; user/maintainer giữ merge authority.

## 4. File/folder ownership
- Ownership theo **thư mục module** (`apps/api/src/modules/<name>/`, `apps/web/...`); slice song song ở thư mục khác.
- **Service lõi shared** (SlugService/PublishService/MediaUsageService/filter builder/canonical-robots resolver/route-resolution/ContentBlock-video validator) = **Claude owner tại một thời điểm**, nhưng **explicit handoff/delegation** để giảm bottleneck (giảm HI-19 nút thắt nguồn lực); integration contract **freeze theo PR**.
- **OpenAPI spec** shared; đổi qua PR review; đổi contract cập nhật cả BE + FE consumer (monorepo atomic).
- **Generated files** (OpenAPI client, migration snapshot) có **owner**; không sửa tay; sinh lại + commit bởi owner.

## 5. Git strategy (không chạy lệnh Git ở R4 — D15/HI-18)
- **Repository hiện KHÔNG hợp lệ** (`.git` rỗng) → **P0 prerequisite**: khôi phục/clone/init **sau user approval**; verify root/status/branch/remote/history; tag `docs-v1.2.1-approved`. Không branch/PR/tag/revert/CODEOWNERS/evidence-SHA hoạt động cho tới khi hợp lệ (R-25).
- Branch chính `main` (bảo vệ). Branch `phase/<n>-<slug>` hoặc `feat/<module>-<owner>`.
- Conventional Commits. PR checklist = DoD (`07` B) + link evidence + reviewer là AI khác/fresh reviewer.

### Migration sync (ME-06 — không chỉ "một DB owner")
- **Migration registry/history table** + **checked-in manifest/checksum**.
- **CI reject**: duplicate number · non-monotonic number · **checksum drift** (baseline applied không đổi hash) · missing up/down.
- **CODEOWNERS** cho migration directory; **serialized allocation PR** (cấp số 071+ tuần tự).
- Baseline **001–070 đóng băng** sau shared env đầu; thay đổi = **071+**.

### Evidence & tag
- Evidence: **`implementation/evidence/<commit-sha>/<phase>/`** hoặc CI artifact — **KHÔNG** dưới `planning/.../v0.x/` (ME-07). Plan chỉ link index.
- Tag milestone M0–M7 (`04`).
- **Rollback:** revert PR (không force-push `main`); DB = restore backup / forward fix (không default destructive `down` — §L).

## 6. Handoff & xung đột
1. Owner hoàn thành → PR + evidence + tự-check DoD. 2. Reviewer độc lập đọc code/test + rerun. 3. Owner xử lý/giải trình. 4. User chạy test/migration/deploy thật khi cần output thật. 5. Merge khi DoD + review clear + CI xanh + **user merge**. 6. Cập nhật changelog + tag.
- **Xung đột kỹ thuật 2 AI** → "OPEN DISAGREEMENT" → ChatGPT tổng hợp → user quyết. Không AI ghi đè quan điểm AI kia.
- **Xung đột file** → owner module thắng; AI kia rebase; service lõi thuộc Claude.
- **Xung đột với ADR** → ADR thắng; thiếu → OPEN DECISION/DESIGN CLARIFICATION, không tự quyết.

## 7. Cross-review vòng
Round 1 v0.1 → Round 2 ChatGPT → Round 3 Codex audit → **Round 4 Claude response (v0.2 — file này)** → Round 5 Final Reconciliation (dùng `10`) → Round 6 coding prompt (chỉ sau Round 5 đạt gate `07` C).
