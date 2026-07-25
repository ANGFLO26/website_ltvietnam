# 02 — STRATEGY OPTIONS AND RECOMMENDATION

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

## 1. Ba phương án

### A — Foundation First

Xây theo lớp ngang: Pre-P0/Gate B → tooling → DB/migrations → core/auth/settings → media → catalogue → content → inquiry → Admin/Public → integration/release.

**Ưu:** dependency và migration rõ, nền dùng chung ổn định, rollback theo layer dễ. **Nhược:** UI/API integration và business feedback xuất hiện muộn; có thể che lỗi locale/filter/redirect đến cuối.

### B — Vertical Slice

Mỗi capability đi trọn DB → API → minimal Admin → minimal Public → E2E trước khi sang capability tiếp theo.

**Ưu:** demo và E2E sớm, feedback nhanh, dễ chia ownership. **Nhược:** không phù hợp baseline schema nguyên khối; slice product không thể đi trước auth/media/taxonomy; dễ tái tạo foundation nhiều lần.

### C — Hybrid — lựa chọn

Foundation-first cho substrate không có giá trị demo độc lập; thin vertical cho capability nghiệp vụ; convergence/completion cho các consumer dùng nhiều module; migration nội dung chạy song song.

## 2. So sánh theo tiêu chí

| Tiêu chí | Foundation First | Vertical Slice | Hybrid |
|---|---|---|---|
| Rủi ro hạ tầng sớm | Cao khả năng phát hiện | Trung bình | **Cao** qua P0–P3 |
| Rủi ro tích hợp sớm | Thấp | Cao | **Cao** từ P4 thin UI/E2E |
| Phù hợp schema 001–070 nguyên khối | **Cao** | Thấp | **Cao** qua P1 foundation |
| Demo/feedback | Muộn | Sớm | **Sớm từ P4** |
| Dependency product→taxonomy | Dễ quản lý | Dễ mắc kẹt | **Sequence rõ P4→P5** |
| Rollback | Theo layer | Theo slice | **Theo side-effect của foundation và slice** |
| Chia ownership | Foundation dễ nghẽn | Tốt theo slice | **Foundation owner rõ + slice song song** |
| Nguy cơ FE dồn cuối | Cao | Thấp | **Thấp nhờ thin UI + OpenAPI** |
| Content migration thật | Dễ bị dồn release | Có thể lẫn feature work | **CM0–CM4 song song** |
| Operability/compatibility | Có thể tốt nhưng muộn | Dễ phân mảnh | **Tooling P0, evidence mỗi phase** |

## 3. Ràng buộc quyết định

1. Baseline 001–070/63 bảng phải materialize thành một chuỗi ở P1; không chia DB theo slice.
2. Users/identity, config/logging/DB, media và StoragePort là dependency nền.
3. Product bắt buộc sau brands + product categories + standards + applications + industries.
4. Route resolution/redirect/SEO topology phải được khóa ở P0 và chứng minh 301 từ P4.
5. Content migration cần dữ liệu/quyền thật, nên CM0–CM4 song song thay vì nhét vào một phase.
6. Deploy compatibility cần OpenAPI breaking check, generated-client freshness và mixed-version smoke từ sớm.
7. Inquiry P7 có thể chạy song song khi product + service core đủ, không tạo hard edge P7→P8.

## 4. Hybrid cụ thể

- **Pre-P0:** User/operator khôi phục hoặc init Git được phê duyệt; Gate B verify.
- **P0–P3 foundation:** repository/tooling/spike; materialize DB; core/auth/Model B readiness; media/security/Semantics A.
- **P4–P7 thin vertical:** taxonomy, product, content core/relations, inquiry; mỗi slice có minimal Admin, minimal Public và browser E2E. P7 song song.
- **P8 convergence:** navigation, homepage, redirect delivery và SEO; không thêm search.
- **P9/P10 completion:** hoàn thiện các thin UI hiện có; không bắt đầu frontend từ đầu.
- **P11 release:** hardening, restore, reconciliation, CM4 và go-live approval.
- **CM0–CM4:** song song P4–P11; C7 trước CM0 thực.

## 5. Thin vertical acceptance

| Slice | Minimal Admin | Minimal Public | E2E bắt buộc |
|---|---|---|---|
| P4 Taxonomy | Create/edit/publish brand/category; applications phẳng | Brand list/profile; taxonomy product-list landing | Draft→publish; EN no fallback; rename→explicit 301 trước render |
| P5 Product | Multi-section create/edit/publish | Landing/list/detail/filter/product search | Publish; `(PAC OR Herzog) AND ASTM D86`; no-N+1 |
| P6A/P6B Content | Entity editor + relation selector | Detail/download/related | Publication, document gate, replace-set concurrency |
| P7 Inquiry | Operational failed/reconciliation view only | InquiryModal/ContactForm | DB+outbox→202 khi dependencies degraded; atomic idempotency; retry/reconcile |

## 6. Trade-off và điều kiện đổi chiến lược

Hybrid chấp nhận chi phí duy trì foundation contracts và thin UI đồng thời để giảm rủi ro tích hợp muộn. Không đổi sang Foundation First chỉ vì một slice chậm; không đổi sang Vertical Slice thuần vì schema/dependency không cho phép.

Chỉ xem xét đổi nếu có evidence mới làm thay đổi constraint cốt lõi, ví dụ Approved architecture/schema thay đổi, deployment chuyển sang distributed multi-instance, hoặc framework spike chứng minh topology không thể thực hiện. Mọi thay đổi như vậy cần user decision và quy trình thiết kế tương ứng; phase tuning/đổi owner không phải đổi strategy.

## 7. Kết luận

Giữ **Hybrid**, 25 modules, 13 phase labels, P6A/P6B, P7 parallel và product-only search. Đây là strategy normative của baseline v1.0.
