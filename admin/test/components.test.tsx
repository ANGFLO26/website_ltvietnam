import type { AdminDashboardView, AdminUserView } from '@ltv/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from '@/components/shell/AdminShell';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('A1 accessible foundations', () => {
  it('dialog focus vao hanh dong dau va dong bang Escape', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open title="Xác nhận" onOpenChange={onOpenChange}>
        <Button data-autofocus>Tiếp tục</Button>
      </Dialog>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('dialog giu Tab ben trong va tra focus ve nut mo', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Mở xác nhận</Button>
          <Dialog open={open} title="Xác nhận" onOpenChange={setOpen}>
            <Button data-autofocus>Đầu tiên</Button>
            <Button>Cuối cùng</Button>
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Mở xác nhận' });
    opener.focus();
    fireEvent.click(opener);
    const first = await screen.findByRole('button', { name: 'Đầu tiên' });
    const last = screen.getByRole('button', { name: 'Cuối cùng' });
    const close = screen.getByRole('button', { name: 'Đóng hộp thoại' });
    last.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    first.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('mobile sidebar dua focus vao menu va tra focus khi Escape', async () => {
    const user: AdminUserView = {
      id: 'u1',
      name: 'Nguyen Van A',
      email: 'admin@example.com',
      role: 'admin',
      last_login_at: null,
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminShell user={user} publicSiteUrl="https://www.example.com">
          <p>Nội dung</p>
        </AdminShell>
      </QueryClientProvider>,
    );
    const opener = screen.getByRole('button', { name: 'Mở điều hướng' });
    fireEvent.click(opener);
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /LT Vietnam Admin/i })[1]).toBeInTheDocument(),
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(opener).toHaveFocus();
  });

  it('dashboard khong render PII inquiry', () => {
    const dashboard: AdminDashboardView = {
      generated_at: '2026-08-11T02:00:00.000Z',
      content: { products: 1, services: 2, projects: 3, posts: 4, pages: 5 },
      inquiries: { unhandled: 1, last_30_days: 2, email_pending: 0, email_failed: 1 },
      recent_inquiries: [
        {
          id: 'i1',
          inquiry_type: 'quotation',
          email_status: 'email_failed',
          handled: false,
          created_at: '2026-08-11T01:00:00.000Z',
        },
      ],
    };
    const { container } = render(<DashboardOverview dashboard={dashboard} />);
    expect(screen.getByText('Báo giá')).toBeInTheDocument();
    expect(container.textContent).not.toContain('admin@example.com');
    expect(container.textContent).not.toContain('Nguyen Van A');
  });
});
