# 08 — AI COLLABORATION & FILE OWNERSHIP

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Mô hình: **một người dùng điều phối hai AI** (Claude + Codex), có ChatGPT tổng hợp. Mục tiêu: không hai AI sửa cùng khu vực gây xung đột; migration đồng bộ; handoff rõ.

---

## 1. Vai trò

### Claude (C)
- Tác giả plan ban đầu; **không tự phê duyệt plan của mình**.
- Primary implementer cho **foundation + service lõi phức tạp**: DB baseline (P1), core/auth (P2), media magic-bytes/usage (P3), **SlugService/PublishService** (P4), **filter builder/PublishService/search** (P5), **external_video service** + services/projects (P6), **outbox worker/idempotency** (P7), **seo resolver/redirect middleware** (P8), product/filter/SEO-head FE (P9/P10).
- Giải trình mọi quyết định + phản hồi review.

### Codex (X)
- **Independent reviewer** mọi phase (AI không implement phase đó review nó).
- Kiểm khả thi, dependency/sequencing, thiếu sót test/rollback/security.
- **Không sửa plan trực tiếp trước khi báo cáo** (Round 3).
- Có thể **implement độc lập** module biên rõ sau khi phân vùng: taxonomy (standards/applications/industries), pages/customers/offices/documents/post_categories+posts (P6), navigation/homepage (P8), các màn Admin/Public không-lõi (P9/P10).

### ChatGPT
- Tổng hợp + phản biện; so báo cáo Claude vs Codex; xác định điểm chưa thống nhất; viết prompt vòng sau. Không coi báo cáo một AI là bằng chứng đủ.

### Người dùng
- Chốt công nghệ (`01` B) + business (`01` C); chạy lệnh (migration/tests/deploy); cung cấp output thật; **phê duyệt cuối**.

---

## 2. Phân công phase (implement / review độc lập)

| Phase | Implement | Review độc lập | Có thể giao Codex implement độc lập? |
|---|---|---|---|
| P0 bootstrap | C | X | Một phần (config/lint) |
| P1 DB baseline | **C (DB owner)** | X (chạy lại migration/rollback) | Không (một owner) |
| P2 core/auth | C | X (security) | Không (bảo mật lõi) |
| P3 media | C (magic-bytes/usage) | X | Có (versioning ảnh) |
| P4 taxonomy | C (brands+SlugService), X (standards/apps/industries) | chéo | **Có** (standards/applications/industries) |
| P5 products | **C (lõi)** | X (audit filter/N+1/publish) | Không (nút thắt) |
| P6 content | C (services/projects/external_video), X (pages/customers/offices/documents/posts) | chéo | **Có** |
| P7 inquiry/outbox | C (lõi concurrency) | X (audit SKIP LOCKED/reaper) | Không |
| P8 nav/home/seo/redirect | C (seo/redirect), X (nav/homepage) | chéo | **Có** (nav/homepage) |
| P9 Admin FE | C (product/publish/SEO), X (còn lại) | chéo | **Có** |
| P10 Public FE | C (product/filter/form/SEO-head), X (còn lại) | chéo | **Có** |
| P11 hardening | C (BE sec/perf), X (FE a11y/perf) | chéo + người dùng | Có (phân vùng) |

Nguyên tắc: **implementer ≠ reviewer** cho cùng một phase.

---

## 3. File / folder ownership (chống xung đột)

- **Ownership theo thư mục module.** Mỗi module (`src/modules/<name>/`) có **một owner tại một thời điểm**. Slice song song phải ở **thư mục khác nhau**.
- **Service lõi dùng chung** (`SlugService`, `PublishService`, `MediaUsageService`, filter builder, canonical/robots resolver, locale condition) = **Claude owner**. Codex cần đổi → mở request, Claude đổi hoặc uỷ quyền, Codex rebase. **Không hai AI sửa service lõi cùng lúc.**
- **OpenAPI spec** = shared, đổi qua PR có review; đổi contract phải cập nhật cả BE + FE tiêu thụ (monorepo atomic).
- **Generated files** (OpenAPI client, migrations snapshot) không sửa tay; sinh lại + commit bởi owner.

