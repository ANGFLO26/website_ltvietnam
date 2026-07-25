# CLEANUP REPORT — LT Vietnam Website Documentation v1.2.1

**Ngày hoàn tất:** 2026-07-22  
**Phạm vi:** `D:\Work\LTVN\Website\doc`

## A. Trạng thái trước khi dọn

- Số file: **39**.
- Số thư mục con: **4**.
- Archive cũ: `archive/v1.1` và `archive/v1.2`, mỗi thư mục có đủ 11 file Markdown `00–10`.
- Bộ tài liệu chính: đủ 11 file `00–10`.
- `verify`: đủ 6 file tối thiểu được yêu cầu.
- File tạm/trùng phát hiện theo mẫu tên yêu cầu: **0**.
- SHA-256 của toàn bộ 39 file đã được tính trong bước inventory trước khi thay đổi.

## B. Cập nhật phê duyệt

| File | Cập nhật |
|---|---|
| `00_README_TAI_LIEU_THIET_KE.md` | Chuyển trạng thái thành `Approved — READY FOR IMPLEMENTATION`; ghi nhận static validation, SQL execution, migration, rollback và migration lần hai đều hoàn tất; cập nhật đường dẫn lịch sử sang ZIP legacy. |
| `09_ADR_QUYET_DINH_KIEN_TRUC.md` | Chỉ đổi trạng thái bộ tài liệu thành `Approved`; 13/13 ADR vẫn giữ `Accepted`, không sửa nội dung ADR-001 đến ADR-013. |
| `10_CHANGELOG_DONG_BO_TAI_LIEU.md` | Giữ lịch sử cũ A–N; thêm phần O ghi kết quả PostgreSQL 16 và phần P kết luận phê duyệt. |

- Ngày SQL verification được ghi nhận: **2026-07-21**.
- Raw execution được chạy lại và lưu ngày **2026-07-22** để bảo toàn bằng chứng đầu ra thật.
- Tóm tắt bằng chứng: `verify/execution/POSTGRESQL16_EXECUTION_RESULT.md`.
- Raw terminal output: `verify/execution/postgresql16_execution.log`.
- SHA-256 raw log: `DD5A310531E500281DA965D1B30AE058F2C4B62387986E7033E2CF3B436EFC89`.
- Không thay đổi kiến trúc, schema, API, phạm vi MVP hoặc phiên bản thiết kế.

## C. Release snapshot

- Đường dẫn: `archive/releases/v1.2.1-approved`.
- Nội dung: **11 tài liệu `00–10` + 1 `RELEASE_MANIFEST.md`**.
- Đối chiếu SHA-256 nguồn với snapshot: **PASS 11/11**.
- Kích thước và SHA-256 từng tài liệu: ghi trong `RELEASE_MANIFEST.md`.
- SHA-256 của `RELEASE_MANIFEST.md`: `5285A686CF1477C3937AB5930A38D19A249AC65D872325A2B61D3B5177877BDF`.
- Trạng thái kiểm tra: **PASS — snapshot chỉ chứa bộ `00–10` đã Approved và manifest; không chứa archive, file tạm hay phiên bản cũ**.
- Snapshot không được chỉnh sửa sau khi tạo manifest.

## D. Legacy archive

- ZIP: `archive/legacy/ltvn-documentation-history-v1.1-v1.2.zip`.
- Số file bên trong: **22** (22 Markdown; v1.1: 11, v1.2: 11).
- Kích thước ZIP: **149542 byte**.
- SHA-256: `8783846DDB7FC0D12F4F0D8A41C914D1E6C4C33AFA122C385E0F975ED6F2167A`.
- Mở/đọc và liệt kê ZIP: **PASS**.
- File 0 byte bất thường: **0**.
- Đối chiếu SHA-256 từng ZIP entry với file nguồn: **PASS 22/22**.
- `archive/v1.1` và `archive/v1.2` chỉ được xóa sau khi tất cả kiểm tra ZIP ở trên PASS.
- Sau khi xóa nguồn, ZIP vẫn tồn tại và SHA-256 không đổi: **PASS**.

## E. File đã xóa

Không có file tạm/trùng nào bị xóa vì không phát hiện ứng viên hợp lệ. Các file dưới đây chỉ bị xóa ở dạng thư mục bung sau khi đã được lưu và đối chiếu trong Legacy ZIP.

