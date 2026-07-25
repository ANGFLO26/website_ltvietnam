# 13 — CONTENT MIGRATION WORKSTREAM

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22
**Quyết định:** D14. **Nguồn Approved:** `03` §XX, `06` §XII. **Correction 11:** CM2 production write hard-disable.

Content migration website cũ = workstream song song **P4–P11** (không P0 blocker; **chặn release**). Business owner = **OPEN ASSIGNMENT (C7)**.

---

## 1. Năm stage CM0–CM4

| Stage | Thời điểm | Deliverables | Acceptance | Owner |
|---|---|---|---|---|
| **CM0 Inventory** | P4 | Crawl URL cũ; HTTP status; content type; media/PDF; metadata; locale; current canonical; backlinks | 100% URL in-scope có record | Content owner + implementer |
| **CM1 Mapping** | P4–P5 | Old→New; `keep/301/410/archive`; slug collision; VI/EN; image rights; broken-asset | 100% URL có disposition | SEO + content owner |
| **CM2 Importer / Dry Run** | P5–P7 | Idempotent importer; media checksum manifest; relationship mapping; exception report | **no production write without approval** (§9); import idempotent | Implementer + independent reviewer |
| **CM3 Validation** | P7–P10 | Before/after counts; relation counts; published-locale; redirect coverage; broken-link; file availability; visual QA | Counts reconcile; chain/loop=0 | QA/evidence owner |
| **CM4 Freeze/Delta/Cutover** | P11 | Freeze; delta timestamp; final import; final redirect map; backup/snapshot; post-go-live crawl | Delta idempotent + cutoff timestamp; user approves go-live | Release captain + user |

## 2. Acceptance tối thiểu
100% URL disposition `keep/301/410/archive`; counts+relationship reconcile theo type+locale; media/PDF checksum+MIME/size; **no critical broken internal link**; **redirect chain/loop=0**; delta rerun idempotently + cutoff timestamp.

## 3. Ràng buộc kỹ thuật
Redirect qua Nest authoritative (D11/D17, `12`); slug cũ vào `redirects.source_path` (không tái dùng); import qua dev/demo hoặc staging (tách production bootstrap); media qua StoragePort (D8/D20) + MediaUsageService (RESTRICT); VI/EN theo ADR-004.

## 4. Bảng kiểm kê (Approved `03` §XX / `06` §XII)
`URL cũ | Loại | Tên | Trạng thái | VI | EN | Ảnh | PDF | URL mới | Hành động | Redirect(301) | Backlink`.

## 5. Tests (`06`)
counts/checksums; slug collision; redirect coverage (sampled+automated); broken-link; **delta idempotency**; file availability; visual sample QA. Evidence theo commit SHA (`08`).

## 6. Rủi ro
R-27 (content/redirect incomplete at go-live). Mitigation: CM3 gate trước P10; CM4 freeze/delta; post-go-live crawl.

## 7. OPEN ASSIGNMENT
C7 business owner (**chưa chỉ định** — chốt trước CM0 vận hành thật); C8 quyền crawl/export site cũ cho Claude/Codex.

---

## 8. CM2 importer — production write hard-disable (Correction 11 / §XIV)

CM2 importer **mặc định chỉ chạy** local / development / staging. **Production write bị hard-disable mặc định.**

### 9. Điều kiện bắt buộc để chạy production import (tất cả)
1. **Explicit environment allowlist** (không dựa `NODE_ENV=production` mơ hồ).
2. **Production-only flag** riêng, bật có chủ đích.
3. **Approval record / change ticket**.
4. **Dry-run report PASS** (CM2 dry-run trước).
5. **Backup/snapshot** DB + media trước import.
6. **Target DB host/name được in rõ** ra console/log.
7. **Người dùng xác nhận target** (đọc host/name).
8. **Confirmation phrase / approval token** (không chỉ y/n).
9. **Least-privilege import role** (không dùng superuser).
10. **Importer idempotency** (rerun không nhân đôi).
11. **Transaction/batch rollback policy**.
12. **Audit log** (structured; **không** full PII — nhất quán A20).

Thiếu bất kỳ điều kiện → importer **từ chối** ghi production.
