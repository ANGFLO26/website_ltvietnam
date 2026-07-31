# 00 — README BỘ TÀI LIỆU THIẾT KẾ WEBSITE LT VIETNAM

**Phiên bản bộ tài liệu:** 1.3
**Ngày cập nhật:** 2026-07-21
**Trạng thái:** Approved — READY FOR IMPLEMENTATION
**Sản phẩm:** Website doanh nghiệp B2B — Công ty TNHH Công nghệ LT Việt Nam.

---

## 1. Mục đích

Bộ tài liệu này là **nguồn sự thật duy nhất** để lập trình website LT Vietnam phiên bản đầu (MVP). Toàn bộ tài liệu đã được đồng bộ theo **15 ADR** chính thức (v1.3). Không tài liệu nào được mâu thuẫn với ADR. Bản v1.1 và v1.2 được lưu trong gói lịch sử tại `archive/legacy/ltvn-documentation-history-v1.1-v1.2.zip`.

## 2. Thứ tự đọc

```text
00_README                         (bạn đang đọc)
09_ADR_QUYET_DINH_KIEN_TRUC       ← đọc TRƯỚC TIÊN sau README (nền tảng mọi quyết định)
01_PHAM_VI_CHUC_NANG_VA_MVP
02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG
03_CHUAN_HOA_MO_HINH_DU_LIEU
04_ERD_LOGIC_HE_THONG
05_DATABASE_SCHEMA_POSTGRESQL
06_KIEN_TRUC_BACKEND_VA_API
07_WIREFRAME_GIAO_DIEN_ADMIN
08_WIREFRAME_FRONTEND_CONG_KHAI
10_CHANGELOG_DONG_BO_TAI_LIEU     (nhật ký thay đổi so với bản cũ)
```

## 3. Nguồn sự thật cho từng vấn đề

| Vấn đề | Nguồn sự thật |
|---|---|
| Quyết định kiến trúc (thắng mọi mâu thuẫn) | **09_ADR** |
| Phạm vi, P0/P1/Future | 01 |
| URL công khai, điều hướng, sitemap | 02 |
| Mô hình dữ liệu logic, quy tắc trường | 03 |
| Quan hệ thực thể (ERD) | 04 |
| **Kiểu dữ liệu SQL, FK, index, constraint, migration** | **05** (thắng về kỹ thuật) |
| Endpoint, request/response, luồng nghiệp vụ | 06 |
| Giao diện & luồng Admin | 07 |
| Giao diện & luồng công khai | 08 |

Thứ tự ưu tiên khi mâu thuẫn: **ADR (09) > Phạm vi (01) > Schema (05) > ERD (04) > Chuẩn hóa dữ liệu (03) > API (06) > Admin (07) > Frontend (08)**.

## 4. Các quyết định lớn đã chốt (tóm tắt — chi tiết ở 09)

| ADR | Quyết định cuối cùng (v1.3) |
|---|---|
| 001 | URL chi tiết **phẳng**; hồ sơ hãng `/brands/{slug}` (index, self-canonical); lọc theo hãng `/products/all?brand={slug}` (noindex,follow, canonical `/products/all`); bỏ `/products/brand/{slug}` (301) |
| 002 | Slug đã publish **không tái dùng**; `UNIQUE(slug)` cho entity một ngôn ngữ, `UNIQUE(locale, slug)` cho 4 bảng translation; **`first_published_at` đặt cạnh `status`**; SlugService kiểm 3 nguồn, **tập route bảo lưu sinh tự động**; hard-delete chỉ khi chưa từng publish; đổi slug tạo redirect 301 |
| 003 | **Lưu inquiry vào DB (`inquiries` + `inquiry_outbox`) trước khi gửi email**; outbox concurrency (`processing`/lock/SKIP LOCKED/reaper, `UNIQUE(inquiry_id,channel,recipient)`, `email_status` bỏ `received`); **semantics at-least-once + Message-ID ổn định**; idempotency; không có UI quản lý inquiry MVP; retention TBD |
| 004 | Publish **theo từng ngôn ngữ** cho **4 entity** (pages/posts/services/projects); không có ngôn ngữ bắt buộc; **không auto-fallback**; hreflang chỉ khi cả hai published |
| 005 | Media FK **RESTRICT**; không xóa media đang dùng (409); **không SVG** |
| 006 | Khóa phạm vi P0/P1/Future; audit log structured (không bảng `audit_logs` trong P0) |
| 007 | Bộ lọc slug key lặp; **cùng dimension OR, khác dimension AND**; facet count P1 |
| 008 | **PATCH**: mảng quan hệ có mặt → thay thế toàn bộ; vắng → giữ nguyên; transaction |
| 009 | Upload chỉ **JPG/JPEG/PNG/WebP/PDF**; không SVG, **không upload video** |
| 010 | Toàn vẹn catalogue + draft: bỏ `primary_category_id`/`service_documents`/`media_role=featured`; `brand_id NOT NULL`; applications phẳng; ecommerce fields ẩn |
| 011 | Canonical/robots **tự sinh** (không lưu DB, không checkbox); bỏ `social_image_id` translation; social image fallback chain |
| 012 | Video: bỏ `document_type=video`; external video block YouTube/Vimeo; không upload video; `product_videos` là P1 |
| 013 | **Baseline duy nhất v1.3 (52 bảng)**; trigger `updated_at` ở migration cuối; rollback ngược; đóng băng sau shared env đầu tiên |

