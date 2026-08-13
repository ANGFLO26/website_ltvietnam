import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__story" aria-label="Giới thiệu hệ thống quản trị">
        <div className="auth-layout__brand">
          <span>LT</span>
          <strong>LT Vietnam</strong>
        </div>
        <div className="auth-layout__message">
          <p className="auth-layout__kicker">Operations workspace</p>
          <h2>Quản trị nội dung rõ ràng, vận hành không bỏ sót yêu cầu khách hàng.</h2>
          <ul>
            <li>
              <ShieldCheck size={18} /> Phiên đăng nhập HttpOnly và CSRF hai lớp
            </li>
            <li>
              <ShieldCheck size={18} /> Xuất bản có kiểm tra điều kiện trước
            </li>
            <li>
              <ShieldCheck size={18} /> Tách biệt hoàn toàn với website công khai
            </li>
          </ul>
        </div>
        <small>Chỉ dành cho nhân sự được ủy quyền.</small>
      </section>
      <section className="auth-layout__form">{children}</section>
    </main>
  );
}
