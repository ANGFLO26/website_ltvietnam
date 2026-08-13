# Báo cáo hoàn thành Admin A3 — Nội dung song ngữ và block editor

**Ngày nghiệm thu:** 2026-08-11
**Phạm vi:** `@ltv/admin`, shared contracts và admin content read-model backend
**Kết luận:** hoàn thành A3; sẵn sàng chuyển sang A4

## 1. Kết quả chính

A3 đã bổ sung luồng quản trị hoàn chỉnh cho:

```text
/content/pages
/content/services
/content/projects
/content/posts
/content/post-categories
/content/[resource]/new
/content/[resource]/[id]
```

- Danh sách dùng admin read-model, hiển thị badge VI/EN và trạng thái từng bản dịch.
- Trang, dịch vụ, dự án và bài viết có hai tab VI/EN với dirty state, lưu, ẩn và xuất bản độc lập.
- Danh mục bài viết giữ mô hình một ngôn ngữ theo ADR hiện tại.
- Có soft delete/restore cho bốn nhóm nội dung; trang hệ thống không hiển thị hành động xóa.
- Publish preflight chạy theo đúng `{ entity, id, locale }` trước khi publish.
- Đổi slug đã từng publish tiếp tục dùng SlugService để tạo redirect 301.

## 2. Block editor

Block editor hỗ trợ đủ 10 loại block của `doc/11_CONTENT_BLOCK_SCHEMA.md`:

1. heading
2. paragraph
3. list
4. image
5. gallery
6. table
7. external_video
8. file
9. callout
10. divider

Các invariant đã được giữ:

- Không lưu raw HTML và không nhận iframe.
- External video chỉ nhận ID hoặc URL YouTube/Vimeo, sau đó chuẩn hóa thành `provider + video_id`.
- Image/gallery chỉ tham chiếu `media_id`; file chỉ tham chiếu `document_id`.
- Reorder bằng kéo-thả chuột, nút lên/xuống và `Alt + ArrowUp/ArrowDown` trên handle.
- Nhân đôi block chỉ tồn tại trong form và luôn tạo block ID mới.
- Editor span giữ marks và liên kết nội bộ, HTTPS hoặc anchor.
- Preview nội bộ render React có cấu trúc, không dùng `dangerouslySetInnerHTML` và không tạo iframe.
- Dịch vụ có FAQ editor riêng.

Spike round-trip đã chứng minh chuỗi sau deep-equal khi người dùng không sửa:

```text
API ContentBlock[] → editor state → serialize → ContentBlock[]
```

ID, marks, links, media/document reference và thứ tự đều được giữ nguyên.

## 3. Backend và contract

- Thêm shared contract `admin.content.ts` cho entity, full translation, relation, media và write request.
- Detail API của page/service/project/post trả `kind`, entity, đầy đủ bản dịch VI/EN, relation và media.
- Project/post DAO có `findMedia()` theo `display_order`, giúp form mở lại không mất thư viện media.
- DTO content áp `validateContentField()` theo từng field allowlist; không còn tình trạng mọi block hợp lệ về hình dạng đều được ghi vào mọi trường.
- `.env` cục bộ được bổ sung `ADMIN_SITE_URL=http://localhost:3002` và sửa khoảng trắng sai trong `INQUIRY_RECIPIENT`, vì lỗi đó từng chặn backend khởi động.

## 4. UX và an toàn dữ liệu

- Cấu hình chung và nội dung dịch có nút lưu riêng, tránh ghi đè ngoài ý muốn.
- VI và EN dùng hai state độc lập; đổi tab không clone hoặc merge bản dịch.
- Unsaved-change guard theo dõi cấu hình chung và từng locale.
- Dự án ở chế độ `customer_visibility=public` hiển thị cảnh báo NDA/quyền công bố rõ ràng.
- RelationSelector được tái sử dụng cho sản phẩm, hãng, ngành, dịch vụ, dự án và media.
- MediaPicker được tái sử dụng cho ảnh đại diện, image block và gallery block.
- Form tạo nhanh chỉ tạo khung draft tối thiểu rồi chuyển sang editor đầy đủ.

## 5. Bằng chứng kiểm thử

| Cổng kiểm tra | Kết quả |
|---|---:|
| Admin A3 editor tests | 3/3 pass |
| Backend A3 DTO allowlist tests | 3/3 pass |
| Backend A3 detail read-model test | 1/1 pass |
| Toàn bộ admin tests | 20/20 pass |
| Toàn bộ backend tests không cần DB | 202/202 pass |
| PostgreSQL translation/content/slug/admin integration | 84/84 pass |
| Admin ESLint | pass |
| Admin + backend TypeScript | pass |
| Production build toàn workspace | pass |

Production build đã qua cho contracts, database package, backend, admin, public frontend và worker.

Browser QA xác nhận `/content/pages` bị session gate chuyển đúng sang
`/login?next=%2Fcontent%2Fpages`, login/setup render đúng và backend/admin khởi động thành công trên cổng
3001/3002. Phiên browser không có mật khẩu của tài khoản admin cục bộ nên không tạo hoặc thay đổi tài khoản chỉ để
vượt auth gate; phần editor được nghiệm thu bằng component/schema test, TypeScript, lint và production build.

## 6. Bước tiếp theo

Tiếp tục A4 — Inquiry inbox, homepage sections, banner, menu/footer, khách hàng, văn phòng, redirect,
settings và quản trị tài khoản.
