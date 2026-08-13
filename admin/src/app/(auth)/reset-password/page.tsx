import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu' };
export default async function ResetPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <ResetPasswordForm token={typeof query.token === 'string' ? query.token : ''} />;
}
