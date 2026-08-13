# DỮ LIỆU SẢN PHẨM THẬT — PILOT 17 DÒNG MÁY

**Trạng thái:** ĐÃ CHUẨN HÓA VÀ NẠP VÀO DB (2026-08-12) — 15/17 sản phẩm đã xuất bản
**Ngày trích xuất:** 2026-08-11
**Kế hoạch xử lý:** [../../28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md](../../28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md)

---

## 1. Đây là gì

Dữ liệu sản phẩm **thật** (không phải demo) của 17 dòng máy thuộc 4 hãng, trích xuất trực tiếp từ brochure / datasheet / Technical Offer gốc của hãng trong kho tài liệu `D:\Work\LTVN\Lab` (bản tải từ NAS của nhà phân phối, 4584 file).

Mục đích: thay thế dữ liệu demo trong catalogue sản phẩm của website.

## 2. Quy trình

Các file `.md` ở đây là **dữ liệu thô** (nguồn sự thật). Chúng KHÔNG được nạp thẳng vào hệ thống mà đi qua 2 bước:

```bash
# 1. Chuẩn hóa: .md -> du-lieu-chuan-hoa.json (+ sinh doc/29)
python doc/data/lab-products/tools/chuan_hoa.py

# 2. Nạp vào DB (idempotent, chạy lại không nhân đôi)
pnpm --filter @ltv/backend seed:lab
```

Bước 1 làm những việc mà dữ liệu thô còn thiếu: thêm `slug`/SEO, gán danh mục/ngành/ứng dụng,
tách các ô tiêu chuẩn bị gộp, và **tách ghi chú nội bộ ra khỏi nội dung công khai**.

`tools/kiem_tra_du_lieu.py` kiểm tra dữ liệu **thô** — nó vẫn báo lỗi thiếu `slug`/`categories`,
điều đó là ĐÚNG: những trường ấy được bổ sung ở bước chuẩn hóa chứ không có trong file `.md`.
Kết quả thực tế sau khi nạp xem [doc 28 PHẦN 11](../../28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md).

## 3. Cấu trúc thư mục

```
lab-products/
├── README.md                      ← file này
├── <17 file .md>                  ← dữ liệu chính, trong phạm vi đợt này
├── optiflash-bien-the/            ← 5 file chi tiết từng biến thể OptiFlash
├── ngoai-pham-vi/                 ← 3 dòng máy đã trích nhưng ngoài phạm vi đợt này
├── du-lieu-chuan-hoa.json         ← SINH TỰ ĐỘNG, đừng sửa tay
└── tools/
    ├── chuan_hoa.py               ← .md → JSON chuẩn hóa (+ sinh doc/29)
    └── kiem_tra_du_lieu.py        ← kiểm tra dữ liệu thô
```

### 17 file chính

| Hãng | File | Sản phẩm |
|---|---|---|
| Herzog | `herzog_hvm472.md` | HVM 472 — Multi-Range Viscometer |
| Herzog | `herzog_hvp972.md` | HVP 972 — Automated Vapor Pressure |
| Herzog | `herzog_optidist.md` | OptiDist — Atmospheric Distillation |
| Herzog | `herzog_optiflash_merged.md` | OptiFlash — gộp 5 biến thể |
| ISL | `isl_nck2_5g.md` | NCK2 5G — Noack Volatility |
| ISL | `isl_opticpp.md` | OptiCPP — Cloud & Pour Point |
| ISL | `isl_optifpp.md` | OptiFPP — Cold Filter Plugging Point |
| ISL | `isl_optifzp.md` | OptiFZP — Freezing Point |
| ISL | `isl_optimpp.md` | OptiMPP & OptiMPPML — Mini Cloud & Pour Point |
| ISL | `isl_optipmd.md` | OptiPMD — Micro Distillation |
| Phase | `phase_70xe_series.md` | 70Xe Series — platform, 14 model con |
| Phase | `phase_wat70xi.md` | WAT-70Xi — Crude Oil Analyzer |
| Phase | `phase_optimvd.md` | OptiMVD — Mini Viscometer & Density |
| PAC | `pac_optidist2.md` | OptiDist 2 |
| PAC | `pac_optifuel.md` | OptiFuel — FTIR Fuel Analyzer |
| PAC | `pac_optireader.md` | OptiReader |
| PAC | `pac_zynthair.md` | ZyNthAir — phụ kiện (`accessory`) |

### `optiflash-bien-the/`

Theo yêu cầu, 5 biến thể OptiFlash (Abel, Tag, CoC, Pensky-Martens, Small Scale) được **gộp thành 1 sản phẩm** trên web. File gộp là `herzog_optiflash_merged.md`.

