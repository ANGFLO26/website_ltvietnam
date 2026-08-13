# Website LT Vietnam

Monorepo cho website B2B song ngữ của **Công ty TNHH Công nghệ LT Việt Nam**. Hệ thống gồm
website công khai, REST API quản trị/nội dung, PostgreSQL và worker xử lý email outbox.

---

# PHẦN A — CHẠY DỰ ÁN

## A1. Cần cài sẵn

| Thứ     | Phiên bản           | Ghi chú                                              |
| ------- | ------------------- | ---------------------------------------------------- |
| Node.js | 22.11 – 24.x        | `engines` trong `package.json` chặn ngoài khoảng này |
| pnpm    | 10.34.5             | `packageManager` đã ghim; `corepack enable` là đủ    |
| Docker  | Desktop hoặc Engine | Chỉ dùng để chạy PostgreSQL 16                       |

## A2. Khởi động lần đầu

```bash
node scripts/local-up.mjs
```

Một lệnh này lo: tạo `.env` nếu chưa có → chọn cổng PostgreSQL còn trống → dựng container
Postgres → cài dependency → build các package dùng chung → chạy migration → seed khởi tạo.

Sau đó mở **bốn** terminal riêng:

```bash
pnpm dev:backend     # http://localhost:3001
pnpm dev:frontend    # http://localhost:3000
pnpm dev:admin       # http://localhost:3002
pnpm dev:worker      # gửi email outbox, không có cổng
```

Trên Windows có sẵn `run-backend.cmd`, `run-frontend.cmd`, `run-admin.cmd`.

> `dev:worker` chỉ cần khi muốn thử luồng gửi email. Website và admin chạy được mà không có nó —
> yêu cầu báo giá vẫn được lưu, chỉ là email nằm chờ trong hàng đợi.

## A3. Nạp dữ liệu sản phẩm

Với dữ liệu thật, nạp lần lượt hai nhóm sản phẩm:

```bash
# 17 dòng máy Lab — Herzog / ISL / Phase / PAC
pnpm --filter @ltv/backend seed:lab

# 28 dòng Valve — Masoneilan / Consolidated
pnpm db:seed:valves
```

Chỉ dùng dữ liệu demo trên cơ sở dữ liệu thử nghiệm chưa có dữ liệu thật:

```bash
pnpm db:seed:demo
```

Các script đều **idempotent** (chạy lại không nhân đôi).

> `db:seed:demo` sẽ **từ chối chạy** nếu phát hiện dữ liệu thật trong DB. Dữ liệu demo mang tên
> thật (`OptiDist`, `HVM 472`) nhưng mọi đoạn mô tả đều là văn bản thay thế — trộn lẫn hai loại
> rồi đem báo giá là rủi ro có thật, nên chốt chặn nằm trong code chứ không chỉ trong tài liệu.

Chi tiết nguồn gốc và cách xử lý dữ liệu thật: [doc/28](doc/28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md).

## A4. Tạo tài khoản quản trị đầu tiên

Hệ thống khởi đầu **không có tài khoản nào**. Mở `http://localhost:3002/setup` và điền họ tên,
email, mật khẩu (tối thiểu `MIN_PASSWORD_LENGTH` trong `.env`, mặc định **12 ký tự**).

Trang này chỉ dùng được **một lần** — sau khi đã có quản trị viên, endpoint bootstrap tự từ chối.
Từ lần sau đăng nhập tại `http://localhost:3002/login`.

## A5. Kiểm tra chạy đúng

```bash
curl http://localhost:3001/health/live           # backend còn sống
curl http://localhost:3001/health/ready          # backend + kết nối DB sẵn sàng
curl http://localhost:3001/api/v1/products       # API sản phẩm công khai
curl -I http://localhost:3002/dashboard          # phải trả 307 về /login khi chưa đăng nhập
```

> Hai đường dẫn `health` nằm **ngoài** tiền tố `/api/v1` — đó là chủ ý, để bộ cân bằng tải
> kiểm tra sức khỏe mà không phụ thuộc vào việc đổi phiên bản API.

## A6. Khi gặp trục trặc