| Đường dẫn | Lý do | File thay thế/bản lưu | SHA-256 |
|---|---|---|---|
| `archive/v1.1/00_README_TAI_LIEU_THIET_KE.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/00_README_TAI_LIEU_THIET_KE.md` | `4B8E82DE97384EA819BE54042E068412BE6C0BE1BA3038D3598083E983B8A343` |
| `archive/v1.1/01_PHAM_VI_CHUC_NANG_VA_MVP.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/01_PHAM_VI_CHUC_NANG_VA_MVP.md` | `13AFB5EC4BD17C9E37EA5C92182DBB484FEA5801F89FBD0F2E5785EE1E1115EA` |
| `archive/v1.1/02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md` | `46694419E6EC156E7926A0C22799A0A1D167FEAA8B57CF0ED3E28EB858B0B175` |
| `archive/v1.1/03_CHUAN_HOA_MO_HINH_DU_LIEU.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/03_CHUAN_HOA_MO_HINH_DU_LIEU.md` | `CBE6629BAE684F36254387BBECC05D6591E7A66F8FFF7249B0A26316A4858D95` |
| `archive/v1.1/04_ERD_LOGIC_HE_THONG.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/04_ERD_LOGIC_HE_THONG.md` | `1C9F4FD283C3BE497800ED93FD58FFAD8C664DA80466472A148D06B62796DDBE` |
| `archive/v1.1/05_DATABASE_SCHEMA_POSTGRESQL.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/05_DATABASE_SCHEMA_POSTGRESQL.md` | `391282BD49FED03CA019A76496D76CDF43500840C846800CD717D55E9DCC9C4A` |
| `archive/v1.1/06_KIEN_TRUC_BACKEND_VA_API.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/06_KIEN_TRUC_BACKEND_VA_API.md` | `04381712C0A5D4E44932A034F0C2DE59371B955F24BF87C2D84B90FEDB5D0763` |
| `archive/v1.1/07_WIREFRAME_GIAO_DIEN_ADMIN.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/07_WIREFRAME_GIAO_DIEN_ADMIN.md` | `EEFB4EC96479FBFB21AB8648BFB982B79FCB5F6F391663AB513F9B407AA5B093` |
| `archive/v1.1/08_WIREFRAME_FRONTEND_CONG_KHAI.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/08_WIREFRAME_FRONTEND_CONG_KHAI.md` | `2D47C35B91B3AD0CB6D2572A3321DB8A040133A137418AD687D869675EAB68F8` |
| `archive/v1.1/09_ADR_QUYET_DINH_KIEN_TRUC.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/09_ADR_QUYET_DINH_KIEN_TRUC.md` | `949ABD887DB97B4638B8EAA4005251221A5D77B624C1D74C689217A0271C5525` |
| `archive/v1.1/10_CHANGELOG_DONG_BO_TAI_LIEU.md` | Thu gọn lịch sử v1.1 | ZIP entry `v1.1/10_CHANGELOG_DONG_BO_TAI_LIEU.md` | `B3F19F1A376E8F72E766EFCA2A4F559ADD067BDAC0FFB1ABD709E196C4422666` |
| `archive/v1.2/00_README_TAI_LIEU_THIET_KE.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/00_README_TAI_LIEU_THIET_KE.md` | `B2AFABE9060644A70F84986FC0465F7064F6926F626A957A71869EFC65C52D5D` |
| `archive/v1.2/01_PHAM_VI_CHUC_NANG_VA_MVP.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/01_PHAM_VI_CHUC_NANG_VA_MVP.md` | `6B4BE2D1024209C044965E9A5AB97F98FD903861910865375A3B3001FAEC035A` |
| `archive/v1.2/02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md` | `1F5ABBCF66BCA75456EDF82DDF89A25BDBC7098607420F34D445A6DBA02F02C9` |
| `archive/v1.2/03_CHUAN_HOA_MO_HINH_DU_LIEU.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/03_CHUAN_HOA_MO_HINH_DU_LIEU.md` | `9DDC8FE50B94CD982DE74F00F56AB486BFE2165EB2D79059AAC9EC3826A68E30` |
| `archive/v1.2/04_ERD_LOGIC_HE_THONG.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/04_ERD_LOGIC_HE_THONG.md` | `EDAE937D9ECEDA3067CBA22738EFC777B0C59914C721AC13782B3CC7E86F18A6` |
| `archive/v1.2/05_DATABASE_SCHEMA_POSTGRESQL.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/05_DATABASE_SCHEMA_POSTGRESQL.md` | `86F379B9A4F52925ABBAF1D069900AA4A70CE522762C98859746D2DC4E56C218` |
| `archive/v1.2/06_KIEN_TRUC_BACKEND_VA_API.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/06_KIEN_TRUC_BACKEND_VA_API.md` | `2C8668C33D4F0EF9017B92B929BD1B2653AC00C56037B5DBAFA36226013FC276` |
| `archive/v1.2/07_WIREFRAME_GIAO_DIEN_ADMIN.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/07_WIREFRAME_GIAO_DIEN_ADMIN.md` | `BD0DAD212EF898C49B9D1259123C50D21AFCF89014F45C2769B49F2B2BE12CDB` |
| `archive/v1.2/08_WIREFRAME_FRONTEND_CONG_KHAI.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/08_WIREFRAME_FRONTEND_CONG_KHAI.md` | `A38E3AF78061BCC4039288EA04A371F58EC167BCAC8ACE23F851335C6494E0DB` |
| `archive/v1.2/09_ADR_QUYET_DINH_KIEN_TRUC.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/09_ADR_QUYET_DINH_KIEN_TRUC.md` | `D389CA5B92A115390D8C5F2EFB379750ABE645441FC06F96A53878E1627CD0D9` |
| `archive/v1.2/10_CHANGELOG_DONG_BO_TAI_LIEU.md` | Thu gọn lịch sử v1.2 | ZIP entry `v1.2/10_CHANGELOG_DONG_BO_TAI_LIEU.md` | `870523A5AC747CB636DAB878193C9C38574724C8189C4567AFC70C38AD51F59B` |