Quyết định dữ liệu quan trọng: **bỏ** `products.primary_category_id` (dùng `product_category_links.is_primary`) · **bỏ** `service_documents` (dùng `document_services`) · **bỏ** `product_media.media_role='featured'` · **bỏ** `social_image_id` khỏi page/product translation · giữ `products.brand_id NOT NULL` · applications phẳng trong Admin (DB giữ parent_id) · draft cho phép thiếu (chỉ `name`/`slug` bắt buộc) · thêm `first_published_at` × 12 translation.

## 5. Danh sách tài liệu (mới) & ánh xạ file cũ

| File chính thức | Thay cho (deprecated) |
|---|---|
| 00_README_TAI_LIEU_THIET_KE.md | — |
| 01_PHAM_VI_CHUC_NANG_VA_MVP.md | tai lieu pham vi chuc nang.md |
| 02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md | sitemap.md |
| 03_CHUAN_HOA_MO_HINH_DU_LIEU.md | chuan hoa cau truc du lieu.md |
| 04_ERD_LOGIC_HE_THONG.md | ERD.md |
| 05_DATABASE_SCHEMA_POSTGRESQL.md | schema.md |
| 06_KIEN_TRUC_BACKEND_VA_API.md | thiet ke backend va danh sach API.md |
| 07_WIREFRAME_GIAO_DIEN_ADMIN.md | thiet ke wireframe va cau truc giao dien admin.md |
| 08_WIREFRAME_FRONTEND_CONG_KHAI.md | thiet ke wireframe frontend.md |
| 09_ADR_QUYET_DINH_KIEN_TRUC.md | — |
| 10_CHANGELOG_DONG_BO_TAI_LIEU.md | — |

Các file cũ (tên tiếng Việt có dấu cách: `schema.md`, `ERD.md`, `sitemap.md`, …) **đã được xóa** sau khi chuyển toàn bộ nội dung sang các file đánh số ở trên. Chỉ dùng bộ 00–10 để lập trình. **Bản v1.1 (trước vòng sửa kỹ thuật này) được lưu tại `archive/v1.1/`** — chỉ tham khảo, không sửa, không dùng để code.

## 6. Quy tắc cập nhật (sửa dây chuyền)

Khi thay đổi một vấn đề, phải cập nhật **mọi tài liệu liên quan** và ghi vào 10_CHANGELOG:

```text
Đổi cấu trúc URL      → 02 + 06 + 08 + mục SEO + 09(ADR-001)
Đổi mô hình dữ liệu   → 03 + 04 + 05 + 06 + 07 (+ 09 nếu là quyết định)
Đổi luồng inquiry     → 01 + 03 + 04 + 05 + 06 + 08 (+ 09 ADR-003)
Đổi chính sách locale → 03 + 04 + 05 + 06 + 07 + 08 (+ 09 ADR-004)
Đổi chính sách media  → 03 + 05 + 06 + 07 (+ 09 ADR-005/009)
Đổi mô hình SEO       → 02 + 03 + 04 + 05 + 06 + 07 + 08 (+ 09 ADR-011)
Đổi chính sách video  → 01 + 03 + 04 + 05 + 06 + 07 + 08 (+ 09 ADR-012)
Đổi chiến lược migration → 05 + 06 + 00 + 10 (+ 09 ADR-013)
Đổi phạm vi           → 01 + tài liệu chứa chức năng đó (+ 09 ADR-006)
```

Không sửa một file rồi để file khác nói khác. Mọi thay đổi quyết định lớn phải tạo/ cập nhật một ADR.

## 7. Trạng thái phát hành

- `Draft` → đang soạn.
- `Reviewed` → đã đồng bộ. Sau vòng sửa kỹ thuật v1.2: **READY FOR FINAL VERIFICATION** (chờ một vòng xác minh độc lập).
- `Approved` / `READY FOR IMPLEMENTATION` → chỉ đặt sau khi vòng xác minh độc lập đạt.

Bộ tài liệu v1.3 đã hoàn thành:
- kiểm tra chéo tài liệu;
- static validation;
- SQL Execution Verification trên PostgreSQL 16;
- migration 001→070;
- rollback 070→001;
- migration lần hai.

Kết quả: ALL CHECKS PASSED.

Bộ tài liệu được phê duyệt làm baseline triển khai.

## 8. Điểm còn chờ doanh nghiệp xác nhận (không chặn phần lớn việc code)

1. **Thời hạn lưu inquiry (`inquiries.expires_at`)** — **TBD**, DN chốt trước production. `expires_at` nullable, không default, không tự purge. (24 tháng chỉ là phương án tham khảo, không phải mặc định hệ thống.)
2. **Ai duyệt quyền công khai logo khách hàng/đối tác** (`is_public`, `customer_visibility`).
3. **Có gửi email xác nhận tự động cho khách** sau khi submit không (mặc định: không).
4. **Sản phẩm ngừng KD**: có sản phẩm thay thế mặc định/redirect trong trường hợp nào (mặc định giữ trang, không redirect).
5. **Domain gửi email + cấu hình SPF/DKIM/DMARC** (hạ tầng).
6. **Tiếng Anh** cần hoàn thiện đến đâu trước ngày ra mắt (mặc định: không bắt buộc).

Chi tiết mỗi điểm ở 10_CHANGELOG.
