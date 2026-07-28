# Website LT Vietnam

Website doanh nghiệp B2B của **Công ty TNHH Công nghệ LT Việt Nam**, phục vụ giới thiệu năng lực, hãng đối tác, sản phẩm, dịch vụ kỹ thuật, dự án, tài liệu và tiếp nhận yêu cầu liên hệ từ khách hàng.

> **Trạng thái hiện tại:** Gate A: **PASSED**; Gate B: **PASSED**; P0: **AUTHORIZED**. Implementation Plan v1.0 là kế hoạch triển khai đang hoạt động. P0 implementation: **NOT YET STARTED**; repository chưa có application scaffold.

## Mục tiêu MVP

- Website công khai song ngữ Việt/Anh.
- Trang giới thiệu công ty, sản phẩm, hãng, dịch vụ, dự án, bài viết và tài liệu.
- Bộ lọc và tìm kiếm trong phạm vi sản phẩm.
- Form yêu cầu liên hệ lưu vào PostgreSQL trước khi gửi email qua outbox worker.
- Trang quản trị nội dung dành cho một nhóm Admin duy nhất trong MVP.
- Không có giỏ hàng, thanh toán trực tuyến, tài khoản khách hàng hoặc CRM quản lý inquiry trong phiên bản đầu.

## Kiến trúc đã chốt

- **Frontend:** Next.js — một ứng dụng cho Public và `/admin`.
- **Backend:** NestJS modular monolith, REST API `/api/v1`.
- **Worker:** tiến trình riêng xử lý outbox/email.
- **Database:** PostgreSQL 16.
- **Runtime data access:** Kysely và raw SQL cho các hành vi PostgreSQL đặc thù.
- **Repository:** pnpm monorepo.
- **Triển khai MVP:** một VPS cố định với Docker Compose và Nginx/Caddy.
- **Media:** tách `public-media/` và `protected-documents/`; tài liệu được kiểm tra quyền công khai qua backend.

Kiến trúc chi tiết và các quyết định bắt buộc nằm trong [Implementation Plan v1.0](planning/implementation/v1.0/00_IMPLEMENTATION_PLAN_OVERVIEW.md).

## Cấu trúc repository

```text
website_ltvietnam/
├── README.md
├── doc/                              # Bộ tài liệu thiết kế Approved v1.2.1
│   ├── 00_README_TAI_LIEU_THIET_KE.md
│   ├── 01_PHAM_VI_CHUC_NANG_VA_MVP.md
│   ├── ...
│   ├── 10_CHANGELOG_DONG_BO_TAI_LIEU.md
│   ├── archive/
│   └── verify/                       # SQL verification PostgreSQL 16
├── implementation/
│   └── evidence/
│       ├── README.md
│       └── 151570b8d85cfdbd34fe66ab295750edaa2d99ae/
│           └── gate-b-final/         # Bằng chứng Gate B cuối
└── planning/
    └── implementation/
        ├── README.md                 # Chỉ mục kế hoạch triển khai
        ├── GATE_STATUS.md            # Trạng thái gate hiện hành (nguồn sự thật)
        ├── v1.0/                     # Kế hoạch triển khai hoạt động duy nhất
        ├── history/                  # Manifest, verifier và tag governance
        └── reviews/
            ├── gb-02/                # Hồ sơ Gate B cuối
            └── v1.0-assembly/        # Báo cáo assembly (v1.0 liên kết trực tiếp)
```

Các ứng viên kế hoạch `v0.1`–`v0.4.1` không thuộc cây hoạt động sau khi v1.0 được phê duyệt. Lịch sử vẫn được bảo toàn trong Git và tag `planning-history-v0.1-v0.4.1`. Thư mục `reviews/v1.0-assembly/` được giữ lại như tài liệu hỗ trợ không hoạt động vì tài liệu v1.0 được bảo vệ còn liên kết trực tiếp đến các báo cáo assembly.

## Nguồn sự thật

Khi có mâu thuẫn, sử dụng thứ tự ưu tiên:

```text
ADR
→ Phạm vi MVP
→ PostgreSQL Schema
→ ERD
→ Mô hình dữ liệu
→ Backend/API
→ Admin Wireframe
→ Public Frontend Wireframe
→ Implementation decisions D1–D20
→ Implementation Plan v1.0
```

