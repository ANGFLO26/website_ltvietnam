'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { ADMIN_SESSION_EXPIRED_EVENT } from '@/lib/api/client.browser';
import { AdminApiError } from '@/lib/api/errors';

export function shouldRetryAdminQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof AdminApiError) return error.status >= 500 || error.status === 408;
  return true;
}

export function AdminProviders({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetryAdminQuery,
            refetchOnWindowFocus: false,
            networkMode: 'online',
          },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(() => {
    const clearPrivateCache = (): void => queryClient.clear();
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, clearPrivateCache);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, clearPrivateCache);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConnectivityStatus />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

function ConnectivityStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <div className="connectivity-banner" role="status" aria-live="polite">
      <WifiOff size={17} aria-hidden="true" />
      <span>Đang ngoại tuyến. Thay đổi chưa được gửi; hệ thống sẽ không tự thử lại mutation.</span>
    </div>
  );
}
