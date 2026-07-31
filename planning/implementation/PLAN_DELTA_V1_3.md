# PLAN DELTA — Bộ tài liệu thiết kế v1.3

**Ngày:** 2026-07-29
**Áp dụng cho:** `planning/implementation/v1.0/` (đã khóa hash)
**Quan hệ:** file này **thay thế** các phát biểu được liệt kê dưới đây trong plan v1.0

---

## 1. Vì sao có file này

Bộ tài liệu thiết kế đã lên **v1.3**: 63 bảng → **52**, 16 bảng translation → **4**, URL đổi sang tiếng Anh ở gốc, thêm ADR-014 và ADR-015.

Toàn bộ 20 file trong `planning/implementation/v1.0/` bị khóa bởi `V1_0_FILE_MANIFEST.sha256` và CI `gate-b-baseline.yml` kiểm inventory **đúng 21 file**. Sửa chúng sẽ:

1. làm hỏng manifest và fail CI;
2. quan trọng hơn — làm sai lệch chính bộ hash mà evidence Gate B đã chứng nhận.

Nên plan giữ nguyên như lúc được duyệt, và file này ghi phần đã lỗi thời. Cùng cơ chế với `GATE_STATUS.md`.

---

## 2. Các phát biểu bị thay thế

| Vị trí trong plan v1.0 | Plan nói | Thực tế v1.3 |
|---|---|---|
| `01` A4 | "Baseline 001–070, **63 bảng**" | Baseline v1.3, **52 bảng**, `doc/verify/v1.3/schema_up.sql` |
| `01` A4 | "067 FK indexes, 068 search indexes, 069 partial indexes, 070 updated-at triggers" | Đánh số migration sẽ định lại khi materialize; trigger vẫn ở bước cuối |
| `01` A5 | "URL detail phẳng; taxonomy list URLs theo Approved routes" | Vẫn phẳng, nhưng **tiếng Anh ở gốc**, `/vi` chỉ cho 4 nhóm có bản dịch (ADR-001 v1.3) |
| `01` A7 | "**12 translation tables** có `first_published_at`" | `first_published_at` đặt cạnh `status`: 8 bảng entity + 4 bảng translation (ADR-002 v1.3) |
| `01` A10 | "Locale publication cho product/service/project/post/brand/page/document" (7 entity) | **4 entity**: pages, posts, services, projects (ADR-014) |
| `01` A10 | "no Brand VI→EN fallback" | Brand không còn bản dịch; quy tắc không còn áp dụng |
| `01` A11 | "**năm taxonomy slug** có `first_published_at`" | Taxonomy không còn bảng translation; cột nằm trên bảng entity |
| `01` A14 | Chiều lọc, ngữ nghĩa OR/AND | Giữ nguyên, **cộng thêm** bước mở rộng nhánh con trước khi áp OR/AND (ADR-015) |
| `01` A22 | "Search dùng pg_trgm" | Giữ nguyên, **cộng thêm** `SearchPort` bắt buộc từ P0 |
| `01` A20 | "structured audit application log, không bảng audit" | Giữ nguyên. Nhưng bổ sung **`GET /admin/inquiries` chỉ đọc** — không phải audit UI, không phải CRM |
| `01` §C.1 | "Không sửa 001–070. `IMPLEMENTATION MIGRATION 071+` bổ sung `request_fingerprint`" | Baseline v1.3 **đã có sẵn** `request_fingerprint` + `request_fingerprint_version` trên `inquiries` |
| `04` P1 | "materialize `001_*.up.sql` … `070_*.up.sql`", "63 tables" | Materialize từ `doc/verify/v1.3/schema_up.sql`; **52 bảng**. Số lượng migration định lại khi chia file |
| `05` #38 | "70 up/down + history/manifest" | Số lượng định lại theo baseline v1.3 |

---

## 3. Việc bổ sung vào phạm vi P0

| Hạng mục | Phase | Lý do |
|---|---|---|
| `GET/PATCH /admin/inquiries` (chỉ đọc + đánh dấu đã liên hệ) | P7 | ADR-003 lưu lead vào DB để chống mất, nhưng không có màn hình xem → email lỗi là lead vô hình |
| `SearchPort` interface + `PgTrgmProductSearchAdapter` | P5 | Không có port thì "đổi engine không đổi API" chỉ là ý định |
| `content_media_refs` đồng bộ khi ghi content block | P3 | MediaUsageService không quét được JSONB nếu thiếu bảng này |
| Tính lại `ancestor_ids`/`depth` toàn nhánh khi đổi cha + test đồng thời | P4 | ADR-015 |
| Test đối chiếu tập route bảo lưu ↔ bảng route | P4 | ADR-002 §8, tập route sinh tự động |

---

## 4. Phần plan **không** đổi

Toàn bộ phần còn lại giữ nguyên hiệu lực, gồm những chỗ có giá trị cao nhất:

- **D19** — hợp đồng idempotency nguyên tử (tra replay trước CAPTCHA, ghi nguyên tử là trọng tài cuối)
- **D6 / §C.7** — vòng đời attempt bền vững của worker outbox, ba trục trạng thái tách biệt, một result transaction
- **D20** — ranh giới `public-media/` ↔ `protected-documents/`, Semantics A public-until-purge
- **FV-02 / Readiness Model B** — `/health/ready` chỉ kiểm config + PostgreSQL
- **D18** — tương thích `/api/v1`, expand → backfill → contract
- **§B-bis** — sổ đăng ký hòa giải với tài liệu Approved và quy tắc ưu tiên
- Toàn bộ 13 phase, milestone, Definition of Ready/Done, chiến lược kiểm thử

---

## 5. Khi nào bỏ file này

Khi P0 hoàn tất, phát hành plan **v1.1** với các con số đã sửa và manifest tạo lại, rồi xóa file này. Đừng để nó thành nguồn sự thật thứ hai tự trôi.

## 6. Thứ tự ưu tiên khi mâu thuẫn

```text
ADR (v1.3)
→ Phạm vi MVP (01 v1.3)
→ doc/verify/v1.3/schema_up.sql        ← DDL có thẩm quyền
→ PostgreSQL Schema (05 v1.3)
→ ERD (04) → Mô hình dữ liệu (03) → Backend/API (06)
→ Admin Wireframe (07) → Public Wireframe (08)
→ D1–D20
→ FILE NÀY
→ Implementation Plan v1.0
```
