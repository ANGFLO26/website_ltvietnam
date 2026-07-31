# Schema baseline v1.3 — đã kiểm chứng trên PostgreSQL 16.2

## Kết quả kiểm chứng

| Hạng mục | v1.2.1 | **v1.3** |
|---|---|---|
| Bảng | 63 | **52** |
| Bảng translation | 16 | **4** (pages, posts, services, projects) |
| Foreign key | 105 | **95** |
| Trigger `updated_at` | 23 | **28** |
| Index | — | **129** |
| Lỗi khi chạy | 0 | **0** |

Chu kỳ `up → down → up`: **52 → 0 → 52 bảng**, PASS.

## Kiểm chứng chức năng (dữ liệu mô phỏng website thật)

| Test | Kết quả |
|---|---|
| Lọc theo hãng mẹ `PAC` (cách cũ) | **0 sản phẩm** ← lỗi của v1.2.1 |
| Lọc theo hãng mẹ `PAC` (dùng `ancestor_ids`) | **3 sản phẩm** ✅ |
| Lọc danh mục cấp 1, sản phẩm gắn cấp 2–3 | **3 sản phẩm** ✅ |
| Bộ lọc ADR-007 `(PAC OR Baker Hughes) AND ASTM D86` | **2 sản phẩm** ✅ |
| Breadcrumb 3 cấp bằng **một** truy vấn | ✅ không N+1 |

## Kiểm chứng ràng buộc — 8/8 PASS

Nhận: yêu cầu chỉ có điện thoại · chỉ có email
Chặn: không có cả hai · trùng `idempotency_key` · trùng slug · hai danh mục chính ·
      hãng tự làm tổ tiên của chính nó · sản phẩm liên quan chính nó

## Ghi chú về môi trường kiểm chứng

Bản PostgreSQL trong sandbox không có `citext`, `pg_trgm`, `pgcrypto`. Khi chạy đã thay
`CITEXT → TEXT` và tách riêng 10 index trigram. Mười câu lệnh index đó được kiểm bằng
**pglast** (parser thật của PostgreSQL) và đối chiếu cột với catalog: **10/10 hợp lệ**.
`gen_random_uuid()` là hàm dựng sẵn từ PostgreSQL 13 nên không cần `pgcrypto`.

Khi chạy trên PostgreSQL 16 đầy đủ extension, file này chạy nguyên trạng.

---

## Vòng kiểm chứng thứ hai (2026-07-29)

Rà soát đối nghịch tìm lỗi trong chính schema v1.3, phát hiện và đã sửa:

**41 khóa ngoại không có index.** PostgreSQL không tự tạo index cho FK. Thiếu chúng thì mỗi lần xóa một `media` phải quét tuần tự hơn 20 bảng tham chiếu, và `MediaUsageService` — vốn tra cứu đúng những cột này — sẽ chậm dần theo dữ liệu. Đã thêm 41 index; hiện **0 FK thiếu index**.

### Kết quả sau khi sửa

| Hạng mục | Kết quả |
|---|---|
| Bảng · FK · Trigger · Index | 52 · 95 · 28 · **170** |
| Bảng không có khóa chính | 0 |
| Bảng có `updated_at` nhưng thiếu trigger | 0 |
| Khóa ngoại thiếu index | **0** |
| Chu kỳ `up → seed → down → up → seed` | PASS, dữ liệu nạp lại sạch |
| Truy vấn cho 24 màn hình chính | **24/24 PASS** |
| Kiểm chứng ràng buộc | **14/14 PASS** |
| Tài liệu tham chiếu bảng/cột không tồn tại | 0 |

### 24 màn hình đã chạy truy vấn thật

Trang chủ (banner còn hiệu lực, sản phẩm/hãng nổi bật, khách hàng, văn phòng, section) · Landing sản phẩm (4 nhóm featured) · Chi tiết sản phẩm (join 9 bảng) · Hãng và thương hiệu con · Dịch vụ EN và VI · Bài viết EN, bài VI draft bị ẩn đúng · hreflang sinh đúng cho dịch vụ và **không** sinh cho bài có VI draft · Tài liệu public tải được, hidden không · Sitemap gộp 7 nguồn · MediaUsage phát hiện ảnh trong content block · Landing có mô tả index, không mô tả noindex.

### Ba bằng chứng đáng chú ý

1. **Ảnh chỉ dùng trong content block không xóa được** — `content_media_refs_media_id_fkey` chặn. Đây là lỗi A4 của v1.2.1 đã được bịt.
2. **Bài viết có bản VI ở trạng thái draft không sinh cặp hreflang**, trong khi dịch vụ có cả hai bản published thì sinh.
3. **Banner hết hạn bị loại khỏi trang chủ** bằng điều kiện `start_at`/`end_at`.
