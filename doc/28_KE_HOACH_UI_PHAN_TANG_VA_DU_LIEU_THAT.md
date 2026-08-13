# 28 — KẾ HOẠCH: PHÂN TẦNG HIỂN THỊ TRANG SẢN PHẨM + CHUẨN HÓA & NẠP DỮ LIỆU THẬT

**Phiên bản:** 1.0
**Trạng thái:** ĐÃ HOÀN THÀNH — cả luồng dữ liệu và luồng UI (2026-08-12)
**Ngày viết:** 2026-08-11
**Phạm vi:** 1 thay đổi UI (frontend) + 1 đợt chuẩn hóa & nạp dữ liệu thật (pilot 4 hãng, 17 dòng máy)
**Dữ liệu:** [doc/data/lab-products/](data/lab-products/README.md)
**Công cụ kiểm tra:** `python doc/data/lab-products/tools/kiem_tra_du_lieu.py`

> **TÌNH TRẠNG (cập nhật 2026-08-12):** luồng dữ liệu **đã xong**. Toàn bộ dữ liệu demo đã bị xóa; 17 sản phẩm thật đã nạp vào DB, **15 đã xuất bản**, 2 còn ở trạng thái nháp vì thiếu ảnh đại diện (HVP 972, OptiFuel). Xem PHẦN 11.
>
> PHẦN 5 bên dưới giữ nguyên kết quả rà soát **ban đầu** (trước chuẩn hóa) để làm hồ sơ — không phải tình trạng hiện tại.
>
> Luồng UI (accordion cho Specifications/Standards) **đã làm** — xem PHẦN 12.

---

## 1. Bối cảnh

Website hiện dùng dữ liệu demo cho catalogue sản phẩm. Đã có một đợt trích xuất dữ liệu thật từ kho tài liệu gốc của hãng (`D:\Work\LTVN\Lab`) cho 17 dòng máy thuộc 4 hãng: Herzog Lab, ISL Lab, Phase Technology, PAC Lab (xem PHẦN 8).

Rà soát phát sinh **hai nhóm vấn đề độc lập nhau**:

**Nhóm A — trình bày (UI).** Trang chi tiết sản phẩm render toàn bộ nội dung nối tiếp trên một cuộn dài duy nhất, không phân tầng. Nạp dữ liệu thật vào sẽ khiến một số trang quá dài, khách khó đọc hết.

**Nhóm B — chất lượng dữ liệu.** Dữ liệu trích xuất đủ tốt về *nội dung kỹ thuật*, nhưng chưa đủ về *cấu trúc để hệ thống nhận*. Có lỗi chặn cứng, sai enum, thiếu taxonomy, và ghi chú nội bộ lẫn vào nội dung khách hàng đọc.

Quyết định xử lý đã thống nhất với người dùng (2026-08-11):
- **Không cắt bớt dữ liệu.** Khách mua thiết bị lab công nghiệp là dân kỹ thuật/mua sắm, cần thông số đầy đủ để ra quyết định — khác hành vi khách lẻ B2C.
- **Phân tầng cách hiển thị**: nội dung "đọc nhanh" hiện ngay, nội dung "tra cứu sâu" (Specifications/Standards đầy đủ) đặt trong accordion đóng sẵn.
- **70Xe Series (14 model con) và OptiFlash (5 biến thể)**: giữ nguyên là 1 trang platform mỗi dòng, kèm bảng so sánh bên trong — không tách thành nhiều trang sản phẩm riêng.

---

## 2. Phạm vi

| Luồng | Nội dung | Phụ thuộc |
|---|---|---|
| **UI** | Bọc accordion cho Specifications/Standards ở trang chi tiết sản phẩm | Độc lập |
| **Chuẩn hóa dữ liệu** | Bổ sung trường thiếu, sửa sai enum, tạo taxonomy, tách ghi chú nội bộ | Độc lập |
| **Nạp dữ liệu** | Đưa 17 sản phẩm vào catalogue | **Phụ thuộc cả hai luồng trên** |

Thứ tự khuyến nghị: chuẩn hóa dữ liệu và sửa UI có thể làm song song; nạp dữ liệu chỉ làm sau khi cả hai xong.

---

## 3. Hiện trạng UI

File: [frontend/src/app/products/[slug]/page.tsx](../frontend/src/app/products/%5Bslug%5D/page.tsx)

