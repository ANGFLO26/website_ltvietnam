'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { adminBrowserRequest } from '@/lib/api/client.browser';

export function LogoutButton() {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () =>
      adminBrowserRequest<void>('/auth/logout', {
        method: 'POST',
        csrf: false,
        redirectOnUnauthorized: false,
      }),
    onSettled: () => {
      queryClient.clear();
      window.location.assign('/login');
    },
  });
  return (
    <button type="button" className="account-menu__item" onClick={() => logout.mutate()}>
      <LogOut size={16} aria-hidden="true" />
      {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </button>
  );
}
