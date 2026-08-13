'use client';

export default function GlobalError({
  reset,
}: {
  readonly error: Error;
  readonly reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <main className="global-error" role="alert">
          <p>LT Vietnam Admin</p>
          <h1>Không thể hiển thị trang quản trị</h1>
          <p>Hãy thử tải lại. Nếu lỗi tiếp tục, gửi mã yêu cầu trong thông báo lỗi cho kỹ thuật.</p>
          <button className="button button--primary" type="button" onClick={reset}>
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