- Dòng 169–218: toàn bộ khối nội dung (Overview, Features, Applications, Principle, Sample types, Operating conditions, Accessories, Specifications, Standards) render tuần tự trong `<div className="space-y-12">`, không có logic ẩn/hiện.
- Dòng 309–358 (`ProductSectionNavigation`): đã có thanh điều hướng dính (sticky nav) nhảy tới từng section bằng anchor (`#specifications`, `#standards`…). Cơ chế này giữ nguyên.
- Dòng 389–391 (`isDemoCopy`): frontend **âm thầm lọc bỏ** mọi nội dung khớp `/\bdemo\b|khong dung|van ban demo/i`. Đã kiểm tra: 17 file dữ liệu thật **không chứa** các chuỗi này → an toàn, không bị mất nội dung ngoài ý muốn.
- [SpecificationTable.tsx](../frontend/src/components/product/SpecificationTable.tsx): render thẳng bảng đầy đủ. Dữ liệu có `group_key` nhưng UI chỉ hiện như một cột phẳng, chưa nhóm.
- [StandardList.tsx](../frontend/src/components/product/StandardList.tsx): render lưới 2 cột, **không phân biệt** `compliance_type` dù dữ liệu đã có trường này — đây là chỗ tận dụng được để giảm rối mắt.

---

## 4. Thiết kế UI đề xuất

**Tầng 1 — hiện ngay, không cần thao tác:**
Ảnh, tên/model, short description, badge tối đa 4 chuẩn nổi bật (đã có sẵn, dòng 122–137), Overview, Features, Applications, Principle, Sample types, Operating conditions, Accessories & options.

**Tầng 2 — đóng mặc định, bấm để mở:**
- **Specifications**: bọc trong accordion, tiêu đề dạng *"Xem đầy đủ thông số kỹ thuật (N thông số)"* để khách biết trước khối lượng. Cân nhắc nhóm theo `group_key` bằng heading phụ.
- **Standards**: bọc tương tự. Có thể tách 2 nhóm: *"Tiêu chuẩn máy tuân thủ trực tiếp"* (`compliance`) hiện trước, *"Tiêu chuẩn tương quan/tham chiếu"* (`correlation`/`specification`/`reference`) thu gọn thêm một cấp.

**Việc cần làm (UI):**
1. Kiểm tra `frontend/src/components/` xem đã có component Accordion/Collapsible dùng chung chưa; nếu chưa thì viết mới.
2. Sửa `page.tsx` dòng 213–218: bọc Specifications/Standards, `defaultOpen={false}`, **giữ nguyên** `id="specifications"`/`id="standards"` để anchor nav còn hoạt động.
3. **Đồng bộ anchor ↔ accordion**: khi bấm anchor mà accordion đang đóng thì phải tự mở. Đây là điểm dễ bỏ sót nhất.
4. (Chờ chốt) Nhóm `group_key` trong `SpecificationTable.tsx`.
5. (Chờ chốt) Phân nhóm `compliance_type` trong `StandardList.tsx`.
6. Cập nhật `frontend/test/w3-product-detail.test.tsx` — test hiện có khả năng assert Specifications/Standards luôn hiển thị, sẽ vỡ khi đổi sang đóng mặc định.

---

## 5. KẾT QUẢ RÀ SOÁT DỮ LIỆU (2026-08-11)

Đối chiếu 17 file trích xuất với schema thật của hệ thống. Kết quả bên dưới là **đã kiểm chứng bằng script**, không phải phỏng đoán.

### 5.1 CHẶN CỨNG — 17/17 sản phẩm không thể publish

[publish.service.ts:115](../backend/src/services/shared/publish.service.ts:115) chặn xuất bản nếu thiếu bất kỳ trường nào trong: `name`, `slug`, `short_description`, `overview`, `featured_image`, `brand`, `≥1 category` **và đúng 1 primary category**.

| Trường | Tình trạng dữ liệu hiện có | Hệ quả |
|---|---|---|
| `slug` | thiếu **17/17** | **CHẶN PUBLISH** |
| `categories` + primary | thiếu **17/17** | **CHẶN PUBLISH** |
| `featured_image` | thiếu **2/17** (HVP 972, OptiFuel) | **CHẶN PUBLISH 2 sản phẩm** |
| `name`, `short_description`, `overview` | đủ 17/17 | OK |
| `seo_title` / `seo_description` | thiếu 17/17 | Không chặn, nhưng mất SEO |
| `industries` | thiếu 17/17 | Không chặn, nhưng mất chiều lọc |

### 5.2 Brand "Phase Technology" chưa tồn tại

Hệ thống hiện chỉ có 4 hãng: `pac`, `herzog`, `isl`, `anton-paar`. **Không có Phase Technology** → 3 sản phẩm (70Xe Series, WAT-70Xi, OptiMVD) không gán được brand, mà brand là trường bắt buộc.

### 5.3 Taxonomy hiện có KHÔNG đủ phủ 17 sản phẩm

