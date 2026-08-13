import 'server-only';

import type { AdminUserView } from '@ltv/contracts';
import { redirect } from 'next/navigation';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';
import { safeNextPath } from './next-path';

export async function requireAdminSession(nextPath: string): Promise<AdminUserView> {
  try {
    return await adminServerRequest<AdminUserView>('/auth/me');
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
    }
    throw error;
  }
}
