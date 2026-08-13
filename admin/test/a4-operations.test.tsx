import type { AdminSettingView, InquiryView } from '@ltv/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { InquiryInbox } from '@/features/operations/InquiryInbox';
import { buildSettingsPatch, SettingsManager } from '@/features/operations/SettingsManager';

const secret: AdminSettingView = {
  id: 's1',
  group: 'email',
  key: 'smtp_password',
  value: '********',
  value_type: 'encrypted',
  is_public: false,
  is_encrypted: true,
  masked: true,
};
const inquiry: InquiryView = {
  id: 'i1',
  inquiry_type: 'quotation',
  full_name: 'Nguyen Van A',
  company_name: null,
  phone: '0900000000',
  email: 'a@example.com',
  message: 'Can bao gia',
  product_id: null,
  service_id: null,
  source_url: '/lien-he',
  locale: 'vi',
  preferred_contact_method: 'phone',
  province: null,
  privacy_consent_at: new Date(0).toISOString(),
  email_status: 'email_failed',
  handled_at: null,
  handled_by: null,
  created_at: new Date(0).toISOString(),
  expires_at: null,
};
function wrap(children: React.ReactNode) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('A4 admin operations', () => {
  it('khong render gia tri che va khong gui lai ********', () => {
    const { container } = render(wrap(<SettingsManager initial={[secret]} />));
    expect(container.innerHTML).not.toContain('********');
    expect(buildSettingsPatch([secret], { 'email.smtp_password': '********' })).toEqual({});
    expect(buildSettingsPatch([secret], { 'email.smtp_password': 'mat-khau-moi' })).toEqual({
      smtp_password: 'mat-khau-moi',
    });
  });

  it('email_failed noi bat va hop thu khong co truong ghi chu CRM', () => {
    render(
      wrap(
        <InquiryInbox
          initial={{
            data: [inquiry],
            meta: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
          }}
        />,
      ),
    );
    expect(screen.getByText('Gửi lỗi — cần kiểm tra')).toBeInTheDocument();
    expect(screen.getAllByText('Chưa xử lý').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/ghi chú/i)).not.toBeInTheDocument();
  });
});