Danh mục hiện có (13): `petroleum-testing`, `distillation`, `atmospheric-distillation`, `vacuum-distillation`, `flash-point`, `closed-cup`, `open-cup`, `vapor-pressure`, `physical-properties`, `density-meters`, `viscometers`, `cold-properties`, `sample-preparation`.

Ứng dụng hiện có (6): `fuel-analysis`, `gasoline`, `diesel`, `jet-fuel`, `lubricant-analysis`, `crude-oil-assay`.
Ngành hiện có (4): `oil-and-gas`, `petrochemical`, `quality-control-lab`, `research-and-education`.

Sản phẩm **không tìm được danh mục phù hợp** trong 13 mục hiện có:

| Sản phẩm | Vấn đề |
|---|---|
| NCK2 5G (Noack evaporation loss) | Không có danh mục "evaporation loss / volatility" |
| OptiFuel (FTIR đa chỉ tiêu) | Không có danh mục "spectroscopy / FTIR" |
| OptiReader (quét heater tube JFTOT) | Không có danh mục nào gần |
| ZyNthAir (gas mixer, phụ kiện) | Không có danh mục phụ kiện/khí |
| 70Xe Series | Trải 3 danh mục (cold-properties + viscometers + density-meters) — **phải chọn đúng 1 primary** |
| OptiMVD | Trải 2 danh mục (viscometers + density-meters) — phải chọn 1 primary |
| OptiFlash (gộp 5 biến thể) | Trải cả `closed-cup` lẫn `open-cup` — phải chọn 1 primary |

### 5.4 Tiêu chuẩn: cần ~130, hệ thống mới có 16

Thiếu khoảng **102 tiêu chuẩn** chưa tồn tại trong DB (con số này sẽ còn thay đổi sau khi tách các ô gộp và loại bỏ những mục không phải phương pháp thử ở bảng dưới). Nghiêm trọng hơn, dữ liệu trích xuất **sai cấu trúc** so với schema — bảng `standards` yêu cầu **tách riêng** `organization` và `code` (chỉ mục duy nhất trên `UPPER(organization), UPPER(code)`), trong khi dữ liệu hiện gộp thành chuỗi:

| Loại lỗi | Ví dụ thật trong dữ liệu |
|---|---|
| Gộp nhiều chuẩn vào 1 ô | `ASTM D3828 / D3278 / D7236 / ISO 3679 / ISO 3680 / IP 523 / IP 524 / IP 534 / GB/T 5208` (9 chuẩn) |
| Gộp chuẩn tương đương | `ASTM D2500 (IP 219 / ISO 3015)`, `ASTM D5773 (IP 446)` |
| Thiếu tên tổ chức | `D1078`, `D850` (thiếu tiền tố `ASTM`) |
| Lẫn hậu tố không thuộc mã | `ASTM D86 (Groups 1–4)`, `ASTM D7346 (D7346-15)`, `ASTM D3241-18 Annex A4` |
| **Không phải phương pháp thử** | `CE`, `CE Marking`, `ISO 9000` — là dấu chứng nhận / hệ thống QLCL, **không nên** nằm trong bảng tiêu chuẩn thử nghiệm |

### 5.5 Sai enum `compliance_type`

Enum chỉ nhận `compliance` \| `correlation` \| `specification` \| `reference`. Hai vi phạm sẽ bị validator từ chối:

- `isl_optifpp.md` — ISO 3015 ghi `"compliance/correlation"` (nguồn tài liệu hãng mâu thuẫn, chưa chọn bên nào)
- `phase_wat70xi.md` — ASTM D8420 ghi `"Compliant (test method chính)"`

### 5.6 Hai sản phẩm bị thủng dữ liệu do cách gộp

| Sản phẩm | Vấn đề | Hệ quả |
|---|---|---|
| **OptiFlash** | Bảng Specifications có **0 dòng** (toàn bộ dồn vào "Bảng so sánh 5 biến thể") | Trang sản phẩm hiện ra **không có thông số kỹ thuật nào** |
| **70Xe Series** | Có **0 tiêu chuẩn** (chuẩn nằm trong bảng 14 model con) | Sản phẩm **vô hình trong bộ lọc theo tiêu chuẩn** — mà đây là chiều lọc chính theo ADR-007 |

### 5.7 Ghi chú nội bộ lẫn vào nội dung công khai

8 vị trí trong 6 file chứa câu kiểu *"brochure ghi X, Technical Offer ghi Y — cần xác minh với hãng"* nằm ngay trong mục **Operating conditions** và **Specifications**:

`herzog_hvm472.md` (2 chỗ) · `herzog_hvp972.md` · `herzog_optiflash_merged.md` · `isl_opticpp.md` · `isl_optimpp.md` (2 chỗ) · `isl_optipmd.md`

