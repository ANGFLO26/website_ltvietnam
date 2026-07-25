# 13 — CONTENT MIGRATION WORKSTREAM

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22
**Giải quyết:** HI-12. **Quyết định người dùng:** D14. **Nguồn Approved:** `03` §XX (bảng kiểm kê), `06` §XII (checklist crawl website cũ).

Content migration website cũ là **workstream chính thức chạy song song P4–P11** (không phải P0 blocker, nhưng **chặn release**). Business owner = **OPEN ASSIGNMENT** (C7 — người dùng chưa chỉ định).

---

## 1. Vì sao là workstream riêng

Approved đã yêu cầu inventory/crawl mapping; thiếu nó → release mất nội dung/redirect, SEO tụt, delta go-live không kiểm soát. Tách khỏi phase build vì: nhịp khác (phụ thuộc dữ liệu thật + quyền truy cập site cũ), owner khác (content/DN), acceptance khác (coverage/counts, không phải feature).

## 2. Năm stage CM0–CM4

| Stage | Thời điểm | Deliverables | Acceptance | Owner |
|---|---|---|---|---|
| **CM0 Inventory** | P4 | Crawl URL cũ; HTTP status; content type; media/PDF list; metadata; locale; current canonical; backlinks | **100% URL in-scope có inventory record** | Content owner (accountable) + implementer |
| **CM1 Mapping** | P4–P5 | Old→New URL; disposition `keep/301/410/archive`; slug collision list; VI/EN mapping; image rights; broken-asset list | **100% URL có disposition**; slug collision resolved | SEO + content owner duyệt |
| **CM2 Importer / Dry Run** | P5–P7 | Idempotent importer; media checksum manifest; relationship mapping; exception report | Import idempotent; **no production write without approval**; exception có owner | Implementer + independent reviewer |
| **CM3 Validation** | P7–P10 | Before/after counts; relation counts; published-locale check; redirect coverage; broken-link scan; file availability; visual sample QA | Counts reconcile; redirect chain/loop=0; no critical broken internal link | QA / evidence owner |
| **CM4 Freeze / Delta / Cutover** | P11 | Content freeze; delta timestamp; final import; final redirect map; backup/snapshot; post-go-live crawl | Delta idempotent + có cutoff timestamp; rollback snapshot; **user approves go-live** | Release captain + user |

## 3. Acceptance tối thiểu (toàn workstream)

- 100% URL cũ in-scope có disposition `keep / 301 / 410 / archive`.
- Counts và relationship totals **reconcile** theo loại nội dung + locale (before/after).
- Media/PDF có **checksum + MIME/size validation**; asset broken/copyright-unclear có exception owner.
- **Không** critical broken internal link; **redirect chain/loop = 0**; sampled + automated redirect coverage PASS.
- Delta migration **rerun idempotently** + có **cutoff timestamp**.

## 4. Ràng buộc kỹ thuật (tương thích Approved)

- Redirect tạo qua **SlugService/redirect authoritative ở Nest** (D11, `12`); không tạo redirect ngoài luồng.
- Slug cũ đưa vào `redirects.source_path` (ADR-002 3-nguồn) — không tái dùng slug đã publish.
- Import KHÔNG được ghi production nếu chưa approve (CM2); dùng **dev/demo pipeline** hoặc staging (tách khỏi production bootstrap — `04` P1, HI-11).
- Media import qua StoragePort (D8) + MediaUsageService (RESTRICT) — không tạo orphan.
- VI/EN theo locale publication (ADR-004) — không auto-fallback brand.

## 5. Bảng kiểm kê (Approved `03` §XX / `06` §XII)

`URL cũ | Loại nội dung | Tên | Trạng thái | Nội dung VI | Nội dung EN | Ảnh | Tài liệu(PDF) | URL mới | Hành động(keep/rewrite/complete/verify/archive/discard) | Redirect(301) | Backlink`.

## 6. Tests (chi tiết `06`)
CM: counts/checksums; slug collision; redirect coverage (sampled + automated); broken-link scan; delta idempotency (rerun không nhân đôi); file availability; visual sample QA. Evidence theo commit SHA (`08`).

## 7. Rủi ro liên quan
R-27 (content/redirect migration incomplete at go-live) — `09`. Mitigation: CM3 validation gate trước P10; CM4 freeze/delta trước cutover; post-go-live crawl.

## 8. OPEN ASSIGNMENT
- **C7 business owner** content/data migration — **chưa chỉ định** (người dùng cần chốt trước CM0 bắt đầu vận hành thật).
- **C8** quyền truy cập/crawl/export website cũ cho Claude/Codex — cần người dùng cấp trước CM0.
