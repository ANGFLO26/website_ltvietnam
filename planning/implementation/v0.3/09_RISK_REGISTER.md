# 09 — RISK REGISTER

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

Giữ R-01..R-32 (v0.2) + thêm **R-33**. Cập nhật theo D17–D20 + gate separation. XS/TĐ: L/M/H. Owner: C/X/U.

---

## Cập nhật (Round 5B)
- **R-25 (Git invalid):** đổi phạm vi → **blocker của Gate B (Coding Start), KHÔNG phải Gate A (Plan Approval)**. Vẫn OPEN. Mitigation: khôi phục repo (D15/§Git checklist P0) sau user approval. Owner U.
- **R-29 (worker shutdown in-flight):** thêm mitigation **outbox reconciliation report** (trace + operational: sent/pending/processing/retrying/failed/stale/duplicate-suspected); email đã gửi không rollback nhưng reconcile (Correction 12).
- **R-23 (routing/SEO owner split):** giảm — **D17 accepted** (Next-delivery); explicit 301 + cache invalidation + P0 spike. Vẫn theo dõi cache/CDN edge case.
- **R-30 (mixed-version):** mitigation cụ thể hóa qua **D18** (expand/contract + client freshness + mixed-version smoke).
- **R-32 (image/PDF exhaustion):** thêm **`/media/*` delivery hardening** (D20: nosniff/no-listing/storage-safe path) + numeric budget (`06` §13: ≤40MP, ≤8000px, timeout ≤20s).
- **R-05 (migration drift):** thêm **materialization gate** (CASE B: concat ≡ verified aggregate trước freeze).

## R-33 (mới)

| ID | Rủi ro | XS | TĐ | Phase | Biện pháp | Dấu hiệu | Owner |
|---|---|---|---|---|---|---|---|
| **R-33** | API readiness coupling — SMTP/worker lỗi làm API từ chối nhận Inquiry (mất lead) | M | H | P2/P7 | Tách health (Correction 6): liveness/readiness(config+PG+storage)/worker/degraded; **readiness KHÔNG phụ thuộc SMTP/worker**; SMTP down → vẫn lưu inquiry→202; degraded status theo dõi backlog/email_failed | `/ready` fail khi SMTP down; form trả lỗi khi SMTP lỗi | C/Ops |

## Danh sách ưu tiên
- **OPEN BLOCKER — Gate B (Coding Start):** **R-25 (Git)**.
- **Cao (H×H / M×H):** R-23, R-24, R-26, R-27, R-28, R-29, R-30, R-32, **R-33** + R-07/R-08/R-09/R-13/R-14/R-19.
- **Cần DN/User:** R-10, R-15, R-16, R-22, R-24, R-25, R-27, R-31.
- **Điều phối 2 AI:** R-04, R-14, R-20, R-30.

## Ghi chú gate
- **Gate A (Plan Approval)** không có risk blocker kỹ thuật còn lại — chờ Codex final verification + user duyệt.
- **Gate B (Coding Start)** blocker = **R-25**.

## Theo dõi
Cập nhật mỗi phase; rủi ro mới → ID mới; đóng → ngày + evidence. Critical phát sinh → chặn Gate A. **R-25 phải đóng trước Gate B (không trước Gate A).**

> R-01..R-32 giữ nội dung như `v0.2/09` (không lặp lại đầy đủ ở đây để tránh trùng; chỉ ghi các cập nhật trên).
