# 02 — STRATEGY OPTIONS & RECOMMENDATION

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Mục tiêu: chọn cách **tổ chức trình tự triển khai**. So sánh ≥2 chiến lược, chọn 1 khuyến nghị, giải thích hybrid **cụ thể là phần nào foundation-first, phần nào vertical slice**.

---

## 1. Ba chiến lược

### Phương án A — Platform / Foundation First
Xây theo lớp ngang: tooling → DB/migrations → auth/users/settings → media → catalogue → content → inquiry → admin → public → integration. Mỗi lớp làm xong toàn bộ trước khi lên lớp trên.

### Phương án B — Vertical Slice
Mỗi nhóm chức năng đi trọn một luồng **DB → API → Admin → Public FE** rồi mới sang nhóm khác: brand slice → product category slice → product slice → inquiry slice → content slice.

### Phương án C — Hybrid (khuyến nghị)
Foundation-first cho phần **nền chung không có giá trị demo độc lập**; vertical slice cho phần **có luồng demo được**; cross-cutting để cuối.

---

## 2. Bảng so sánh

| Tiêu chí | Foundation First (A) | Vertical Slice (B) | Hybrid (C) |
|---|---|---|---|
| Phát hiện rủi ro sớm | Trung bình — rủi ro tích hợp lộ muộn | Cao — chạm mọi lớp sớm | **Cao** — nền lộ rủi ro hạ tầng sớm, slice lộ rủi ro tích hợp sớm |
| Dễ kiểm thử | Cao ở mỗi lớp, khó test luồng đầu-cuối sớm | Cao cho luồng, khó test khi nền chưa vững | **Cao** — nền vững rồi test luồng theo slice |
| Dễ demo | Thấp — không có gì "chạy được" cho tới muộn | Cao — mỗi slice demo được | **Cao** — từ P4 mỗi slice demo được |
| Phụ thuộc dữ liệu | Rõ ràng theo lớp | Khó — slice sau cần dữ liệu slice trước (product cần brand) | **Rõ** — foundation cấp dữ liệu, slice theo thứ tự phụ thuộc |
| Khả năng rollback | Dễ theo lớp | Dễ theo slice | **Dễ** — nền theo migration/phase, slice theo module |
| Phù hợp 2 AI | Trung bình — dễ nghẽn ở lớp nền chung | Tốt — chia slice cho 2 AI | **Tốt** — nền 1 AI làm, slice chia 2 AI |
| Nguy cơ tích hợp muộn | **Cao** (FE↔API dồn cuối) | Thấp | **Thấp** — FE scaffold theo OpenAPI song song |

---

## 3. Ràng buộc quyết định chiến lược (từ tài liệu)

1. **Schema lên một khối (ADR-013).** Baseline 001–070 là **một chuỗi migration duy nhất, đóng băng sau lần chạy shared env đầu**. Không thể tạo "DB riêng cho từng slice" — toàn bộ 63 bảng phải lên ở P1. ⇒ **Lớp DB buộc phải foundation-first.**
2. **`media` + `users` là dependency cứng của gần như mọi module** (RESTRICT + created_by/updated_by). ⇒ Media/core buộc foundation-first.
3. **`products` phụ thuộc `brands` (NOT NULL) + `product_categories` + `standards`/`applications`/`industries`.** ⇒ Không thể làm product slice trước taxonomy slice.
4. **SEO/navigation/homepage/search phụ thuộc gần toàn bộ catalogue+content.** ⇒ Buộc là cross-cutting cuối.
5. **SlugService/redirect + PublishService + locale rules là service lõi dùng chung.** ⇒ Phải có khung ở foundation, hoàn thiện khi làm entity đầu tiên có slug (brands).

Kết luận: **thuần A** đẩy tích hợp FE↔API về cuối (rủi ro muộn); **thuần B** không khởi động được vì DB+auth+media là tiền đề chung và không chia nhỏ được. **Hybrid** là lựa chọn duy nhất khả thi và tối ưu.