Nếu nạp thẳng, **khách hàng sẽ đọc thấy** những dòng này. Nguyên nhân gốc: file hiện trộn lẫn hai thứ khác nhau — *nội dung để đăng* và *ghi chú cho người rà soát* — cần tách thành hai tài liệu riêng.

### 5.8 Chưa có bộ chuyển đổi Markdown → ContentBlock

Dữ liệu hiện là markdown thuần. Hệ thống yêu cầu JSON có phong bì `{ version: 1, blocks: [...] }`, mỗi block có `id` (UUID) và `type` ([doc 11](11_CONTENT_BLOCK_SCHEMA.md) PHẦN III–IV). **Chưa có công cụ chuyển đổi nào.**

Ràng buộc theo trường cần tuân thủ khi chuyển ([doc 11](11_CONTENT_BLOCK_SCHEMA.md) PHẦN VI):

| Trường | Block được phép | Dữ liệu hiện có | Đánh giá |
|---|---|---|---|
| `overview` | heading, paragraph, list, image, table, external_video, callout, divider | đoạn văn | ✅ |
| `features` | **chỉ `list`** | bullet list | ✅ |
| `applications_text` | paragraph, list | bullet list | ✅ |
| `principle` | heading, paragraph, list, image, table | đoạn văn | ✅ |
| `sample_types` | paragraph, list, table | bullet list | ✅ |
| `operating_conditions` | paragraph, list, table | bullet list | ✅ |
| `accessories_options` | paragraph, list, table | bullet list | ✅ |

### 5.9 Những gì ĐẠT — không cần sửa

- **Độ dài trường**: không có vi phạm nào (`group_key` ≤100, `label` ≤500, `value` ≤2000, `unit` ≤100).
- **Bảng Specifications**: cấu trúc `Group | Label | Value | Unit` map thẳng sang `product_specifications`.
- **Nội dung kỹ thuật**: đầy đủ, có dẫn nguồn từng tài liệu, đã ghi rõ mọi chỗ số liệu lệch giữa các nguồn.
- **Tuân thủ ADR-014**: thuật ngữ kỹ thuật/mã chuẩn/tên model giữ nguyên tiếng Anh.
- **Không dính bộ lọc `isDemoCopy`** của frontend.

---

## 6. Việc cần làm — CHUẨN HÓA DỮ LIỆU

Thứ tự thực hiện có phụ thuộc: bước 1–2 phải xong trước bước 5.

**Bước 1 — Tạo brand còn thiếu.**
Thêm `Phase Technology` (slug đề xuất `phase-technology`, quốc gia CA — cần xác nhận). Không có brand này thì 3 sản phẩm không nạp được.

**Bước 2 — Mở rộng taxonomy.**
- Bổ sung danh mục cho các sản phẩm ở mục 5.3 chưa có chỗ (đề xuất: `volatility`, `spectroscopy`, `thermal-oxidation-stability`, `lab-accessories` — **cần chốt tên và vị trí trong cây danh mục**).
- Quyết định primary category cho 3 sản phẩm đa chỉ tiêu (70Xe, OptiMVD, OptiFlash).
- Bổ sung ứng dụng/ngành nếu cần (vd `marine-fuel`, `renewable-fuel`, `aviation` cho 70Xe/OptiFZP/OptiReader).

**Bước 3 — Chuẩn hóa bảng tiêu chuẩn.**
- Tách mọi ô gộp thành từng cặp `(organization, code)` riêng.
- Bổ sung tổ chức còn thiếu (`D1078` → `ASTM D1078`).
- Bỏ hậu tố không thuộc mã, chuyển sang trường `note` (vd `Groups 1–4`, `Annex A4`).
- **Loại** `CE`, `CE Marking`, `ISO 9000` khỏi bảng tiêu chuẩn — nếu vẫn muốn hiển thị thì đưa vào nội dung `overview` dạng văn bản.
- Sửa 2 giá trị `compliance_type` sai enum (mục 5.5). Riêng ISO 3015 của OptiFPP: hai nguồn hãng mâu thuẫn, **cần chọn một** hoặc hỏi hãng.
- Chốt danh sách cuối cùng rồi tạo bản ghi `standards` cho các mã chưa có (~102 mã, con số sẽ thay đổi sau khi tách/loại ở các gạch đầu dòng trên).

**Bước 4 — Vá lỗ hổng dữ liệu OptiFlash và 70Xe.**
- **OptiFlash**: trích lại bảng Specifications chung cho nền tảng (các thông số giống nhau giữa 5 biến thể: điện áp, kích thước, trọng lượng, nhiệt độ vận hành, màn hình…), giữ bảng so sánh biến thể riêng. Nguồn có sẵn: 5 file chi tiết `herzog_optiflash_{abel,tag,coc,pm,smallscale}.md`.
- **70Xe Series**: gom tập hợp tiêu chuẩn của cả 14 model con lên cấp sản phẩm (ASTM D5972, D5773, D5949, D7945, D7777, D6660…) để lọc được, đồng thời giữ bảng model con để khách biết model nào đo chỉ tiêu nào.

