import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/shell/AdminShell';
import { getAdminServerConfig } from '@/config';
import { requireAdminSession } from '@/lib/auth/session.server';

export default async function ProtectedLayout({ children }: { readonly children: ReactNode }) {
  const path = (await headers()).get('x-ltv-admin-path') ?? '/dashboard';
  const user = await requireAdminSession(path);
  const siteUrl = getAdminServerConfig().publicSiteUrl.toString();
  return (
    <AdminShell user={user} publicSiteUrl={siteUrl}>
      {children}
    </AdminShell>
  );
}