---

## 4. Git strategy (không chạy lệnh Git trong nhiệm vụ này — chỉ đề xuất)

- **Branch chính:** `main` (bảo vệ, chỉ merge qua PR xanh + review độc lập).
- **Branch theo phase/task:** `phase/<n>-<slug>` hoặc `feat/<module>-<owner>` (vd `feat/p4-brands-claude`, `feat/p4-standards-codex`).
- **Naming commit:** Conventional Commits (`feat(products): filter OR/AND builder`, `test(inquiry): concurrency SKIP LOCKED`, `chore(db): baseline 001-070`).
- **PR checklist:** DoD (`07` B) + link evidence + "không sửa ngoài phạm vi" + reviewer là AI khác.
- **Tránh 2 AI sửa cùng file:** ownership module + lịch phase; nếu bắt buộc chạm chung → tách PR nhỏ, merge tuần tự, rebase.

### Migration đồng bộ
- **Baseline 001–070 đóng băng** sau lần chạy shared env đầu (ADR-013). **Không sửa** 001–070.
- Thay đổi schema sau baseline → **migration mới đánh số ≥ 071**, do **một "DB owner" (Claude)** cấp số tuần tự để tránh trùng số. AI khác cần migration → yêu cầu owner cấp số + review.
- Mỗi migration mới có `up`+`down`; test migrate+rollback trên staging.

### Evidence & tag
- **Evidence test** lưu `planning/implementation/v0.1/evidence/<phase>/` (hoặc `evidence/` repo code) — commit cùng PR.
- **Tag milestone** `v0.<phase>-Mx` tại M1–M7 (`04`).
- **Rollback commit:** revert PR (không force-push `main`); DB rollback bằng `down` migration hoặc restore backup.

---

## 5. Quy trình handoff

1. Owner hoàn thành phase → mở PR + evidence + tự-check DoD.
2. Reviewer (AI khác) review độc lập → để lại comment (Critical/High/Medium/Low).
3. Owner xử lý/giải trình từng comment.
4. Người dùng chạy test/migration thật khi cần output thật (vd Postgres, SMTP).
5. Merge khi: DoD đạt + review clear + CI xanh.
6. Cập nhật `PLAN_CHANGELOG.md` / changelog code + tag nếu milestone.

## 6. Quy trình giải quyết xung đột

- **Xung đột kỹ thuật giữa 2 AI:** ghi thành "OPEN DISAGREEMENT" → ChatGPT tổng hợp → nếu vẫn khác biệt, người dùng quyết. Không AI nào tự ghi đè quan điểm AI kia vào `main`.
- **Xung đột file (git):** owner module thắng; AI kia rebase. Service lõi luôn thuộc Claude.
- **Xung đột với ADR/tài liệu:** ADR thắng (thứ tự nguồn sự thật). Nếu tài liệu thật sự thiếu → ghi OPEN DECISION, không tự quyết.

## 7. Cross-review 6 vòng (quy trình plan)

1. **Round 1** — Claude Plan v0.1 (tài liệu này).
2. **Round 2** — ChatGPT structural review (phạm vi, dependency, sequence, missing decisions, test strategy, P0/P1 leakage).
3. **Round 3** — Codex independent audit (Critical/High/Medium + alternative sequence + missing tests/rollback + feasibility + câu hỏi cho Claude). Không sửa plan trước khi báo cáo.
4. **Round 4** — Claude response (accept/reject có lý do/partial + cập nhật plan).
5. **Round 5** — Final reconciliation → Plan v1.0 (`PLANNING COMPLETE`) khi đạt gate `07` C.
6. **Round 6** — Coding prompt cho phase đầu tiên (chỉ sau Round 5).
