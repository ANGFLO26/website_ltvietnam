import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminProviders } from '@/components/providers/AdminProviders';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'LT Vietnam Admin', template: '%s · LT Vietnam Admin' },
  description: 'Hệ thống quản trị nội bộ LT Vietnam',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
