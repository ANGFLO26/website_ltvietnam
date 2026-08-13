import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const nextPath = typeof query.next === 'string' ? query.next : undefined;
  const notice =
    query.setup === 'success'
      ? 'Tài khoản quản trị đã được tạo. Hãy đăng nhập để tiếp tục.'
      : query.password === 'changed'
        ? 'Mật khẩu đã được đổi và tất cả phiên cũ đã đăng xuất.'
        : undefined;
  return (
    <LoginForm
      {...(nextPath !== undefined && { nextPath })}
      {...(notice !== undefined && { notice })}
    />
  );
}
