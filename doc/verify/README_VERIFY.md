# doc/verify — SQL và bằng chứng kiểm chứng

## Cấu trúc

```text
doc/verify/
├── v1.3/                    ← ĐANG HOẠT ĐỘNG
│   ├── schema_up.sql        DDL có thẩm quyền của baseline v1.3 (52 bảng)
│   ├── schema_down.sql      rollback
│   ├── seed_test.sql        dữ liệu mẫu mô phỏng cấu trúc website thật
│   └── README_V1_3.md       kết quả kiểm chứng trên PostgreSQL 16.2
├── v1.2.1-legacy/           ← KHÔNG hoạt động, giữ để tham chiếu
│   ├── schema_up.sql        baseline 63 bảng, CHƯA TỪNG CHẠY ở đâu
│   ├── schema_down.sql
│   └── verify_checks.sql
└── execution/               bằng chứng chạy PostgreSQL 16 của v1.2.1
```

## Quy tắc

**`v1.3/schema_up.sql` là nguồn sự thật duy nhất về DDL.** Tài liệu `05` giải thích quyết định và liệt kê bảng; khi hai bên khác nhau, file SQL thắng.

`v1.2.1-legacy/` giữ lại vì `doc/verify/execution/` tham chiếu tới nó. Baseline đó **chưa từng chạy trên môi trường nào**, không có dữ liệu cần chuyển đổi, và không được dùng cho triển khai mới.

## Chạy kiểm chứng

```bash
createdb ltvn_verify
psql -d ltvn_verify -f v1.3/schema_up.sql
psql -d ltvn_verify -f v1.3/seed_test.sql
# kiểm tra
psql -d ltvn_verify -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='ltv' AND table_type='BASE TABLE';"   # 52
psql -d ltvn_verify -f v1.3/schema_down.sql
```

Yêu cầu PostgreSQL 16 với `pgcrypto`, `citext`, `pg_trgm`.
