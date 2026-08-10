# Báo cáo dọn dẹp cấu trúc repository

> Ngày thực hiện: 2026-08-09  
> Mục tiêu: loại artefact sinh tự động, đưa tài liệu/script lịch sử về đúng khu vực và tránh
> xóa nhầm code F1–F8 chưa commit.

## 1. Kết luận kiểm kê

Không phát hiện file nguồn F1–F8 thừa có thể xóa an toàn. Phần lớn file đang hiện `untracked`
là controller, DTO, service, contract, migration và test mới của F5–F8; chúng đang được import,
được manifest endpoint kiểm tra hoặc được test thực thi.

Các vấn đề cấu trúc thực sự nằm ở output build, README P0 lỗi thời và một số artefact kiểm chứng
lịch sử đặt trong vùng hoạt động.

## 2. Artefact đã xóa

Các đường dẫn sau đều nằm trong `.gitignore`, được sinh lại tự động và không chứa mã nguồn:

- `backend/dist/`
- `frontend/.next/`
- `frontend/tsconfig.tsbuildinfo`
- `worker/dist/`

Các `packages/*/dist` cũng được dọn trong lần kiểm kê đầu, nhưng typecheck cho thấy package
exports hiện cần declaration đã build. Vì vậy lệnh root `pnpm typecheck` và `pnpm test` đã được
sửa để tự chạy `build:packages`; chỉ khoảng 0,5 MiB output package cần thiết được tạo lại.
Dung lượng giải phóng ròng khoảng **68,4 MiB**. Có thể tái tạo toàn bộ bằng `pnpm build`.

## 3. File đã chuyển về archive/evidence

| Đường dẫn cũ | Đường dẫn mới | Lý do |
|---|---|---|
| `README_P0.md` | `doc/archive/p0/P0_SCAFFOLD.md` | Sai trạng thái hiện tại, còn ghi backend chưa triển khai và chỉ có 33 migration. |
| `doc/verify/v1.3/seed_full.sql` | `doc/archive/p0/seed_full_v1.3.sql` | Static seed cũ, không còn tham chiếu; đã được `backend/scripts/seed-demo.ts` thay thế. |
| `scripts/sandbox-pg.sh` | `implementation/evidence/p0-sandbox/sandbox-pg.sh` | Gắn cứng đường dẫn của sandbox cũ, không dùng được cho local development. |
| `scripts/sandbox-setup.sh` | `implementation/evidence/p0-sandbox/sandbox-setup.sh` | Chỉ tái hiện layout và dependency của sandbox P0 cũ. |
| `doc/verify/run_verification.ps1` | `doc/verify/v1.2.1-legacy/run_verification.ps1` | Verifier v1.2.1 từng trỏ tới SQL không tồn tại ở thư mục cha. |
| `doc/verify/run_verification.sh` | `doc/verify/v1.2.1-legacy/run_verification.sh` | Đặt cạnh `schema_up/down` và `verify_checks.sql` giúp đường dẫn hoạt động đúng. |

Lịch sử không bị xóa; chỉ được chuyển khỏi root và vùng script đang hoạt động.

## 4. File được sửa để cấu trúc rõ ràng hơn

- `README.md` được viết lại theo trạng thái backend F1–F8 hiện hành, có cây repository, quick
  start, lệnh test/build/migration và liên kết báo cáo.
- Lệnh typecheck frontend tắt incremental cache để không tạo lại `tsconfig.tsbuildinfo` sau
  mỗi lần kiểm tra không emit.
- `doc/verify/README_VERIFY.md` phản ánh đúng vị trí verifier legacy.
- `doc/13_RA_SOAT_BACKEND_TRUOC_PHASE.md` trỏ tới bản sandbox evidence mới.
- Thêm README nhỏ cho `doc/archive/p0/` và `implementation/evidence/p0-sandbox/` để người đọc
  không dùng nhầm artefact lịch sử.

## 5. Những thứ trông thừa nhưng phải giữ