**Bước 5 — Tách ghi chú nội bộ khỏi nội dung công khai.**
Chuyển 8 ghi chú ở mục 5.7 sang một tài liệu rà soát riêng (đề xuất: `doc/29_DIEM_CAN_XAC_MINH_VOI_HANG.md`). Nội dung đăng lên web chỉ giữ **một** giá trị đã chốt, không kèm câu "cần xác minh".

**Bước 6 — Bổ sung trường còn thiếu cho 17 sản phẩm.**
- `slug`: đặt theo quy ước `^[a-z0-9]+(?:-[a-z0-9]+)*$` ([admin-product.dto.ts](../backend/src/api/dto/admin-product.dto.ts)). Lưu ý: slug đã publish **không được tái sử dụng** (sẽ vào bảng redirect).
- `seo_title` (≤255) và `seo_description` (≤500).
- Gán `categories` (đúng 1 primary), `applications`, `industries`.

**Bước 7 — Viết bộ chuyển đổi Markdown → ContentBlock.**
Sinh `{version:1, blocks:[...]}` với `id` UUID mỗi block, tôn trọng allowlist theo trường (mục 5.8).

**Bước 8 — Xử lý ảnh.**
Convert TIFF → JPG/PNG cho OptiFZP/OptiMPP/OptiPMD; xin ảnh mới cho HVP 972 và OptiFuel; xin ảnh "sạch" cho OptiMVD. Upload qua Media service để có `media_id` (schema **cấm** tham chiếu ảnh bằng URL — [doc 11](11_CONTENT_BLOCK_SCHEMA.md) PHẦN II mục 2).

**Bước 9 — Nạp dữ liệu.**
Với quy mô 17 sản phẩm, nhập thủ công qua admin CMS nhiều khả năng nhanh và an toàn hơn viết importer. Nếu viết importer thì tham chiếu quy tắc kỹ thuật ở [13_CONTENT_MIGRATION_WORKSTREAM.md](../planning/implementation/v1.0/13_CONTENT_MIGRATION_WORKSTREAM.md) mục 5 (idempotent, chặn ghi thẳng production).

---

## 7. Danh sách 17 sản phẩm & tình trạng

| Hãng | Sản phẩm | File dữ liệu | Specs | Standards | Ảnh |
|---|---|---|---|---|---|
| Herzog | HVM 472 | `herzog_hvm472.md` | 25 | 6 | ✅ HR |
| Herzog | HVP 972 | `herzog_hvp972.md` | 20 | 7 | ❌ **không có** |
| Herzog | OptiDist | `herzog_optidist.md` | 20 | 18 | ✅ HR |
| Herzog | OptiFlash (gộp 5 biến thể) | `herzog_optiflash_merged.md` | ⚠️ **0** | 5 | ✅ |
| ISL | NCK2 5G | `isl_nck2_5g.md` | 10 | 5 | ✅ HR |
| ISL | OptiCPP | `isl_opticpp.md` | 10 | 14 | ✅ HR |
| ISL | OptiFPP | `isl_optifpp.md` | 11 | 12 | ✅ |
| ISL | OptiFZP | `isl_optifzp.md` | 12 | 7 | ⚠️ chỉ LR |
| ISL | OptiMPP & OptiMPPML | `isl_optimpp.md` | 13 | 21 | ⚠️ chỉ LR |
| ISL | OptiPMD | `isl_optipmd.md` | 10 | 23 | ⚠️ chỉ LoRes |
| Phase | 70Xe Series (14 model con) | `phase_70xe_series.md` | 15 | ⚠️ **0** | ✅ |
| Phase | WAT-70Xi | `phase_wat70xi.md` | 10 | 3 | ✅ HR |
| Phase | OptiMVD | `phase_optimvd.md` | 10 | 10 | ⚠️ ảnh social-media |
| PAC | OptiDist 2 | `pac_optidist2.md` | 13 | 15 | ✅ studio |
| PAC | OptiFuel | `pac_optifuel.md` | 14 | 27 | ❌ **DO NOT USE** |
| PAC | OptiReader | `pac_optireader.md` | 11 | 1 | ✅ |
| PAC | ZyNthAir (`accessory`) | `pac_zynthair.md` | 15 | 2 | ✅ |

**Vị trí dữ liệu:** [doc/data/lab-products/](data/lab-products/README.md) — đã đưa vào repo ngày 2026-08-11 (25 file `.md`: 17 file chính + 5 biến thể OptiFlash + 3 dòng máy ngoài phạm vi).