Bắt đầu đọc tại:

1. [README bộ tài liệu thiết kế](doc/00_README_TAI_LIEU_THIET_KE.md)
2. [ADR quyết định kiến trúc](doc/09_ADR_QUYET_DINH_KIEN_TRUC.md)
3. [Phạm vi chức năng và MVP](doc/01_PHAM_VI_CHUC_NANG_VA_MVP.md)
4. [Implementation Plan v1.0](planning/implementation/v1.0/00_IMPLEMENTATION_PLAN_OVERVIEW.md)
5. [Phases và critical path](planning/implementation/v1.0/04_PHASES_MILESTONES_AND_CRITICAL_PATH.md)
6. [Definition of Ready/Done](planning/implementation/v1.0/07_DEFINITION_OF_READY_AND_DONE.md)

## Phạm vi triển khai

### P0 — MVP

- Auth và hồ sơ Admin; không có Users CRUD.
- Quản lý media, nội dung, taxonomy, sản phẩm, dịch vụ, dự án, bài viết và tài liệu.
- Public website, điều hướng, SEO, sitemap/robots và redirect 301.
- Product-only search; không site-wide search.
- Inquiry API, idempotency, outbox worker và reconciliation.
- Content migration CM0–CM4.

### Ngoài P0

- Phân quyền nhiều vai trò.
- Site-wide search và facet count.
- Scheduled publishing và auto-save nâng cao.
- Upload video.
- Inquiry CRM/Admin UI.
- Ecommerce, giỏ hàng và thanh toán.

## Lộ trình triển khai

```text
Pre-P0 → P0 → P1 → P2 → P3 → P4 → P5 → P6A → P6B → P8 → P10 → P11
                                              └── P7 chạy song song
```

- **P0:** repository, tooling, CI, monorepo skeleton và spike redirect 301.
- **P1:** materialize migration SQL 001–070 và migration runner.
- **P2–P3:** core/auth/readiness/media/security.
- **P4–P7:** các thin vertical nghiệp vụ.
- **P8–P10:** hội tụ Web/Admin/Public.
- **P11:** hardening, migration nội dung và release.

## Điều kiện trước khi bắt đầu code

Implementation Plan đã qua Gate A và Gate B. P0 đã được cho phép triển khai nhưng chưa bắt đầu; repository chưa có application scaffold. Khi P0 bắt đầu, implementer phải tuân thủ baseline, Definition of Ready và các điều kiện evidence đã được Gate B xác minh.

Không coi một phase hoàn tất nếu thiếu raw test/evidence artifact theo [Test and Quality Strategy](planning/implementation/v1.0/06_TEST_AND_QUALITY_STRATEGY.md).

## Quy tắc đóng góp

- Không tự ý thay đổi Approved scope, schema hoặc URL.
- Module chỉ giao tiếp qua service/query port; không truy cập repository của module khác.
- Mọi thay đổi API phải giữ tương thích `/api/v1` hoặc có kế hoạch version/deprecation rõ ràng.
- Baseline migration 001–070 không được sửa sau khi freeze; schema mới dùng migration `071+`.
- Implementer không tự approve PR của chính mình.
- Mọi PR phải kèm test, evidence và rollback/forward-fix phù hợp.

## Tình trạng triển khai

> Trạng thái gate hiện hành nằm ở [`planning/implementation/GATE_STATUS.md`](planning/implementation/GATE_STATUS.md). Các file trong `planning/implementation/v1.0/` bị khóa hash nên vẫn mang header `Gate B: NOT MET` của ngày phát hành 2026-07-25; khi mâu thuẫn, `GATE_STATUS.md` thắng.

| Hạng mục | Trạng thái |
|---|---|
| Tài liệu thiết kế v1.2.1 | Approved |
| PostgreSQL 16 verification | Passed |
| Implementation Plan v1.0 | Approved — Planning Complete |
| Gate A | Passed |
| Gate B | Passed |
| P0 | Authorized |
| P0 implementation | Not yet started |
| Application scaffold | Chưa tồn tại |
| Source code ứng dụng | Chưa triển khai |
| Production | Chưa triển khai |
