import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="standalone-state">
      <span>404</span>
      <h1>Không tìm thấy trang quản trị</h1>
      <p>Đường dẫn có thể đã thay đổi hoặc chức năng chưa được triển khai.</p>
      <Link className="button button--primary" href="/dashboard">
        Về Dashboard
      </Link>
    </main>
  );
}