## F. File được giữ

- Bộ tài liệu chính: đủ 11 file `00_README_TAI_LIEU_THIET_KE.md` đến `10_CHANGELOG_DONG_BO_TAI_LIEU.md`.
- Verify scripts: `schema_up.sql`, `schema_down.sql`, `verify_checks.sql`, `run_verification.ps1`, `run_verification.sh`, `README_VERIFY.md`.
- Execution evidence: `POSTGRESQL16_EXECUTION_RESULT.md`, `postgresql16_execution.log`.
- Release snapshot: 11 file `00–10` và `RELEASE_MANIFEST.md` trong `archive/releases/v1.2.1-approved`.
- Legacy: ZIP lịch sử, `LEGACY_MANIFEST.md`, `SHA256SUMS.txt`.
- 11 nhóm file có SHA-256 trùng là các cặp tài liệu chính và snapshot approved có chủ đích; tất cả được giữ theo yêu cầu.

## G. Cấu trúc thư mục sau dọn

```text
doc/
├── 00_README_TAI_LIEU_THIET_KE.md
├── 01_PHAM_VI_CHUC_NANG_VA_MVP.md
├── 02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md
├── 03_CHUAN_HOA_MO_HINH_DU_LIEU.md
├── 04_ERD_LOGIC_HE_THONG.md
├── 05_DATABASE_SCHEMA_POSTGRESQL.md
├── 06_KIEN_TRUC_BACKEND_VA_API.md
├── 07_WIREFRAME_GIAO_DIEN_ADMIN.md
├── 08_WIREFRAME_FRONTEND_CONG_KHAI.md
├── 09_ADR_QUYET_DINH_KIEN_TRUC.md
├── 10_CHANGELOG_DONG_BO_TAI_LIEU.md
├── verify/
│   ├── README_VERIFY.md
│   ├── run_verification.ps1
│   ├── run_verification.sh
│   ├── schema_down.sql
│   ├── schema_up.sql
│   ├── verify_checks.sql
│   └── execution/
│       ├── POSTGRESQL16_EXECUTION_RESULT.md
│       └── postgresql16_execution.log
└── archive/
    ├── CLEANUP_REPORT.md
    ├── legacy/
    │   ├── LEGACY_MANIFEST.md
    │   ├── SHA256SUMS.txt
    │   └── ltvn-documentation-history-v1.1-v1.2.zip
    └── releases/
        └── v1.2.1-approved/
            ├── 00_README_TAI_LIEU_THIET_KE.md
            ├── 01_PHAM_VI_CHUC_NANG_VA_MVP.md
            ├── 02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md
            ├── 03_CHUAN_HOA_MO_HINH_DU_LIEU.md
            ├── 04_ERD_LOGIC_HE_THONG.md
            ├── 05_DATABASE_SCHEMA_POSTGRESQL.md
            ├── 06_KIEN_TRUC_BACKEND_VA_API.md
            ├── 07_WIREFRAME_GIAO_DIEN_ADMIN.md
            ├── 08_WIREFRAME_FRONTEND_CONG_KHAI.md
            ├── 09_ADR_QUYET_DINH_KIEN_TRUC.md
            ├── 10_CHANGELOG_DONG_BO_TAI_LIEU.md
            └── RELEASE_MANIFEST.md
```

## H. Kết luận

**CLEANUP COMPLETED — APPROVED BASELINE PRESERVED**
