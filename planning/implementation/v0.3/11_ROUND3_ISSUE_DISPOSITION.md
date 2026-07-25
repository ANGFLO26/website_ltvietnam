# 11 — ROUND 3 ISSUE DISPOSITION

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22
**Nguồn:** `reviews/codex-round3/`. **Ghi chú:** Bảng disposition Round 3 **giữ nguyên từ v0.2** (đã áp dụng); Round 5B correction bổ sung ở `14`. File này cập nhật tham chiếu file v0.3.

Disposition: **ACCEPT · PARTIALLY ACCEPT · REJECT · DEFER WITH GATE · CLOSED — NO CHANGE**. "USER-CONFIRMED (Dx)" = correction đã chốt qua Dx.

---

## PHẦN A — CRITICAL
| Issue | Sev | Disposition | Lý do | File v0.3 |
|---|---|---|---|---|
| CR-01 Public routing/redirect/SEO không topology chạy được | CRITICAL | **ACCEPT** — USER-CONFIRMED (D7/D10–D13, **D17**) | Reverse proxy gửi page tới Next → Nest middleware không thấy; giải bằng routing matrix + Nest authoritative + **Next-delivery (D17 accepted)** + sitemap/robots Nest | `12`; `01` D17; `04` P8 |

## PHẦN B — HIGH (HI-01..21) — tất cả ACCEPT
| Issue | Disposition | File v0.3 |
|---|---|---|
| HI-01 Config→DB đảo | ACCEPT | `03` §1; `04` P2 |
| HI-02 Auth↔Users cycle | ACCEPT | `03` §2; `04` P2 |
| HI-03 Readiness trước storage/outbox/email | ACCEPT (+ Correction 6 tách 4 health) | `03` §3; `04` P2/P7 |
| HI-04 External video validator muộn | ACCEPT (validator P3) | `03` §4; `04` P3 |
| HI-05 P4–P7 chưa thin UI | ACCEPT | `02` §2.2; `04` P4–P7 |
| HI-06 Critical path P10 trước P8 | ACCEPT | `00` §5; `03` §7; `04` |
| HI-07 P6 dependency chéo | ACCEPT (P6A/P6B) | `03`; `04` P6A/P6B |
| HI-08 Deployment topology gốc | ACCEPT — USER-CONFIRMED (D7) | `01` D7; `12` |
| HI-09 Worker lifecycle | ACCEPT — USER-CONFIRMED (D6) | `04` P7 |
| HI-10 B2 gộp query+migration | ACCEPT — USER-CONFIRMED (D4/D5) | `01` B2a/B2b; `04` P1 |
| HI-11 Seed prod/demo/test trộn | ACCEPT (3 pipeline) | `04` P1 |
| HI-12 Content migration workstream | ACCEPT — USER-CONFIRMED (D14) | `13` |
| HI-13 Rollback "revert code" | ACCEPT (rollback matrix) | `04`; `07` |
| HI-14 Test gaps | ACCEPT | `06` §K |
| HI-15 Users CRUD | ACCEPT — REMOVE | `04` P2; `05` |
| HI-16 Auto-save P0 | ACCEPT — REMOVE | `04` P9 |
| HI-17 Node 20/22 | ACCEPT — USER-CONFIRMED (D16) | `01` B21 |
| HI-18 Git invalid | ACCEPT — ENV BLOCKER (D15; nay **Gate B**) | `04` P0; `08`; `09` R-25 |
| HI-19 Reviewer independence | ACCEPT (RACI task-level) | `08` |
| HI-20 Concurrency ngoài outbox | ACCEPT | `06` §5; `04` P4/P5/P7 |
| HI-21 Backward-compat/generated-client | ACCEPT — nay **USER-CONFIRMED (D18)** | `01` D18; `06`; `04` P0 |

## PHẦN C — MEDIUM (ME-01..08) — tất cả ACCEPT
ME-01 25 module · ME-02 P8 bỏ Search · ME-03 nav/home/SEO edges · ME-04 taxonomy list-only · ME-05 staging (nay Correction 2) · ME-06 migration registry · ME-07 evidence move · ME-08 performance budget (nay Correction 10 có số). Files: `00/01/03/04/05/06/07/08`.

## PHẦN D — LOW / OBSERVATION
LO-01 evidence version/note STATIC → **DEFER WITH GATE** (không sửa Approved). OBS-01/02/03 → **CLOSED — NO CHANGE**.

## PHẦN E — 18 Round-2 concern
Tất cả CONFIRMED/PARTIALLY → ánh xạ CR-01/HI/ME ở trên, **ACCEPT**; không REJECT.

## Tổng
CR 1 ACCEPT · HIGH 21 ACCEPT · MEDIUM 8 ACCEPT · LOW 1 DEFER · OBS 3 CLOSED · **REJECT 0**.
