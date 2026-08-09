# Báo cáo rà soát và sửa lỗi F1–F8

> Ngày thực hiện: 2026-08-09  
> Phạm vi: backend, contracts, database migrations, worker và các luồng HTTP công khai liên
> quan F1–F8.  
> Kết luận: không còn lỗi chức năng đã xác nhận trong phạm vi rà soát; toàn bộ cổng kiểm tra
> cuối đều xanh.

## 1. Cách rà soát

Đợt rà soát đối chiếu mã nguồn với kiến trúc, ADR, kế hoạch và trạng thái hiện tại trong
`doc/06`, `doc/09`, `doc/12`, `doc/14`, đồng thời kiểm tra manifest endpoint theo cả hai chiều.
Các lớp được đọc và kiểm tra gồm DTO/controller, service, DAO, transaction, schema/migration,
contracts dùng chung, worker email và fixture tích hợp.

Phép xác minh được thực hiện ở bốn tầng:

1. Kiểm tra tĩnh: endpoint manifest, luật kiến trúc, typecheck, ESLint, Prettier và
   `git diff --check`.
2. Unit test và integration test trên PostgreSQL thật.
3. Build production cho packages, backend, frontend và worker.
4. Khởi động backend thật và chạy smoke API qua HTTP.

## 2. Kết quả theo phase

| Phase | Phạm vi kiểm tra | Endpoint | Kết quả |
|---|---|---:|---|
| F1 | Brands, categories, standards, applications, industries; tree và slug | 17/17 | Đạt |
| F2 | Bộ lọc sản phẩm ADR-007, landing, chi tiết và quan hệ taxonomy | 3/3 | Đạt |
| F3 | Pages, services, projects, posts, documents; locale, translation và publish | 13/13 | Đạt |
| F4 | Home, navigation, customers, offices, search và site chrome | 5/5 | Đạt |
| F5 | Inquiry idempotency, CAPTCHA/rate limit, outbox, worker email và reset password | 4/4 | Đạt |
| F6 | Sitemap VI/EN, robots, canonical, robots metadata và hreflang | 3/3 | Đạt |
| F7 | Upload, magic bytes, variants, public/protected delivery, usage và purge | 7/7 | Đạt |
| F8 | Admin CRUD cho taxonomy, product, content, site, settings, redirects và users | 136/136 | Đạt |

Tổng manifest API là 198/198 endpoint, bao gồm F-1 và F0 ngoài phạm vi bảng F1–F8.

## 3. Vấn đề tìm thấy và bản sửa

| Mức độ | Vấn đề | Bản sửa và bảo vệ hồi quy |
|---|---|---|
| Nghiêm trọng | Query boolean dùng ép kiểu JavaScript khiến chuỗi `hard=false` thành `true`, có thể chuyển yêu cầu xóa mềm thành xóa cứng. | Thêm parser boolean tường minh, chỉ nhận `true/false/1/0`; thay toàn bộ DTO admin liên quan và thêm test hồi quy. |
| Cao | PATCH translation bắt buộc lại toàn bộ trường và có thể ghi mất nội dung khi chỉ đổi `status`. | Cho phép payload partial nhưng không rỗng; giữ nguyên trường bị bỏ qua, hỗ trợ status-only và kiểm tra đầy đủ khi tạo bản dịch mới. |
| Cao | Hai yêu cầu đồng thời có thể cùng vô hiệu hóa admin cuối cùng vì kiểm tra số lượng và cập nhật không khóa chung. | Khóa tập admin active bằng `SELECT ... FOR UPDATE` và thực hiện kiểm tra/cập nhật trong cùng transaction. |
| Cao | Cập nhật redirect bằng xóa rồi tạo lại làm mất ID, `hit_count` và lịch sử thời gian. | Retarget redirect tại chỗ, thu gọn chain nhưng giữ nguyên định danh và lịch sử. |
| Cao | Redirect admin chỉ chặn route tĩnh, vẫn có thể che URL nội dung đang published. | Thêm kiểm tra `isLivePath` cho sản phẩm, taxonomy và nội dung dịch; từ chối source trùng đường dẫn đang hoạt động. |
| Trung bình | Ẩn customer làm thay đổi cả `isPublic`, trộn trạng thái biên tập với quyền đồng ý công khai. | Thêm thao tác unpublish riêng; giữ nguyên cờ đồng ý `isPublic`. |
| Trung bình | `include_deleted=true` của danh sách page bị bỏ qua. | Truyền cờ xuống DAO và lọc/xem deleted đúng theo yêu cầu admin. |
| Trung bình | Một số create/update nhiều bước và thao tác chuyển cha service không nguyên tử. | Đưa insert/update, relation update và parent move vào transaction tương ứng. |
| Trung bình | Ba integration test phụ thuộc dữ liệu demo hoặc trạng thái global nên có thể xung đột khi chạy song song. | Cô lập dữ liệu application, redirect loop và office; cleanup theo tag riêng. |
| Chất lượng | 146 file không đạt cấu hình Prettier của repository. | Chạy formatter của dự án; `pnpm format:check` hiện đạt. |

