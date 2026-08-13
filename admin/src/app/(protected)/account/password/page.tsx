import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';

export const metadata: Metadata = { title: 'Đổi mật khẩu' };
export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tài khoản của tôi"
        title="Bảo mật tài khoản"
        description="Thay đổi mật khẩu đăng nhập và thu hồi các phiên hiện có."
      />
      <ChangePasswordForm />
    </>
  );
}