| Hiện tượng                                       | Nguyên nhân thường gặp                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API trả **503**, log ghi `pg_code: ECONNREFUSED` | Mất kết nối PostgreSQL. Kiểm theo thứ tự: (1) Docker Desktop có đang chạy không — nếu `docker ps` báo _cannot find the pipe_ thì chính Docker đã tắt; (2) `docker ps` có thấy `ltv-postgres` không; nếu không: `docker compose up -d postgres`. Backend trả 503 thay vì sập là đúng thiết kế |
| Cổng 5432 bị chiếm                               | `local-up.mjs` tự chọn cổng khác và ghi vào `.env` — dùng đúng `DATABASE_URL` trong đó                                                                                                                                                                                                       |
| Trang sản phẩm trống                             | Chưa nạp dữ liệu, xem **A3**                                                                                                                                                                                                                                                                 |
| Không đăng nhập được admin                       | Chưa tạo tài khoản, xem **A4**                                                                                                                                                                                                                                                               |
| Ảnh sản phẩm không hiện                          | Ảnh nằm ngoài Git; chạy lại `seed:lab` và `db:seed:valves` để nạp lại đúng nhóm                                                                                                                                                                                                              |
| Sản phẩm không lên sóng                          | `PublishService` chặn khi thiếu ảnh đại diện hoặc danh mục chính — script seed in rõ lý do                                                                                                                                                                                                   |

---

# PHẦN B — LỆNH THƯỜNG DÙNG

```bash
# Kiểm tra chất lượng
pnpm typecheck               # build package dependency rồi kiểm TypeScript toàn workspace
pnpm lint                    # ESLint
pnpm format:check            # Prettier
pnpm build                   # production build
pnpm test                    # unit test; test tích hợp TỰ BỎ QUA khi chưa có DATABASE_URL
pnpm test:db                 # chạy CẢ test tích hợp (563 test) — cần PostgreSQL đang chạy
pnpm clean                   # dừng dev server trước; giữ dependency, .env và dữ liệu local

# Cơ sở dữ liệu
pnpm db:migrate              # áp dụng migration còn thiếu
pnpm db:status               # trạng thái migration
pnpm db:seed                 # seed khởi tạo tối thiểu
pnpm db:seed:demo            # dữ liệu demo (từ chối chạy nếu DB đã có dữ liệu thật)
pnpm --filter @ltv/backend seed:lab   # 17 dòng máy thật
pnpm db:seed:valves                  # 28 dòng Valve thật

# Smoke test — cần server đang chạy
pnpm smoke:api               # backend
pnpm smoke:auth              # backend
pnpm smoke:web               # backend + frontend production
pnpm smoke:responsive        # viewport, bàn phím và focus bằng Chromium
pnpm smoke:admin             # responsive + auth gate + E2E; cần fixture

# Đo lường
pnpm quality:web             # ngân sách JavaScript sau next build
pnpm measure:web             # Lighthouse trên frontend đang chạy
pnpm quality:admin           # ngân sách JS admin sau production build
pnpm measure:admin           # Lighthouse login/list/editor admin

# Fixture cho E2E admin
pnpm e2e:admin:create        # tạo tài khoản + inquiry tạm, cần biến ADMIN_SMOKE_*
pnpm e2e:admin:cleanup       # xóa chính xác fixture đã tạo

# Tiêm lỗi — chứng minh test không rỗng
pnpm inject                  # cần DATABASE_URL
```

**`pnpm test` và `pnpm test:db` khác nhau ở đâu:** test tích hợp tự bỏ qua khi không có
`DATABASE_URL`, để `pnpm test` chạy được trên máy chưa dựng DB. Hệ quả là `pnpm test` bỏ qua
**356/563** test backend. Trước khi kết luận "mọi thứ đều xanh", hãy chạy `pnpm test:db`.

---

# PHẦN C — CẤU TRÚC & TÌNH TRẠNG

## C1. Cấu trúc repository

```text
admin/                   Next.js admin riêng, chạy tại cổng 3002
backend/                 NestJS API, DAO, service và test
frontend/                Next.js website công khai
worker/                  Email outbox worker
packages/
  config/                Xác thực biến môi trường dùng chung
  contracts/             Hợp đồng API và view model dùng chung
  db/                    Migration runner và kiểu schema Kysely
  testing/               Tiện ích integration test
scripts/                 Setup local, smoke test và schema verification
doc/                     Thiết kế, ADR, trạng thái và báo cáo
doc/data/lab-products/   Dữ liệu sản phẩm Lab + công cụ chuẩn hóa
doc/data/valve-products/ Dữ liệu nguồn và manifest sản phẩm Valve
planning/implementation/ Kế hoạch v1.0 đã khóa cùng hồ sơ gate
implementation/evidence/ Bằng chứng kiểm chứng lịch sử
```