File gộp không có mục `## Specifications` riêng; bảng thông số của nó được `chuan_hoa.py` dựng
từ **bảng so sánh 5 biến thể** (mỗi biến thể thành một nhóm `group_key`). Giữ 5 file trong thư
mục này để tra cứu chi tiết từng biến thể khi cần — đừng xóa.

### `ngoai-pham-vi/`

Ba dòng máy Herzog đã trích xuất ở vòng đầu (CID 510, HDV 632, HGT 915/917) nhưng **không nằm trong danh sách 17** của đợt này. Giữ lại để khỏi phải trích xuất lại nếu sau này mở rộng phạm vi.

Lưu ý: 3 file này theo **mẫu cũ, chi tiết hơn** (có cả mã part number / danh sách phụ tùng thay thế) — 17 file chính dùng mẫu rút gọn, chỉ giữ thông tin website cần.

## 4. Quy tắc đã áp dụng khi trích xuất

- **Ưu tiên nguồn**: khi số liệu giữa các tài liệu lệch nhau, lấy bản có năm/phiên bản **mới nhất**; không rõ thì ưu tiên brochure.
- **Ngôn ngữ (ADR-014)**: thuật ngữ kỹ thuật, mã chuẩn (ASTM, ISO, IP…), tên model và tên riêng **giữ nguyên tiếng Anh**, không dịch. Tiêu đề mục và văn bản diễn giải viết tiếng Việt.
- **Không bịa**: mục nào tài liệu nguồn không có thì ghi rõ "Không có trong tài liệu nguồn".
- **Rút gọn có chủ đích**: không liệt kê mã part number / order code / danh sách phụ tùng thay thế — chỉ giữ tên tùy chọn chính, đúng mức website cần hiển thị.
- **Ghi nhận mâu thuẫn**: mọi chỗ số liệu lệch giữa các nguồn đều được ghi chú kèm. **Các ghi chú này phải được tách ra trước khi đăng** (bước 5 của kế hoạch chuẩn hóa).

## 5. Điểm cần xác minh với hãng

| Sản phẩm | Vấn đề |
|---|---|
| HVM 472 | Cân nặng 80 kg (Technical Offer 2025) vs 90/99 kg (brochure 2014) |
| OptiCPP | Kích thước 30×26×34 cm / 28 kg vs 25.4×60×35 cm / 30.2 kg |
| OptiFPP | Kích thước lệch giữa 2 nguồn; **ISO 3015 là `compliance` hay `correlation`** |
| OptiFZP | Điện áp/công suất/trọng lượng lệch giữa brochure 2016 và Technical Offer 2025 |
| OptiDist 2 | **ASTM D4530 (Technical Offer) vs D4350 (brochure)** — hai chuẩn khác nhau thật sự |
| HGT 915/917 *(ngoài phạm vi)* | Trọng lượng lệch đúng 10 kg giữa 2 nguồn |

## 6. Ảnh sản phẩm

Ảnh gốc nằm trong `D:\Work\LTVN\Lab`, **không** lưu trong repo. Đường dẫn ảnh đại diện ghi ở cuối mỗi file `.md`.

Tình trạng cần xử lý:

| Mức độ | Sản phẩm |
|---|---|
| **Không có ảnh dùng được** | HVP 972; OptiFuel (ảnh gốc bị hãng đánh dấu `DO NOT USE`) |
| Chỉ có bản độ phân giải thấp | OptiFZP, OptiMPP, OptiPMD (bản HR tồn tại nhưng là TIFF) |
| Ảnh chưa "sạch" | OptiMVD (đang dùng đồ họa social-media) |

Khi nạp vào hệ thống phải upload qua Media service để có `media_id` — schema **cấm** tham chiếu ảnh bằng URL trực tiếp ([doc 11](../../11_CONTENT_BLOCK_SCHEMA.md) PHẦN II mục 2).

## 7. Công cụ

**`tools/chuan_hoa.py`** — biến 17 file `.md` thành `du-lieu-chuan-hoa.json` mà `seed-lab-products.ts` đọc, đồng thời sinh `doc/29_DIEM_CAN_XAC_MINH_VOI_HANG.md`. Bảng `ANH_XA` ở đầu file chứa các **quyết định nghiệp vụ** (slug, danh mục chính, ngành, ứng dụng của từng sản phẩm) — sửa ở đó nếu muốn đổi cách phân loại.

**`tools/kiem_tra_du_lieu.py`** — đối chiếu dữ liệu THÔ với ràng buộc thật của schema (trường bắt buộc để publish, enum `compliance_type`, giới hạn độ dài, tiêu chuẩn đã có trong seed, ghi chú nội bộ rò rỉ). Không cần thư viện ngoài.

> Danh sách taxonomy/tiêu chuẩn trong script được chép từ `backend/scripts/seed-demo.ts` tại thời điểm 2026-08-11. **Nếu seed thay đổi, phải cập nhật lại script**, nếu không kết quả sẽ sai.