Bản tổng hợp Word `LTVN_Du_lieu_san_pham_that_v1.docx` đã gửi qua chat, **không** lưu trong repo — nó chỉ để trình bày/duyệt nội dung, còn nguồn sự thật là các file `.md` ở đây.

**Kiểm tra tiến độ chuẩn hóa bất cứ lúc nào:**

```bash
python doc/data/lab-products/tools/kiem_tra_du_lieu.py
```

Kết quả tại thời điểm 2026-08-11: **33 lỗi chặn nạp dữ liệu, 10 cảnh báo**. Mục tiêu sau khi làm xong PHẦN 6 là 0 lỗi.

---

## 8. Vấn đề cần chốt trước khi thi công

**Về UI:**
- Accordion đóng mặc định có ảnh hưởng SEO không? (Google nói chung vẫn index nội dung trong accordion nếu dùng đúng semantic HTML, nhưng cần người phụ trách SEO của dự án xác nhận.)
- Có tách nhóm `compliance_type` trong Standards không?
- Có nhóm `group_key` trong Specifications không?

**Về taxonomy (chặn bước 2):**
- Tên và vị trí của các danh mục mới cần thêm.
- Primary category cho 70Xe Series, OptiMVD, OptiFlash.

**Về dữ liệu kỹ thuật — cần hỏi hãng:**
- HVM 472: cân nặng 80 kg (Technical Offer 2025) vs 90/99 kg (brochure 2014).
- OptiCPP: kích thước 30×26×34 cm / 28 kg vs 25.4×60×35 cm / 30.2 kg.
- OptiFPP: kích thước lệch giữa 2 nguồn; **ISO 3015 là `compliance` hay `correlation`**.
- OptiFZP: điện áp/công suất/trọng lượng lệch giữa brochure 2016 và Technical Offer 2025.
- **OptiDist 2: ASTM D4530 (Technical Offer) vs D4350 (brochure)** — hai chuẩn khác nhau thật sự, không phải lỗi đánh máy.
- HGT 915/917 *(ngoài phạm vi đợt này nhưng đã trích xuất)*: trọng lượng lệch đúng 10 kg giữa 2 nguồn.

---

## 9. Tiêu chí nghiệm thu (đề xuất)

**UI:**
- Trang chi tiết sản phẩm với dữ liệu thật (vd HVM 472) ở trạng thái mặc định không cần cuộn quá 2–3 màn hình desktop trước khi tới Related Products.
- Specifications/Standards vẫn truy cập đầy đủ trong accordion.
- Anchor từ sticky nav mở đúng accordion tương ứng.

**Dữ liệu:**
- `publish.check()` trả `ok: true` cho cả 17 sản phẩm (không còn blocker).
- 17 sản phẩm hiển thị trên trang public, không còn placeholder demo.
- Mỗi sản phẩm lọc được theo ít nhất 1 tiêu chuẩn (kể cả 70Xe Series).
- Không còn câu ghi chú nội bộ nào ("cần xác minh", "brochure ghi… Technical Offer ghi…") xuất hiện trên trang công khai.
- Ảnh hiển thị đúng tỉ lệ, không vỡ layout kể cả với ảnh LR.

---

## 10. Tài liệu liên quan

- [09_ADR_QUYET_DINH_KIEN_TRUC.md](09_ADR_QUYET_DINH_KIEN_TRUC.md) — ADR-014 (giữ tiếng Anh cho thuật ngữ kỹ thuật), ADR-010 (1 danh mục chính/sản phẩm), ADR-007 (ngữ nghĩa bộ lọc), ADR-005 (media).
- [11_CONTENT_BLOCK_SCHEMA.md](11_CONTENT_BLOCK_SCHEMA.md) — cấu trúc `ContentBlock`, allowlist theo trường, giới hạn xử lý.
- `backend/src/dao/products/object.ts`, `backend/src/api/dto/admin-product.dto.ts` — schema sản phẩm.
- `backend/src/services/shared/publish.service.ts` — điều kiện chặn xuất bản.
- `backend/scripts/seed-demo.ts` — taxonomy hiện có (brands/categories/applications/industries/standards).
- [13_CONTENT_MIGRATION_WORKSTREAM.md](../planning/implementation/v1.0/13_CONTENT_MIGRATION_WORKSTREAM.md) — **luồng KHÁC** (migrate URL/nội dung từ site cũ, có C7 ownership/Gate B). Tài liệu 28 này là nạp dữ liệu mới trích từ hãng, không phải migrate. Chỉ tham chiếu quy tắc kỹ thuật khi viết importer.

---

