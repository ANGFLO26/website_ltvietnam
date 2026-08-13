import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Quên mật khẩu' };
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