| Nhóm | Lý do giữ |
|---|---|
| Toàn bộ code/test/migration untracked của F5–F8 | Chưa commit nhưng đang được build, import và test; `git clean` sẽ làm mất chức năng. |
| `implementation/evidence/` | Chính sách repository yêu cầu evidence được track; README, review và Gate B tham chiếu trực tiếp. |
| `planning/implementation/v1.0/` | Bị khóa SHA-256 và workflow CI kiểm inventory chính xác. |
| `planning/implementation/history/` | Workflow Gate B chạy verifier và đối chiếu Git tag lịch sử. |
| `doc/verify/v1.3/schema_up.sql` | Architecture test dùng để đối chiếu aggregate migration; chưa thể thay bằng migration rời. |
| `doc/verify/v1.2.1-legacy/` và execution log | Hồ sơ lịch sử có tham chiếu chéo; đã tách rõ khỏi active v1.3. |
| Các `tsconfig.json` và `vitest.config.ts` giống nhau ở nhiều package | Công cụ cần config tại từng package; nội dung giống nhau không có nghĩa là file dư. |
| `packages/*/dist/` sau khi chạy lệnh root | Package exports trỏ tới declaration/runtime đã build; lệnh root nay tự tái tạo trước typecheck/test. |
| `.env` | Cấu hình local có secret, đã được ignore; không phải artefact build. |
| `node_modules/` | Dependency đang dùng để phát triển và chạy test; xóa sẽ buộc cài lại khoảng 429 MiB. |
| `.pnpm-store/` | `pnpm store path` xác nhận đây là store đang hoạt động của workspace. |

## 6. Ứng viên có thể archive thêm nếu muốn tối giản mạnh

- `scripts/dev-setup.sh`: chức năng phần lớn trùng `scripts/local-up.mjs`, nhưng vẫn hữu ích cho
  môi trường Bash/Docker đơn giản nên hiện được giữ.
- `doc/archive/` và các release snapshot: không tham gia runtime, nhưng là hồ sơ đã có manifest
  và checksum; chỉ nên xóa khi chính sách lưu lịch sử thay đổi.
- `doc/13_RA_SOAT_BACKEND_TRUOC_PHASE.md`: là báo cáo dài của giai đoạn trước, nhưng còn chứa
  lý do thiết kế và liên kết test nên nên giữ trong `doc/` cho đến khi hoàn tất frontend.

## 7. Cấu trúc sau khi dọn

```text
README.md                         hướng dẫn hiện hành duy nhất ở root
scripts/                          chỉ còn setup local, smoke, fault injection và schema verify
doc/archive/p0/                   README và static seed P0 cũ
doc/verify/v1.2.1-legacy/         SQL + verifier lịch sử nằm cùng nhau
implementation/evidence/p0-sandbox/ script tái hiện sandbox cũ
backend/, frontend/, worker/      không còn output build ứng dụng sau khi dọn
```

## 8. Khôi phục artefact build

Khi cần chạy production bundle hoặc khởi động từ file đã biên dịch:

```bash
pnpm build
```

Lệnh này sẽ tạo lại `dist/`, `.next/` và `tsconfig.tsbuildinfo`; các thư mục đó vẫn được Git
ignore và có thể dọn lại bất kỳ lúc nào.

## 9. Dọn dẹp sau frontend W0–W8 — 2026-08-10

Lần kiểm kê thứ hai được thực hiện sau khi frontend công khai W0–W8 hoàn tất:

- Phân tích đồ thị import của 357 file nguồn chỉ tìm thấy một file không có đầu vào và không phải
  framework/CLI entrypoint: `frontend/src/components/ui/ErrorState.tsx`. Component này chưa từng
  được render; `src/app/error.tsx` đã tự cung cấp màn hình lỗi hoàn chỉnh, nên file được xóa.
- `packages/db/src/cli.ts` có số import vào bằng 0 nhưng **không dư**: các script `migrate`, `status`,
  `rollback` và `verify` gọi trực tiếp output biên dịch của file này.
- Ba `tsconfig.json` và ba `vitest.config.ts` trùng nội dung vẫn được giữ vì công cụ cần config tại
  từng package; gộp chúng không giảm ranh giới package và có thể làm hỏng cách chạy độc lập.
- `planning/implementation/`, `implementation/evidence/`, `doc/archive/` và `doc/verify/` tiếp tục
  được giữ do manifest, workflow CI và tài liệu hiện hành tham chiếu trực tiếp.
- Bổ sung `pnpm clean` với allowlist cố định. Lệnh chỉ xóa `.tmp`, `dist`, `.next`, declaration/cache
  sinh tự động; không xóa `node_modules`, `.pnpm-store`, `.env` hoặc `.data`. Cần dừng dev
  server/worker trước khi chạy để Windows không giữ handle trên log hoặc output.
- README được đồng bộ từ trạng thái frontend scaffold/37 migration sang frontend W0–W8/38 migration;
  mục lệnh nghiệm thu web cũng được bổ sung.

Sau khi kiểm tra xong, `pnpm clean` giải phóng khoảng 330 MiB output có thể tái tạo và 0,22 MiB log
tạm. Dependency cache được giữ để không buộc cài lại toàn workspace.
