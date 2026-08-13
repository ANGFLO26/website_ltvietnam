import type { Metadata } from 'next';
import { SetupForm } from '@/features/auth/SetupForm';

export const metadata: Metadata = { title: 'Khởi tạo quản trị' };
export default function SetupPage() {
  return <SetupForm />;
}
