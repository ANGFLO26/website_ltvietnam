# Báo cáo làm sạch cấu trúc repository

**Ngày thực hiện:** 2026-08-13
**Phạm vi:** toàn bộ workspace `Website`
**Kết luận:** cấu trúc sau làm sạch hợp lệ; không xóa mã nguồn, dữ liệu nghiệp vụ hay hồ sơ kiểm chứng đang được tham chiếu.

## 1. Kết quả

Sau hai vòng kiểm tra, đã loại bỏ khoảng **909 MB** nội dung không cần lưu trong cấu trúc làm việc:

| Đã xóa | Lý do | Khả năng phục hồi |
|---|---|---|
| `my-app/` | Dự án Create Next App mặc định, không thuộc pnpm workspace, không được mã nguồn tham chiếu | Không nằm trong Git; có thể tạo lại bằng trình tạo Next.js nếu thật sự cần |
| `.claude/` | Cấu hình cá nhân của công cụ, không phải cấu hình sản phẩm | Không nằm trong Git; có thể tạo lại thủ công |
| `admin/.next/`, `frontend/.next/` | Cache và kết quả build Next.js | Tự sinh lại khi chạy `dev` hoặc `build` |
| `backend/dist/`, `worker/dist/`, `packages/*/dist/` | JavaScript sinh từ TypeScript | Tự sinh lại khi chạy `build` hoặc `typecheck` |
| `admin/next-env.d.ts`, `frontend/next-env.d.ts` | Khai báo kiểu do Next.js tự sinh | Tự sinh lại khi chạy Next.js |
| `.pnpm-store/` trong repository | Cache cũ 1,89 MB từ 2026-07-31; `node_modules/.modules.yaml` xác nhận dependency hiện liên kết với `D:\.pnpm-store\v10` | pnpm tự tạo/tải lại khi cần |
| `planning/implementation/v0.2/` | Một file kế hoạch cũ bị sót; không có tham chiếu đang dùng và Gate CI yêu cầu `active_v0_directories=0` | Được Git theo dõi, có thể phục hồi từ lịch sử |
| `scripts/dev-setup.sh` | Luồng Bash cũ trùng và kém đầy đủ hơn `node scripts/local-up.mjs` | Được Git theo dõi, có thể phục hồi từ lịch sử |

`my-app`, `.claude` và cache pnpm cũ không được Git theo dõi. Các output build đã được
`.gitignore` loại trừ. Hai mục được Git theo dõi chỉ bị xóa sau khi đã kiểm tra lịch sử, tham chiếu
và quy tắc CI.

Đồng thời đã chuẩn hóa ba vùng có tên khó hiểu:

| Trước | Sau | Lý do |
|---|---|---|
| `frontend/src/lib/w4`, `w5`, `w6` | `frontend/src/page-views/` | Tên theo vai trò của code, không theo số phase đã kết thúc |
| `doc/data/products-pilot/` | `doc/data/lab-products/` | Đối xứng rõ với `valve-products/` |
| `scripts/verify-schema.sh` | `doc/verify/v1.3/run_verification.sh` | Verifier nằm cùng baseline SQL mà nó kiểm tra |
| `planning/implementation/GATE_STATUS.md` | `planning/implementation/history/GATE_STATUS_P0_2026-07-29.md` | Snapshot cũ không còn tự nhận là trạng thái hiện tại; trạng thái live dùng `doc/14` |

## 2. Cấu trúc chuẩn sau làm sạch

```text
Website/
├─ admin/                    Ứng dụng quản trị Next.js (cổng 3002)
├─ backend/                  API, nghiệp vụ, DAO và integration test
│  └─ .data/                 Media cục bộ; dữ liệu vận hành, không commit
├─ frontend/                 Website công khai Next.js (cổng 3000)
│  └─ src/page-views/        Logic dựng trang và metadata theo nghiệp vụ
├─ worker/                   Email outbox worker
├─ packages/                 Thư viện dùng chung
│  ├─ config/                Xác thực cấu hình môi trường
│  ├─ contracts/             API contracts và read model
│  ├─ db/                    Schema, migration và seed nền
│  └─ testing/               Tiện ích kiểm thử
├─ scripts/                  Script vận hành, đo lường và smoke test
├─ doc/                      Tài liệu hiện hành, báo cáo, dữ liệu nguồn
│  ├─ data/
│  │  ├─ lab-products/       Dữ liệu nguồn thiết bị Lab
│  │  └─ valve-products/     Dữ liệu nguồn Valve
│  ├─ verify/                Kết quả xác minh schema/tài liệu
│  └─ archive/               Tài liệu lịch sử đã đóng băng
├─ planning/implementation/  Baseline kế hoạch và hồ sơ gate
├─ implementation/evidence/  Bằng chứng kiểm chứng lịch sử
├─ .github/                  CI GitHub Actions
├─ package.json              Lệnh điều phối toàn monorepo
└─ pnpm-workspace.yaml       Danh sách workspace chính thức
```

Quy tắc nhận diện nhanh:

- **Mã sản phẩm:** `admin`, `backend`, `frontend`, `worker`, `packages`.
- **Công cụ:** `scripts`, `.github` và các file cấu hình ở thư mục gốc.
- **Tài liệu/dữ liệu nguồn:** `doc`.
- **Hồ sơ kiểm chứng:** `planning`, `implementation`; không tham gia runtime nhưng vẫn là tài sản được tham chiếu.
- **Dữ liệu máy cục bộ:** `node_modules`, `backend/.data`; giữ để chạy dự án nhưng không commit.
- **Nội dung sinh tự động:** `.next`, `dist`, `next-env.d.ts`; có thể xóa bằng `pnpm clean` khi các dev server đã dừng.
- **Hiển thị trong VS Code:** `.vscode/settings.json` ẩn dependency, cache và output build khỏi Explorer/tìm kiếm.

