# 11 — LƯỢC ĐỒ CONTENT BLOCK — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-08-01
**Nguồn sự thật cho:** cấu trúc mọi trường `JSONB` chứa nội dung biên tập.
**Áp dụng:** ADR-005 (media), ADR-009 (upload), ADR-012 (video), ADR-014 (ngôn ngữ).
**Cài đặt có thẩm quyền:** `packages/contracts/src/blocks.ts`. Khi tài liệu và code khác nhau, **code thắng** — nó là thứ chạy validator.

---

# PHẦN I — VÌ SAO CÓ TÀI LIỆU NÀY

Hơn 20 trường trong schema có kiểu `JSONB` chứa nội dung biên tập:

```text
page_translations.content            post_translations.content
product.overview / features / applications_text / principle /
        sample_types / operating_conditions / accessories_options
service_translations.overview / customer_problems / scope_of_work / process / benefits / faq
project_translations.scope_of_work / implementation / result
brands.description · product_categories.description
applications.description · industries.description
```

Bộ tài liệu v1.2.1 định nghĩa **đúng một** loại block (`external_video` ở ADR-012) và để trống phần còn lại. Hệ quả: P3 phải viết validator cho một lược đồ chưa ai định nghĩa, P9 dựng editor, P10 render, CM1 map nội dung cũ — bốn phase cùng phụ thuộc vào một hợp đồng không tồn tại.

Tài liệu này đóng khoảng trống đó.

---

# PHẦN II — NGUYÊN TẮC

## 1. Không bao giờ lưu HTML

Backend lưu **dữ liệu có cấu trúc**, không lưu HTML, không lưu iframe, không lưu script. Frontend dựng HTML từ dữ liệu đã được validate. Đây là mở rộng của nguyên tắc ADR-012 đã áp cho video, nay áp cho toàn bộ nội dung.

Lý do: HTML do người dùng nhập là bề mặt tấn công XSS lớn nhất của mọi CMS. Lưu dữ liệu có cấu trúc thì lỗ hổng đó không tồn tại — không có gì để thoát ra.

## 2. Media chỉ tham chiếu bằng `media_id`, không bao giờ bằng URL