Chỉ `admin`, `backend`, `frontend`, `worker` và `packages` là mã chạy của sản phẩm. `planning`
và `implementation` là hồ sơ kiểm chứng được CI/tài liệu tham chiếu; `doc/archive` là lịch sử đã
đóng băng. Các hồ sơ này có mã băm (`SHA256SUMS.txt`, `RELEASE_MANIFEST.md`) nên **không xóa**
chỉ vì chúng không được import lúc chạy. `node_modules`, `.next`, `dist` và `backend/.data` là
dữ liệu cục bộ hoặc nội dung sinh tự động, không phải mã nguồn; cấu hình VS Code của repository
tự ẩn các thư mục này khỏi Explorer và kết quả tìm kiếm.

## C2. Tình trạng hiện tại

- Backend F1–F8 và endpoint nền A1: **200/200 endpoint**, F8 có 137 endpoint quản trị.
- PostgreSQL: **38/38 migration** đã áp dụng và kiểm chứng.
- Frontend công khai W0–W8 hoàn tất; crawler đạt 380/380, responsive 11/11,
  Lighthouse 99 Performance / 100 Accessibility.
- Giao diện quản trị A1–A5 hoàn tất; nghiệm thu A5 đạt 72/72, Accessibility 100/100.
- **Dữ liệu thật đã thay thế dữ liệu demo**: bộ nạp gồm 17 dòng máy Lab và 28 dòng Valve;
  trạng thái xuất bản thực tế phụ thuộc publish preflight của từng sản phẩm.
- Rà soát toàn hệ thống 2026-08-12: typecheck / lint / build / test đều xanh,
  `pnpm test:db` đạt **563/563**.

Chi tiết đo đạc và giới hạn còn lại:

- [Báo cáo làm sạch cấu trúc](doc/32_BAO_CAO_LAM_SACH_CAU_TRUC_2026_08_13.md) ← mới nhất
- [Báo cáo rà soát toàn hệ thống](doc/30_BAO_CAO_RA_SOAT_TOAN_HE_THONG.md)
- [Kế hoạch UI phân tầng & dữ liệu thật](doc/28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md)
- [Điểm cần xác minh với hãng](doc/29_DIEM_CAN_XAC_MINH_VOI_HANG.md)
- [Trạng thái hiện tại](doc/14_TRANG_THAI_HIEN_TAI.md)
- [Hướng dẫn vận hành Admin](doc/27_HUONG_DAN_VAN_HANH_ADMIN.md)
- [Báo cáo nghiệm thu frontend W0–W8](doc/20_BAO_CAO_NGHIEM_THU_FRONTEND_W0_W8.md)
- [Báo cáo nghiệm thu Admin A5](doc/26_BAO_CAO_NGHIEM_THU_ADMIN_A5.md)

## C3. Nguồn sự thật kỹ thuật

Khi có mâu thuẫn, ưu tiên ADR và tài liệu thiết kế hiện hành trong `doc/`, sau đó đến contracts
và mã nguồn đã được test.

1. [README tài liệu thiết kế](doc/00_README_TAI_LIEU_THIET_KE.md)
2. [ADR quyết định kiến trúc](doc/09_ADR_QUYET_DINH_KIEN_TRUC.md)
3. [Kiến trúc backend và API](doc/06_KIEN_TRUC_BACKEND_VA_API.md)
4. [Lược đồ content block](doc/11_CONTENT_BLOCK_SCHEMA.md)
5. [Trạng thái hiện tại](doc/14_TRANG_THAI_HIEN_TAI.md)

## C4. Lưu ý môi trường

- Không commit `.env` hoặc credential.
- Phải đặt `INQUIRY_RECIPIENT` thành địa chỉ nhận inquiry hợp lệ trước khi triển khai.
- Production yêu cầu SMTP và CAPTCHA thật theo kiểm tra trong `@ltv/config`.
- Media local nằm ngoài Git và được tạo qua Docker Compose.