## 3. Những thư mục đã phân tích nhưng giữ lại

| Thư mục | Quyết định | Căn cứ |
|---|---|---|
| `planning/implementation/` | Giữ | Baseline v1.0 đã khóa, manifest và CI còn tham chiếu đường dẫn |
| `implementation/evidence/` | Giữ | Lưu bằng chứng Gate B, sandbox và kiểm tra lịch sử |
| `doc/archive/` | Giữ | Bản tài liệu cũ đã đóng băng, phục vụ truy vết quyết định |
| `doc/verify/` | Giữ | Chứa kết quả xác minh schema và release |
| `scripts/inject-*.mjs` | Giữ | Fault injection được lệnh `pnpm inject` sử dụng để chứng minh test có hiệu lực |
| `node_modules/` | Giữ | Dependency hiện dùng để phát triển và kiểm thử; đã bị Git bỏ qua |
| `backend/.data/` | Giữ | Media Lab, Valve và khách hàng được seed cục bộ; không phải mã nguồn |

Việc gom hoặc đổi tên ba vùng `doc`, `planning`, `implementation` không được thực hiện vì sẽ làm hỏng liên kết tài liệu, checksum lịch sử và kiểm tra CI. Giữ ranh giới rõ trong README an toàn hơn một cuộc di chuyển hình thức.

## 4. Kiểm soát cấu trúc về sau

1. Ứng dụng mới chỉ được thêm khi có tên trong `pnpm-workspace.yaml` và có chủ sở hữu/phạm vi rõ ràng.
2. Không đặt project thử nghiệm ở thư mục gốc; dùng thư mục tạm ngoài repository.
3. Không commit `.next`, `dist`, `node_modules`, `.pnpm-store`, `.env` hoặc `backend/.data`.
4. Trước khi bàn giao hoặc đo dung lượng, dừng server rồi chạy `pnpm clean`.
5. Không xóa `planning`, `implementation`, `doc/archive` hoặc `doc/verify` nếu chưa cập nhật toàn bộ manifest, checksum, CI và liên kết chéo.

## 5. Tiêu chí nghiệm thu

- Root chỉ còn các ứng dụng, package, công cụ, tài liệu và cấu hình có vai trò xác định.
- Không còn `my-app` hoặc cấu hình công cụ cá nhân `.claude`.
- Không còn kế hoạch `v0.x`, cache pnpm cũ hoặc thư mục source mang tên phase `w4/w5/w6`.
- Không còn output build sau bước làm sạch cuối cùng.
- `README.md` mô tả đúng hai nguồn dữ liệu Lab/Valve và cấu trúc repository hiện hành.
- Các lệnh lint/typecheck được chạy sau thay đổi; output sinh trong lúc kiểm tra được dọn lại bằng `pnpm clean`.

## 6. Kết quả kiểm tra sau làm sạch

| Kiểm tra | Kết quả |
|---|---|
| Tám workspace có `package.json` đúng vị trí | Đạt |
| `pnpm lint` | Đạt |
| `pnpm typecheck` | Đạt toàn monorepo |
| Frontend Vitest | Đạt 13 file, **69/69 test** |
| Plan history verifier | Đạt **80/80** entry, không thiếu/thừa/sai hash |
| Active `planning/implementation/v0.x` | Đạt, còn 0 thư mục |
| Cú pháp `doc/verify/v1.3/run_verification.sh` | Đạt qua `bash -n` |
| Import `@/lib/w4`, `w5`, `w6` | Đạt, còn 0 tham chiếu |
| Prettier cho các file thuộc lần làm sạch này | Đạt |
| `git diff --check` | Đạt, không có lỗi khoảng trắng |
| `pnpm clean` và kiểm tra lại `.next`/`dist` | Đạt, không còn output build |

`pnpm format:check` toàn repository vẫn báo **11 file nghiệp vụ đang chỉnh dở** chưa theo Prettier,
gồm các file trong Admin, Backend và Frontend cùng `package.json`/`eslint.config.mjs`. Chúng không
phải lỗi cấu trúc và không được tự động ghi đè trong đợt này để tránh trộn thay đổi định dạng vào
mã chức năng đang phát triển.

Trình kiểm tra dữ liệu nguồn tại `doc/data/lab-products/tools/kiem_tra_du_lieu.py` chạy được sau
đổi tên nhưng vẫn báo 33 lỗi và 10 cảnh báo trong các file Markdown gốc. Đây là tình trạng dữ liệu
nguồn đã được ghi nhận ở `doc/28`; script seed vận hành đọc `du-lieu-chuan-hoa.json`, không đọc trực
tiếp các file Markdown này. Vì vậy kết quả trên không phải lỗi do làm sạch cấu trúc, nhưng vẫn cần
giữ như một cảnh báo chất lượng dữ liệu.

### Lưu ý Git trước lần commit tiếp theo

`admin/` và `run-admin.cmd` là thành phần hợp lệ của hệ thống nhưng hiện vẫn **chưa được Git theo
dõi**. Không xóa hai mục này; cần đưa chúng vào commit triển khai Admin kế tiếp để tránh thiếu toàn
bộ giao diện quản trị khi đẩy repository sang máy khác.
