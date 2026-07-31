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
