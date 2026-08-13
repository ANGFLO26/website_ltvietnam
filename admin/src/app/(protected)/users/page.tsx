import type { AdminManagedUserView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { UserManager } from '@/features/operations/UserManager';
import { adminServerPage } from '@/lib/api/client.server';
import { requireAdminSession } from '@/lib/auth/session.server';

export default async function Page() {
  try {
    const [users, session] = await Promise.all([
      adminServerPage<AdminManagedUserView>('/admin/users?page=1&page_size=100'),
      requireAdminSession('/users'),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Hệ thống"
          title="Tài khoản quản trị"
          description="Tạo, khóa và mở khóa người dùng có quyền truy cập admin."
        />
        <UserManager initial={users} currentUserId={session.id} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Tài khoản quản trị" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải tài khoản.'} />
      </>
    );
  }
}
