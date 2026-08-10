# Website LT Vietnam

Monorepo cho website B2B song ngữ của **Công ty TNHH Công nghệ LT Việt Nam**. Hệ thống gồm
website công khai, REST API quản trị/nội dung, PostgreSQL và worker xử lý email outbox.

## Trạng thái hiện tại

- Backend F1–F8 đã hoàn tất: **198/198 endpoint**, trong đó F8 có 136 endpoint quản trị.
- PostgreSQL có **38/38 migration** đã được kiểm tra và áp dụng trên môi trường local.
- Frontend công khai W0–W8 đã hoàn tất; crawler web đạt **380/380**, responsive đạt **11/11**
  và Lighthouse đạt 99 Performance / 100 Accessibility trên các trang trọng yếu.
- Quality gate tĩnh và production build đều đạt. Lần chạy integration test đầy đủ gần nhất đạt
  **665/668**; ba lỗi còn lại là một ca SiteService vượt timeout khi chạy song song và hai lỗi
  dây chuyền từ chính ca timeout đó.
- UI quản trị chưa được triển khai; backend quản trị và hợp đồng API đã sẵn sàng cho phase tiếp theo.

Chi tiết đo đạc và các giới hạn còn lại:

- [Trạng thái hiện tại](doc/14_TRANG_THAI_HIEN_TAI.md)
- [Báo cáo rà soát F1–F8](doc/15_BAO_CAO_RA_SOAT_F1_F8.md)
- [Báo cáo dọn dẹp cấu trúc](doc/16_BAO_CAO_DON_DEP_CAU_TRUC.md)
- [Báo cáo nghiệm thu frontend W0–W8](doc/20_BAO_CAO_NGHIEM_THU_FRONTEND_W0_W8.md)

## Cấu trúc repository

```text
backend/                 NestJS API, DAO, service và test
frontend/                Next.js public site; UI admin là phase tiếp theo
worker/                  Email outbox worker
packages/
  config/                Xác thực biến môi trường dùng chung
  contracts/             Hợp đồng API và view model dùng chung
  db/                    Migration runner và kiểu schema Kysely
  testing/               Tiện ích integration test
scripts/                 Setup local, smoke test và schema verification
doc/                     Thiết kế, ADR, trạng thái và báo cáo
planning/implementation/ Kế hoạch v1.0 đã khóa cùng hồ sơ gate
implementation/evidence/ Bằng chứng kiểm chứng lịch sử
```

Các file lịch sử không dùng để vận hành được đặt trong `doc/archive/` hoặc
`implementation/evidence/`; không đặt artefact P0 cũ ở root hay trong `scripts/` hoạt động.

## Khởi động local

Yêu cầu: Node.js 22–24, pnpm 10 và Docker Desktop/Engine.

```bash
node scripts/local-up.mjs
```

Script trên tạo `.env` nếu chưa có, chọn cổng PostgreSQL còn trống, cài dependency, build các
package dùng chung, chạy migration và seed khởi tạo. Sau đó mở các terminal riêng:

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:worker
```

Mặc định backend ở `http://localhost:3001`, frontend ở `http://localhost:3000`.

## Các lệnh chính

```bash
pnpm test                    # toàn bộ unit + integration test
pnpm typecheck               # build package dependency rồi kiểm TypeScript toàn workspace
pnpm lint                    # ESLint
pnpm format:check            # Prettier
pnpm build                   # production build
pnpm clean                   # dừng dev server trước; giữ dependency, .env và dữ liệu local

pnpm db:migrate              # áp dụng migration còn thiếu
pnpm db:status               # trạng thái migration
pnpm db:seed                 # seed khởi tạo tối thiểu
pnpm db:seed:demo            # dữ liệu demo idempotent

pnpm smoke:api               # backend phải đang chạy
pnpm smoke:auth              # backend phải đang chạy
pnpm smoke:web               # backend + frontend production phải đang chạy
pnpm smoke:responsive        # kiểm viewport, bàn phím và focus bằng Chromium
pnpm quality:web             # kiểm ngân sách JavaScript sau next build
pnpm measure:web             # đo Lighthouse trên frontend đang chạy
```

## Nguồn sự thật kỹ thuật

Khi có mâu thuẫn, ưu tiên ADR và tài liệu thiết kế hiện hành trong `doc/`, sau đó đến contracts
và mã nguồn đã được test. Các điểm bắt đầu quan trọng:

1. [README tài liệu thiết kế](doc/00_README_TAI_LIEU_THIET_KE.md)
2. [ADR quyết định kiến trúc](doc/09_ADR_QUYET_DINH_KIEN_TRUC.md)
3. [Kiến trúc backend và API](doc/06_KIEN_TRUC_BACKEND_VA_API.md)
4. [Kế hoạch hoàn thiện backend](doc/12_KE_HOACH_HOAN_THIEN_BACKEND.md)
5. [Trạng thái hiện tại](doc/14_TRANG_THAI_HIEN_TAI.md)

`planning/implementation/v1.0/`, manifest lịch sử, workflow Gate B và các evidence package là
hồ sơ đã khóa hoặc có tham chiếu kiểm chứng. Không xóa chúng chỉ vì không được import lúc chạy.

## Lưu ý môi trường

- Không commit `.env` hoặc credential.
- Phải đặt `INQUIRY_RECIPIENT` thành địa chỉ nhận inquiry hợp lệ trước khi triển khai.
- Production yêu cầu SMTP và CAPTCHA thật theo kiểm tra trong `@ltv/config`.
- Media local nằm ngoài Git và được tạo qua Docker Compose.
