# P0 sandbox evidence

Hai script trong thư mục này được giữ để giải thích cách các test P0 từng chạy trong sandbox
Linux không có Docker. Chúng không phải script phát triển cục bộ:

- `sandbox-pg.sh` gắn cứng đường dẫn của sandbox đã kết thúc.
- `sandbox-setup.sh` dựng lại layout `/tmp/p0` và dependency riêng của sandbox cũ.

Phát triển hiện tại dùng `node scripts/local-up.mjs` hoặc Docker Compose.