## 4. Test hồi quy được bổ sung hoặc siết chặt

- Query boolean an toàn, đặc biệt `hard=false`.
- PATCH translation chỉ đổi status và bảo toàn các trường không gửi.
- Page admin tôn trọng `include_deleted`.
- Customer hide không xóa cờ đồng ý công khai.
- Redirect retarget giữ ID và `hit_count`.
- Redirect không được che đường dẫn published động.
- Last-active-admin dùng transaction/row lock.
- `SlugService.isLivePath` được kiểm tra trực tiếp trên PostgreSQL.
- Fixture product, redirect và site chrome chạy độc lập với seed và test song song.

## 5. Kết quả xác minh cuối

| Phép kiểm | Kết quả |
|---|---:|
| `pnpm test` | 592/592 test xanh |
| Backend | 533/533 test, 35/35 file test xanh |
| Contracts | 33/33 xanh |
| Config | 8/8 xanh |
| Migration runner | 13/13 xanh |
| Worker | 5/5 xanh |
| Smoke API qua HTTP | 228/228 xanh |
| Smoke auth qua HTTP | 38/38 xanh (41/41 o lan chay dau tren DB chua co tai khoan) |
| Kiến trúc/manifest | 198/198 endpoint |
| PostgreSQL migration | 37/37 đã apply, còn lại 0 |
| Migration verify | 37 migration liên tục, đủ cặp up/down, manifest hợp lệ |
| Production build | Đạt |
| Typecheck 7 workspace package | Đạt |
| ESLint | Đạt, 0 lỗi |
| Prettier | Đạt |
| `git diff --check` | Đạt |

Các migration `034_redirect_source_lower`, `035_unique_published_head_office`,
`036_email_outbox_notifications` và `037_media_checksum_unique` đã được áp dụng vào PostgreSQL
cục bộ. Demo seed cũng được chạy lại và xác nhận idempotent.

## 6. Giới hạn và việc cần cấu hình trước triển khai

- ~~**Toàn bộ F5–F8 chưa được commit.**~~ **Đã xử lý** — commit `6a9b4bf`, đã đẩy lên
  `origin/feat/p0-scaffold`.
- ~~**Tiêm lỗi chỉ phủ F4.**~~ **Đã xử lý** — `scripts/inject-f5-f8.mjs` thêm 24 phép tiêm
  phủ F5–F8, trong đó có cả mười bản sửa ở mục 3. Quá trình làm việc đó tìm thêm một lỗ
  hổng phủ thật (`storage_class` của `/media` chỉ được kiểm bằng DAO giả) — xem `doc/13`
  mục 23.
- Smoke HTTP hiện tập trung vào API công khai F1–F6. F7 và F8 được kiểm bằng unit test,
  integration test PostgreSQL, luật kiến trúc và hợp đồng endpoint; chưa có một smoke suite
  đăng nhập chạy tuần tự qua toàn bộ 136 endpoint admin.
- `.env` cục bộ đang có `INQUIRY_RECIPIENT` không hợp lệ. Trong lần rà soát, giá trị hợp lệ
  được đặt riêng cho tiến trình test/build; file `.env` không bị ghi đè. Cần thay bằng hộp thư
  nhận inquiry thật trước khi chạy không có override hoặc trước khi triển khai.
- Frontend hiện mới là khung tối thiểu; việc nối UI công khai và UI quản trị là công việc tiếp
  theo, không phải lỗi còn thiếu của backend F1–F8.
- Build frontend đạt, nhưng Next.js cảnh báo cấu hình ESLint gốc chưa khai báo plugin Next.
  `pnpm lint` vẫn sạch; nên thêm `eslint-config-next` khi bắt đầu triển khai UI để có các luật
  đặc thù React/Next.js.