---

## 4. Hybrid — CỤ THỂ phần nào foundation-first, phần nào vertical slice

### 4.1. Foundation-first (Phase 0–3) — làm trước, 1 AI chủ trì (Claude)
Đây là substrate không demo độc lập được nhưng mọi slice cần:
- **P0** Technology decisions + repo/tooling/CI skeleton.
- **P1** DB baseline **001–070** (một khối) + rollback + seed tối thiểu.
- **P2** Core: config/env, error handler + mã lỗi, logging + X-Request-ID, **auth** (Argon2id/JWT cookie/CSRF/CORS/rate-limit/reset), users, settings, health `/live`+`/ready`, structured audit log. **Khung** SlugService/PublishService/QueryPort/locale-condition (interface, hoàn thiện ở slice đầu).
- **P3** Media & storage: upload an toàn + MediaUsageService + storage adapter.

### 4.2. Vertical slice (Phase 4–7) — mỗi slice DB-đã-có → API → Admin → Public FE, chia 2 AI
Thứ tự slice theo **đồ thị phụ thuộc**:
- **P4 Taxonomy slice(s):** brands (hoàn thiện SlugService + locale rules ở đây vì brand là entity slug + locale-status đầu tiên) → product_categories → standards → applications → industries. Các slice này **độc lập nhau** → song song 2 AI.
- **P5 Product slice (nút thắt):** products + translations/specs/6 bảng link + PublishService hoàn chỉnh + **filter builder (OR/AND)** + product search pg_trgm + discontinued + `GET /products/landing`. Đây là slice phức tạp nhất → Claude chủ trì service lõi, Codex review.
- **P6 Content slices:** pages · services · projects · posts(+post_categories) · documents · customers · offices + external_video block. **Độc lập nhau** sau khi có media+taxonomy → song song 2 AI.
- **P7 Inquiry slice:** inquiries + inquiry_outbox + **worker SKIP LOCKED + reaper** + idempotency + Message-ID + email sanitize + CAPTCHA + rate-limit.

### 4.3. Cross-cutting cuối (Phase 8–11)
- **P8** Navigation (mega menu auto-generated) · homepage (sections cố định) · redirect middleware · **module seo** (sitemap/robots/hreflang/canonical+robots resolver/structured data).
- **P9** Admin frontend (toàn bộ màn 07) — bắt đầu **scaffold sớm** từ P4 theo OpenAPI.
- **P10** Public frontend (SSR trang P0 theo 02/08) — bắt đầu **scaffold sớm** từ P4.
- **P11** Integration + security + performance + a11y + release.

### 4.4. Cơ chế giảm rủi ro tích hợp muộn
- **OpenAPI contract (B8) là hợp đồng.** Ngay khi một slice định nghĩa API (P4+), Admin/Public FE scaffold màn hình tương ứng song song → FE không dồn về cuối.
- **Contract test** đối chiếu implement với OpenAPI ở mỗi phase (xem `06`).

---

## 5. Vì sao KHÔNG chọn thuần A hay thuần B

- **Không thuần A:** dù nền vững, để toàn bộ Admin/Public FE đến P9–P10 mới bắt đầu sẽ giấu rủi ro tích hợp (locale-status hiển thị, filter UI↔query, form idempotency, SEO canonical) tới sát release — trái mục tiêu "phát hiện rủi ro sớm".
- **Không thuần B:** không có slice nào khởi động được khi chưa có schema (một khối), auth, media. Và product slice không thể trước taxonomy. Vertical thuần vỡ ngay ở dependency.

---

## 6. Kết luận

**Chọn Hybrid (C):** foundation-first P0–P3, vertical slice P4–P7 (chia 2 AI theo module độc lập), cross-cutting P8–P11 với FE scaffold sớm theo OpenAPI. Critical path và chi tiết phase ở `03`/`04`.
