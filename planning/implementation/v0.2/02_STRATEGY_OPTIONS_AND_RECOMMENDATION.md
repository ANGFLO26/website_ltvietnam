# 02 — STRATEGY OPTIONS & RECOMMENDATION

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

Giữ khuyến nghị **Hybrid** nhưng hiệu chỉnh theo audit (HI-05/HI-06): P4–P7 là **thin vertical thật** (có UI + E2E), P9/P10 là **completion**, P8 là **convergence**, P7 **parallel**, content migration **song song**.

---

## 1. Ba chiến lược (giữ so sánh v0.1) + ràng buộc bổ sung

Foundation-First (A) · Vertical Slice (B) · **Hybrid (C, chọn)**. Bảng so sánh 7 tiêu chí giữ nguyên (`v0.1/02` §2).

**Ràng buộc quyết định chiến lược — bổ sung (audit):**
1. Schema lên **một khối** (ADR-013/D5) ⇒ DB foundation-first (giữ).
2. `media`+`users` dependency cứng (giữ).
3. `products` phụ thuộc taxonomy (giữ).
4. **Request/redirect/SEO topology là nút thắt kiến trúc TRƯỚC cả P4** (CR-01) ⇒ phải chốt ở P0, redirect delivery chứng minh từ **P4**.
5. **Content migration** phụ thuộc dữ liệu thật + quyền site cũ ⇒ workstream song song, không nhét vào một phase.
6. **Deploy compatibility** (generated-client/mixed-version) ⇒ tooling từ P0.
7. **Thin UI mỗi slice** ⇒ FE không dồn về cuối (sửa HI-05).

## 2. Hybrid — CỤ THỂ (đã hiệu chỉnh)

### 2.1. Foundation-first (P0–P3) — Claude chủ trì
- **P0** tech decisions (D1–D16) + **Git integrity** + skeleton monorepo + codegen/compat tooling.
- **P1** raw SQL baseline 001–070 + manifest/checksum + **3 seed pipeline**.
- **P2** core: config→logging→DB, auth (one-way port), settings, **health probe registry**, audit log.
- **P3** media + storage + **ContentBlock/ExternalVideo/Sanitization validator** (chuyển sớm — HI-04) + thin Admin media UI.

### 2.2. Thin vertical slice (P4–P7) — mỗi slice có UI + E2E (sửa HI-05)

| Slice | Minimal Admin | Minimal Public route | Browser E2E bắt buộc |
|---|---|---|---|
| **P4 Taxonomy** | brand/category create/edit/publish; applications phẳng | brand list `/hang-doi-tac`, hồ sơ hãng; product-list theo taxonomy route (`/san-pham/danh-muc/{slug}`) | tạo brand draft→publish→hiển thị; **đổi slug → 301 qua topology thật**; EN chưa publish không fallback |
| **P5 Product** | product create/edit/publish (multi-section tối thiểu) | landing `/san-pham`, list `/san-pham/tat-ca`, detail `/san-pham/{slug}` | tạo product (Tên VI+Hãng+Danh mục chính)→publish→hiển thị; lọc `(PAC OR Herzog) AND ASTM D86`; search |
| **P6A Content core** | pages/services/projects/posts/documents/customers/offices create/edit/publish | mỗi entity có detail route tối thiểu | publish mỗi entity → hiển thị; document download slug |
| **P6B Relationships** | relation selectors (replace-set) | related sections render | PATCH replace-set; related hiển thị |
| **P7 Inquiry** | dashboard `email_failed` widget | InquiryModal/ContactForm | SMTP OK/lỗi/retry/idempotency |

> **P4 taxonomy P0 = chỉ product-list landing theo taxonomy URL** (ME-04). Rich taxonomy detail page = **P1** (out-of-scope P0).

### 2.3. Convergence + Completion
- **P8 (convergence, no new search — ME-02):** navigation/homepage/redirect delivery/SEO resolver/root sitemap-robots. Nhiều route-rule task **bắt đầu từ P4**; P8 chỉ hội tụ.
- **P9 Admin Completion / P10 Public Completion:** hoàn thiện editor/component/a11y/perf trên **thin UI đã có** (không bắt đầu FE). No Users CRUD, no auto-save advanced (HI-15/16).
- **P11** content delta/hardening/release.

### 2.4. Chống rủi ro tích hợp muộn & rollback (bổ sung audit)
- **OpenAPI + generated client** là hợp đồng; CI **breaking-change detection + client freshness + consumer smoke + mixed-version** (không chỉ shape hiện tại — HI-21/B26).
- **Redirect/SEO topology** chứng minh sớm (P4 redirect proof) — CR-01.
- **Content migration** CM0–CM4 song song, validation gate trước P10.

## 3. Vì sao Hybrid hiệu chỉnh tốt hơn v0.1

- Loại **cycle P8/P10** (HI-06): P8 web delivery đứng **trước** P10 completion.
- UI/routing risk xuất hiện **đúng trong slice** (thin UI P4–P7), không dồn P9/P10.
- Tách **fan-in P6** (P6A/P6B) cho phép song song an toàn (HI-07).
- **P7 song song** sau P5 + service core (không ép P7→P8 tuần tự — HI-04/§I4 audit).
- Giữ DB foundation-first (ADR-013).
- Đưa **content migration + operability** vào đường release thật (HI-12/HI-13).

## 4. Kết luận
Hybrid (foundation P0–P3 + thin vertical P4–P7 + convergence P8 + completion P9/P10 + release P11), content migration song song. Critical path & phase chi tiết `03`/`04`; topology `12`.