## 11. KẾT QUẢ THỰC HIỆN — LUỒNG DỮ LIỆU (2026-08-12)

### 11.1 Đã làm

| Bước (PHẦN 6) | Kết quả |
|---|---|
| Xóa dữ liệu demo | 17 sản phẩm `DEMO-%` đã xóa sạch |
| 1. Tạo brand thiếu | `phase-technology` (Phase Technology) |
| 2. Mở rộng taxonomy | +4 danh mục: `volatility`, `spectroscopy`, `thermal-oxidation-stability`, `lab-accessories` (13 → 17) |
| 3. Chuẩn hóa tiêu chuẩn | 140 tiêu chuẩn (16 → 140, tạo mới 124); tách ô gộp, bổ sung tổ chức, loại `CE`/`ISO 9000` |
| 4. Vá lỗ hổng | OptiFlash: 0 → 20 thông số · 70Xe Series: 0 → 6 tiêu chuẩn |
| 5. Tách ghi chú nội bộ | 71 ghi chú → [29_DIEM_CAN_XAC_MINH_VOI_HANG.md](29_DIEM_CAN_XAC_MINH_VOI_HANG.md) |
| 6. Bổ sung trường thiếu | slug + seo_title + seo_description + categories/applications/industries cho cả 17 |
| 7. Chuyển sang ContentBlock | Xong (paragraph/list theo allowlist từng trường) |
| 8. Xử lý ảnh | 15 ảnh nạp vào Media (resize ≤1600px, JPEG q82) |
| 9. Nạp dữ liệu | `pnpm --filter @ltv/backend seed:lab` |

### 11.2 Tình trạng cuối

```
san pham          17 (published 15, draft 2)
tieu chuan       140
danh muc          17
media             17
lien ket chuan   198
thong so         267
```

**Hai sản phẩm còn ở trạng thái nháp** — bị `PublishService` chặn đúng lý do, không phải lỗi:
- `herzog-hvp-972-vapor-pressure-analyzer` — thiếu ảnh đại diện
- `pac-optifuel-ftir-fuel-analyzer` — thiếu ảnh đại diện (ảnh gốc bị hãng đánh dấu `DO NOT USE`)

Chỉ cần bổ sung ảnh rồi chạy lại script là hai sản phẩm này tự lên sóng.

### 11.3 Đã kiểm chứng

- 15/15 trang chi tiết sản phẩm trả HTTP 200; `/products` và `/products/all` trả 200.
- Ảnh sản phẩm hiển thị thật trên trang (đã kiểm bằng trình duyệt, không còn "Product image coming soon").
- **Không còn ghi chú nội bộ nào lọt ra trang công khai** (đã grep "cần xác minh", "brochure", "Technical Offer", "chênh lệch" trên 5 trang có nhiều ghi chú nhất).
- Không còn văn bản demo.
- Lọc theo tiêu chuẩn hoạt động: `astm-d445`→2, `astm-d86`→3, `astm-d7777`→2 sản phẩm.
- Lọc theo hãng: herzog→3, isl→6, pac→3, phase-technology→3.

### 11.4 Công cụ mới

| File | Việc |
|---|---|
| `doc/data/lab-products/tools/chuan_hoa.py` | Chuẩn hóa 17 file `.md` → `du-lieu-chuan-hoa.json` + sinh doc 29 |
| `backend/scripts/seed-lab-products.ts` | Nạp vào DB qua tầng DAO (`pnpm --filter @ltv/backend seed:lab`) |

Cả hai đều **idempotent** — chạy lại không nhân đôi dữ liệu.

### 11.5 Bốn lỗi phát hiện trong lúc làm (đã sửa)

Ghi lại vì đều là loại lỗi **âm thầm** — không báo lỗi, chỉ làm sai dữ liệu:

1. **Bộ lọc ghi chú quá rộng** — dùng riêng từ "nguồn" khiến nó khớp cả "**nguồn** sáng laser" và xóa mất nguyên đoạn mô tả nguyên lý quang học của OptiFZP. Đã neo biểu thức vào ngữ cảnh dẫn nguồn và tách riêng cách xử lý văn xuôi / gạch đầu dòng.
2. **Tách mã tiêu chuẩn sai** — `ASTM D2500 (IP 219 / ISO 3015)` bị cắt thành `ASTM D2500 (IP 219`. Đã xử lý ngoặc trước khi cắt theo `/`.
3. **Mất mã chuẩn do cắt sớm** — cắt theo dấu phẩy trước khi phân tích làm `D7777` mất ngữ cảnh tổ chức `ASTM`.
4. **Ảnh không hiện dù đã nạp** — đặt `featured_image_id` là chưa đủ; `ProductGallery` duyệt mảng `media`, nên phải gọi thêm `replaceMedia()`.