```json
{ "type": "image", "media_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Không** cho phép `"url": "https://..."` hay `"src": "/media/..."`.

Đây là điều kiện để `content_media_refs` hoạt động (ADR-005 v1.3). Nếu block chứa URL trực tiếp, `MediaUsageService` không cách nào biết ảnh đang được dùng, và ảnh sẽ bị xóa rồi purge vĩnh viễn sau 30 ngày.

## 3. Mảng phẳng, không lồng nhau

Nội dung là **một mảng block ở một cấp**. Không có block chứa block, trừ `list` chứa các mục văn bản.

Lý do: nội dung thật của website này — mô tả sản phẩm, tin tức, trang giới thiệu — không cần bố cục lồng nhau. Cho phép lồng thì phải định nghĩa giới hạn độ sâu, xử lý đệ quy khi validate, khi trích media, khi render, khi migrate. Chi phí đó không đổi lại giá trị nào ở P0.

Nếu sau này thật sự cần bố cục nhiều cột, thêm **một** loại block `columns` có đúng một cấp con — bằng migration lược đồ, không phải mở lồng vô hạn.

## 4. Mỗi trường có danh sách block được phép riêng

`products.features` chỉ nên chứa `list`. `page_translations.content` được dùng đầy đủ. Ràng buộc theo trường ngăn nội dung lạc chỗ và giúp editor hiển thị đúng công cụ.

## 5. Có phiên bản lược đồ

Mỗi mảng nội dung được bọc trong phong bì có `version`. Đổi lược đồ về sau thì migrate được, không phải đoán.

---

# PHẦN III — PHONG BÌ NỘI DUNG

```json
{
  "version": 1,
  "blocks": [ /* mảng block */ ]
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `version` | integer | Hiện tại `1`. Bắt buộc |
| `blocks` | array | Có thể rỗng. Tối đa **200** phần tử |

> **Tương thích ngược:** trường JSONB đang có mặc định `'[]'::jsonb` — một mảng trần. Bộ đọc chấp nhận cả mảng trần (coi là `version: 1`) lẫn phong bì đầy đủ. Bộ ghi **luôn** ghi phong bì đầy đủ.

---

# PHẦN IV — MƯỜI LOẠI BLOCK

Mọi block có `type` và `id` (UUID, do editor sinh, dùng để React key và để so sánh khi sửa).

## 1. `heading`

```json
{ "id": "...", "type": "heading", "level": 2, "text": "Superior Precision from the First Run" }
```

| Trường | Ràng buộc |
|---|---|
| `level` | integer, **2–4**. Không cho `h1` — mỗi trang chỉ có một `h1` do tiêu đề entity sinh ra |
| `text` | string, 1–200 ký tự, **văn bản thuần**, không có mark |

## 2. `paragraph`

```json
{
  "id": "...", "type": "paragraph",
  "spans": [
    { "text": "The D86 distillation method allows characterizing the " },
    { "text": "tendency of a fuel to vaporize", "marks": ["bold"] },
    { "text": "." }
  ]
}
```

| Trường | Ràng buộc |
|---|---|
| `spans` | array, 1–100 phần tử |
| `spans[].text` | string, tổng độ dài toàn block ≤ **5.000** ký tự |
| `spans[].marks` | mảng con của `bold`, `italic`, `code`, `sup`, `sub`. Tối đa 3 mark mỗi span |
| `spans[].link` | tuỳ chọn, xem PHẦN V |

`sup`/`sub` có mặt vì nội dung kỹ thuật cần `m²`, `°C`, `H₂O`.

## 3. `list`

```json
{
  "id": "...", "type": "list", "style": "bullet",
  "items": [
    { "spans": [{ "text": "Easy to use mistake proof unit" }] },
    { "spans": [{ "text": "Quick connection for flask" }] }
  ]
}
```

| Trường | Ràng buộc |
|---|---|
| `style` | `bullet` hoặc `number` |
| `items` | array, 1–100 phần tử, mỗi phần tử có `spans` như `paragraph` |

Không lồng danh sách. Danh sách hai cấp trong nội dung kỹ thuật gần như luôn có thể viết lại thành hai danh sách hoặc thêm heading.

## 4. `image`

```json
{
  "id": "...", "type": "image",
  "media_id": "550e8400-e29b-41d4-a716-446655440000",
  "caption": "OptiDist bố trí trong phòng thí nghiệm",
  "alt": "Máy chưng cất tự động OptiDist",
  "size": "full"
}
```

| Trường | Ràng buộc |
|---|---|
| `media_id` | **UUID, bắt buộc**. Backend kiểm media tồn tại, chưa xóa, `storage_class='public'`, MIME là ảnh |
| `caption` | tuỳ chọn, ≤ 500 ký tự, văn bản thuần |
| `alt` | tuỳ chọn, ≤ 500. Bỏ trống thì lấy `media.alt_text` |
| `size` | `full`, `wide`, `inline`. Mặc định `full` |

**PDF không được dùng ở block này** — dùng `file`.

## 5. `gallery`

```json
{
  "id": "...", "type": "gallery", "layout": "grid",
  "items": [ { "media_id": "...", "caption": "..." } ]
}
```

| Trường | Ràng buộc |
|---|---|
| `layout` | `grid` hoặc `carousel` |
| `items` | 1–**24** phần tử, mỗi phần tử ràng buộc `media_id` như `image` |

## 6. `table`

```json
{
  "id": "...", "type": "table",
  "headers": ["Method", "Standard"],
  "rows": [["Atmospheric distillation", "ASTM D86"]]
}
```

| Trường | Ràng buộc |
|---|---|
| `headers` | 1–**10** cột, văn bản thuần |
| `rows` | 1–**100** dòng, mỗi dòng số ô **phải bằng** số cột |
| ô | văn bản thuần, ≤ 500 ký tự |

**Không dùng cho thông số kỹ thuật sản phẩm** — đã có bảng `product_specifications` với `group_key`, lọc và so sánh được. Block này dành cho bảng đối chiếu trong bài viết.

## 7. `external_video` (ADR-012)

```json
{
  "id": "...", "type": "external_video", "provider": "youtube",
  "video_id": "oWs8-xpbr0I", "title": "OptiDist demo", "caption": "..."
}
```

| Trường | Ràng buộc |
|---|---|
| `provider` | **chỉ** `youtube` hoặc `vimeo` |
| `video_id` | string đã được backend trích và xác thực từ URL |
| `title` | ≤ 200, văn bản thuần |
| `caption` | tuỳ chọn, ≤ 500 |

**Lưu `video_id`, không lưu URL đầy đủ.** Admin nhập URL, backend parse, xác thực domain, trích ID rồi chỉ lưu ID. Frontend dựng embed từ provider + ID. Không có đường nào để URL lạ lọt vào.

Sai → `422 VIDEO_PROVIDER_NOT_ALLOWED` hoặc `VIDEO_URL_INVALID`.

## 8. `file`

```json
{ "id": "...", "type": "file", "document_id": "...", "label": "OptiDist Catalogue" }
```

| Trường | Ràng buộc |
|---|---|
| `document_id` | UUID trỏ `documents`, **không** trỏ thẳng `media` |
| `label` | tuỳ chọn, ≤ 200 |

Trỏ qua `documents` để cổng tải xuống của Nest vẫn kiểm được publication, locale, deleted và existence (D20). Trỏ thẳng `media` sẽ vòng qua cổng đó.

## 9. `callout`

```json
{ "id": "...", "type": "callout", "variant": "warning", "title": "Lưu ý an toàn",
  "spans": [{ "text": "Chỉ vận hành khi tủ hút đang hoạt động." }] }
```

| Trường | Ràng buộc |
|---|---|
| `variant` | `info`, `note`, `warning`, `success` |
| `title` | tuỳ chọn, ≤ 200 |
| `spans` | như `paragraph`, ≤ 2.000 ký tự |

## 10. `divider`

```json
{ "id": "...", "type": "divider" }
```

---

# PHẦN V — LIÊN KẾT TRONG VĂN BẢN

```json
{ "text": "xem sản phẩm", "link": { "kind": "product", "slug": "optidist-atmospheric-distillation" } }
```

| `kind` | Trường kèm | Ghi chú |
|---|---|---|
| `product`, `service`, `project`, `post`, `brand`, `document`, `page` | `slug` | Frontend dựng URL từ bảng route (ADR-001). Không lưu URL |
| `external` | `url` | **Chỉ `https://`**. Render kèm `rel="noopener noreferrer"` |
| `anchor` | `block_id` | Nhảy trong trang |

**Không lưu URL nội bộ.** Nếu lưu, đổi cấu trúc route là mọi liên kết trong nội dung chết — mà `redirects` không bắt được vì chúng nằm trong JSONB, không phải request thật.

Link ngoài **cấm** `javascript:`, `data:`, `vbscript:` và mọi scheme khác `https`.

---

# PHẦN VI — DANH SÁCH BLOCK ĐƯỢC PHÉP THEO TRƯỜNG

| Trường | Block được phép |
|---|---|
| `page_translations.content` | tất cả 10 |
| `post_translations.content` | tất cả 10 |
| `products.overview` | heading, paragraph, list, image, table, external_video, callout, divider |
| `products.features` | **chỉ** `list` |
| `products.applications_text` | paragraph, list |
| `products.principle` | heading, paragraph, list, image, table |
| `products.sample_types` | paragraph, list, table |
| `products.operating_conditions` | paragraph, list, table |
| `products.accessories_options` | paragraph, list, table |
| `service_translations.overview` | heading, paragraph, list, image, callout, divider |
| `service_translations.customer_problems` | paragraph, list |
| `service_translations.scope_of_work` | paragraph, list, table |
| `service_translations.process` | list, paragraph, image |
| `service_translations.benefits` | **chỉ** `list` |
| `service_translations.faq` | xem PHẦN VII |
| `project_translations.scope_of_work` | paragraph, list, table |
| `project_translations.implementation` | heading, paragraph, list, image, gallery |
| `project_translations.result` | paragraph, list, table, gallery |
| `brands.description` | heading, paragraph, list, image, external_video, divider |
| `product_categories.description` · `applications.description` · `industries.description` | heading, paragraph, list, image |

---

# PHẦN VII — FAQ LÀ CẤU TRÚC RIÊNG

`service_translations.faq` **không** dùng mảng block mà dùng cấu trúc riêng, vì nó sinh structured data `FAQPage` (ADR-011):

```json
{ "version": 1, "items": [ { "id": "...", "question": "...", "answer_spans": [...] } ] }
```

`question` là văn bản thuần ≤ 300 ký tự; `answer_spans` như `paragraph`, ≤ 2.000 ký tự. Tối đa 50 mục.

Cấu trúc phẳng để map thẳng sang JSON-LD mà không phải suy diễn từ mảng block.

---

# PHẦN VIII — GIỚI HẠN XỬ LÝ (đóng quyết định B25)

| Giới hạn | Giá trị |
|---|---|
| Số block mỗi trường | 200 |
| Kích thước JSON mỗi trường sau chuẩn hóa | 256 KB |
| Độ dài văn bản mỗi block | 5.000 ký tự |
| Số span mỗi block | 100 |
| Số mục mỗi list | 100 |
| Số ảnh mỗi gallery | 24 |
| Số dòng mỗi table | 100 · số cột 10 |
| Số mục FAQ | 50 |
| Thời gian validate một trường | 200 ms, vượt thì từ chối |
| Độ sâu lồng nhau | **1** (chỉ list/gallery/table có mục con) |

Vượt giới hạn → `422 CONTENT_BLOCK_LIMIT_EXCEEDED` kèm tên trường và giới hạn bị vượt.

---

# PHẦN IX — HỢP ĐỒNG VALIDATE

Thứ tự bắt buộc khi ghi bất kỳ trường nội dung nào:

```text
1. Parse JSON              sai cú pháp        → 400
2. Kiểm phong bì           thiếu version      → 422
3. Kiểm giới hạn           vượt ngưỡng        → 422 CONTENT_BLOCK_LIMIT_EXCEEDED
4. Kiểm từng block         type lạ            → 422 CONTENT_BLOCK_TYPE_NOT_ALLOWED
                           sai trường allowlist → 422 CONTENT_BLOCK_NOT_ALLOWED_IN_FIELD
5. Chuẩn hóa văn bản       NFC, cắt khoảng trắng thừa, chuẩn hóa xuống dòng
6. Kiểm tham chiếu         media_id / document_id không tồn tại hoặc đã xóa → 422
                           media không phải public hoặc sai MIME            → 422
7. Kiểm link               scheme không phải https                         → 422
8. Trích tham chiếu media  gom mọi media_id trong mảng block
9. Ghi trong MỘT transaction:
       UPDATE trường nội dung
       đồng bộ content_media_refs cho entity + field + locale
```

**Bước 8 và 9 là bắt buộc.** Bỏ chúng thì `MediaUsageService` không thấy ảnh dùng trong block, và ảnh sẽ bị xóa rồi purge vĩnh viễn — đúng lỗ hổng A4 của v1.2.1.

---

# PHẦN X — HỢP ĐỒNG RENDER

- Frontend render **từ dữ liệu**, không bao giờ từ chuỗi HTML.
- `external_video` dựng iframe từ `provider` + `video_id`. Không nhúng URL từ nội dung.
- `image`/`gallery` dựng URL từ `media_id` qua `/media/*`, dùng `variants` cho ảnh đáp ứng.
- `file` dựng link tới `/api/v1/documents/:slug/download`, không trỏ thẳng file.
- Link ngoài luôn có `rel="noopener noreferrer"`.
- Block có `type` không nhận ra: **bỏ qua im lặng ở public, hiện cảnh báo ở Admin**. Cho phép thêm block mới mà không làm vỡ trang đã publish.

---

# PHẦN XI — LIÊN QUAN TỚI MIGRATION NỘI DUNG (CM1)

Nội dung website hiện tại map như sau:

| Nguồn ở site cũ | Block đích |
|---|---|
| Đoạn mô tả | `paragraph` |
| Tiêu đề phụ in đậm | `heading` level 2 |
| Danh sách "Main Features" | `list` style bullet |
| Danh sách "Methods" | **không phải block** — parse thành `product_standards` (organization + code) |
| Ảnh sản phẩm | `image` với `media_id` sau khi import media |
| Link YouTube ở slider | `external_video` |

Riêng "Methods" đáng lưu ý: `ASTM D86, D1078, D850 / EN ISO 3405, ISO 918 / IP 123, IP 195 / DIN 51 751 / JIS K2254 / NF M07-002` là **dữ liệu quan hệ**, không phải văn bản. Đưa vào `product_standards` thì lọc được; để trong block thì mất khả năng lọc — mà lọc theo tiêu chuẩn là một trong những chiều lọc chính của ADR-007.