## 7. Kết luận

F1–F8 đã được rà soát, sửa các lỗi tìm thấy và xác minh lại trên cơ sở dữ liệu cùng HTTP thật.
Không còn lỗi chức năng đã tái hiện trong phạm vi audit. Backend có thể chuyển sang giai đoạn
tích hợp frontend và chuẩn bị cấu hình môi trường triển khai.

---

## 8. Kiểm chứng độc lập (2026-08-09, sau khi báo cáo được viết)

Toàn bộ mục 5 đã được chạy lại từ cơ sở dữ liệu **trống**: 37 migration, seed bootstrap
và seed demo, rồi test và smoke với backend khởi động thật.

**Khớp nguyên văn:** 592 test workspace (backend 533/533 trên 35 file, contracts 33,
config 8, migration runner 13, worker 5), manifest 198/198 endpoint và không có endpoint
trùng lặp, 37 migration đủ cặp up/down, smoke API 228/228, typecheck 7 gói, ESLint 0 lỗi,
`prettier --check` sạch, `pnpm build` đạt, `git diff --check` sạch.

**Một chỗ sai, và một chỗ tôi đã đính chính SAI:**

1. `inject-f4.mjs` chỉ còn **11/14** tại thời điểm rà soát, không phải 14/14.
2. Smoke auth: bản đính chính đầu của tôi viết "là 41/41 chứ không phải 38/38". **Câu đó
   sai.** Số phép kiểm phụ thuộc trạng thái DB — **41/41** ở lần chạy đầu (chưa có tài
   khoản quản trị), **38/38** ở mọi lần sau, vì `POST /auth/bootstrap` trả 409 và ba phép
   kiểm bootstrap bị bỏ qua. Báo cáo gốc ghi 38 là **đúng**. Tôi đo một lần trên DB sạch
   rồi kết luận con số kia sai — đúng loại lỗi mà chính báo cáo này cảnh báo.

Chỗ thứ hai đáng chú ý hơn con số. Đợt dọn dẹp ở `doc/16` chạy Prettier trên 146 file;
formatter ngắt lại dòng và thêm dấu phẩy cuối ở ba đoạn mà `inject-f4.mjs` trỏ tới bằng
chuỗi nguyên văn. Ba phép tiêm chuyển sang "BO QUA", **script vẫn thoát 0**, và báo cáo
chép con số cũ sang. Ba bảo đảm vẫn còn trong mã — chỉ *phép đo* mất, tức đúng trạng thái
mà công cụ này sinh ra để ngăn.

Đã sửa hàm so khớp (bỏ qua cách xuống dòng và dấu phẩy cuối, vẫn cắt đúng đoạn nguyên văn
để phép hoàn tác bằng băm còn hiệu lực). Sau khi sửa: **14/14**.

Bài học cho các đợt sau: **định dạng lại toàn kho là một thay đổi có thể phá công cụ đo,
không chỉ phá diff.** Sau mỗi lần chạy formatter diện rộng, phải chạy lại bộ tiêm lỗi
trước khi trích số vào báo cáo.

---

## 9. Bổ sung 2026-08-10 — tiêm lỗi cho F5–F8

Giới hạn lớn nhất ở mục 8 đã được đóng. `scripts/inject-f5-f8.mjs`: **24/24** phép tiêm,
mỗi phép làm đúng bài kiểm của nó chuyển sang đỏ. Bộ khung tách ra
`scripts/lib/inject-harness.mjs` và dùng chung với `inject-f4.mjs` (14/14).

Năm phép tiêm **không đạt ở lần chạy đầu**, và điều tra chúng cho ra bốn kết quả khác
nhau — chi tiết ở `doc/13` mục 23. Đáng chú ý nhất: bài kiểm "protected PDF không qua
/media" dùng một **DAO giả**, nên điều kiện `storage_class = 'public'` trong SQL — ranh
giới giữa "ai cũng tải được" và "phải qua cổng tài liệu" — **chưa từng được kiểm**. Đã
thêm bài kiểm tích hợp chạy trên PostgreSQL thật.

Kèm theo: `pnpm build` sinh `frontend/next-env.d.ts` làm `pnpm lint` đỏ (đã sửa bằng
`.gitignore` + `ignores` của ESLint) — xem `doc/14` §9.3.