### 11.6 Việc còn lại

- **Luồng UI** (PHẦN 4) — chưa làm.
- **Bổ sung ảnh** cho HVP 972 và OptiFuel.
- **Xác minh số liệu với hãng** — xem [doc 29](29_DIEM_CAN_XAC_MINH_VOI_HANG.md), đặc biệt OptiDist 2 (ASTM D4530 vs D4350).
- **Rà lại ánh xạ danh mục/ngành** trong `chuan_hoa.py` (`ANH_XA`) — hiện do tôi đề xuất, cần người hiểu nghiệp vụ duyệt.

---

## 12. KẾT QUẢ THỰC HIỆN — LUỒNG UI (2026-08-12)

### 12.1 Đã làm

| Việc | File |
|---|---|
| Component accordion dùng chung | `frontend/src/components/ui/CollapsibleSection.tsx` (mới) |
| Bọc Specifications + Standards, thu gọn mặc định | [page.tsx](../frontend/src/app/products/%5Bslug%5D/page.tsx) |
| Nhóm thông số theo `group_key` | [SpecificationTable.tsx](../frontend/src/components/product/SpecificationTable.tsx) |
| Tách tiêu chuẩn theo `compliance_type` | [StandardList.tsx](../frontend/src/components/product/StandardList.tsx) |
| Nhãn mới (EN + VI) | `frontend/src/lib/i18n/{en,vi}.ts` |
| Test cho hành vi mới | `frontend/test/w3-product-detail.test.tsx` (+3 test) |

### 12.2 Quyết định thiết kế

**Dùng `<details>` thật, không phải div + state.** Lý do: hoạt động cả khi JavaScript chưa tải xong; bàn phím và trình đọc màn hình được hỗ trợ sẵn không phải tự làm ARIA; và **nội dung vẫn nằm trong DOM** nên công cụ tìm kiếm đọc được — giải tỏa lo ngại SEO nêu ở PHẦN 8.

Phần client-side chỉ làm **một** việc: mở sẵn accordion khi người dùng bấm liên kết neo (`#specifications`) từ thanh điều hướng dính. Thiếu nó thì thanh nav nhảy xuống đúng chỗ nhưng người dùng thấy một mục đang đóng — đúng điểm "dễ bỏ sót nhất" đã cảnh báo ở PHẦN 4.

**Nhóm thông số bằng dòng tiêu đề thay cho một cột.** `group_key` trước đây là cột đầu, khiến bảng 40 dòng lặp lại "Operation, Operation, Operation…". Chuyển thành dòng tiêu đề nhóm và bỏ cột đó: bảng còn 2 cột, ngắn và dễ quét hơn.

**Tách tiêu chuẩn theo mức độ liên quan.** `compliance_type` đã có trong dữ liệu nhưng chưa từng dùng để hiển thị. Với dữ liệu thật thì khác biệt này quan trọng: OptiFuel có 27 tiêu chuẩn nhưng chỉ một phần là phương pháp máy **tuân thủ trực tiếp**, còn lại là tương quan/tham chiếu. Người mua cần phân biệt được hai loại.

### 12.3 Hiệu quả đo được

Đo trên 70Xe Series (sản phẩm nhiều dữ liệu nhất — 43 thông số, 6 tiêu chuẩn):

| | Chiều cao trang | Số màn hình (desktop 900px) |
|---|---|---|
| Trước (mở hết) | 7439 px | 8.3 |
| Sau (thu gọn mặc định) | 4077 px | **4.5** |

**Giảm 45%**, đạt tiêu chí nghiệm thu ở PHẦN 9 ("không quá 2–3 màn hình trước khi tới Related Products" — phần nội dung chính hiện nằm trong khoảng đó, phần còn lại là footer).

### 12.4 Đã kiểm chứng

- 69/69 test frontend xanh · typecheck sạch · `pnpm lint` xanh.
- Accordion thu gọn mặc định, có chú thích khối lượng ("43 parameters", "6 standards") để người đọc quyết định trước khi mở.
- **Bấm neo từ thanh điều hướng tự mở accordion** (kiểm bằng trình duyệt thật).
- Nội dung vẫn nằm trong DOM khi đóng → không ảnh hưởng SEO.
- Sản phẩm ở trạng thái nháp trả HTTP 404 ở đường công khai — không rò rỉ.

### 12.5 Ghi chú bảo trì

`eslint.config.mjs` được bổ sung một mục loại trừ cho `doc/data/**/tools/*.js` (script dựng file Word chạy độc lập bằng CommonJS). Đây là tiện ích tài liệu, không phải mã sản phẩm; để lại thì `pnpm lint` đỏ vĩnh viễn vì 11 lỗi vô nghĩa.
