# PLAN_CHANGELOG — Implementation Plan LT Vietnam

Theo dõi thay đổi của **bản kế hoạch triển khai** (không phải tài liệu thiết kế `doc/`). Trạng thái plan tách biệt với trạng thái tài liệu thiết kế (đang v1.2.1 Approved).

---

## v0.1 — 2026-07-22 — PROPOSED FOR CROSS-REVIEW

**Tác giả:** Claude (Round 1). **Trạng thái:** `PROPOSED FOR CROSS-REVIEW` (KHÔNG Approved, KHÔNG READY TO CODE).

### Đã tạo
- `00_IMPLEMENTATION_PLAN_OVERVIEW.md` — tổng quan, trạng thái, cách đọc, tóm tắt chiến lược + critical path + 12 phase.
- `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` — 25 quyết định LOCKED (A1–A25), 21 OPEN DECISION công nghệ (B1–B21) có khuyến nghị, 6 BUSINESS DECISION (C1–C6), IMPLEMENTATION DETAILS (D).
- `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` — so sánh Foundation-first / Vertical / Hybrid (7 tiêu chí); khuyến nghị **Hybrid** với ranh giới cụ thể foundation-first (P0–P3) / vertical slice (P4–P7) / cross-cutting (P8–P11).
- `03_MODULE_DEPENDENCY_GRAPH.md` — DAG 26 module (6 loại phụ thuộc), đồ thị tầng, critical path, nhóm song song. Nút thắt = products.
- `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` — 12 phase, mỗi phase 24 mục; 7 milestones M1–M7.
- `05_MODULE_IMPLEMENTATION_MATRIX.md` — 30 hàng phủ ≥27 chức năng P0; ánh xạ ADR.
- `06_TEST_AND_QUALITY_STRATEGY.md` — 9 lớp test + ma trận lớp×phase + 14 luồng E2E + 6 case concurrency + quy tắc evidence.
- `07_DEFINITION_OF_READY_AND_DONE.md` — DoR/DoD + gate planning→coding.
- `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` — vai trò, phân công phase, ownership, Git strategy, migration đồng bộ (≥071), handoff, xung đột, 6 vòng review.
- `09_RISK_REGISTER.md` — 22 rủi ro (R-01..R-22) có XS/TĐ/biện pháp/dấu hiệu/owner.
- `10_CODEX_REVIEW_PACKAGE.md` — bản độc lập cho Codex: 12 mục + 8 điểm chưa chắc + 8 câu hỏi.
- `PLAN_CHANGELOG.md` — file này.

### Nguyên tắc đã giữ
- Không viết code/migration/source; không sửa `doc/00`–`10`/`verify`/`archive`.
- Không âm thầm chốt công nghệ — mọi framework chưa khóa để OPEN DECISION + khuyến nghị.
- Không đưa P1/Future vào P0; thứ tự nguồn sự thật ADR → 01 → 05 → 04 → 03 → 06 → 07 → 08.

### Chưa giải quyết (chuyển sang các vòng sau)
- OPEN DECISION B1–B21 (đặc biệt **B1 stack**) — chờ người dùng chốt.
- BUSINESS DECISION C1–C6 — chờ DN.
- 8 điểm Claude chưa chắc (`10` mục 10) — chờ Codex phản biện.

### Vòng tiếp theo
- Round 2: ChatGPT structural review.
- Round 3: Codex independent audit (dùng `10`).
- Round 4: Claude response → cập nhật lên v0.2/…
- Round 5: reconciliation → v1.0 `PLANNING COMPLETE` khi đạt gate `07` C.
