'use client';

import type { InquiryView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import { markInquiryHandled } from './api';

export function InquiryDetail({ initial }: { readonly initial: InquiryView }) {
  const [inquiry, setInquiry] = useState(initial);
  const queryClient = useQueryClient();
  const toast = useToast();
  const handled = useMutation({
    mutationFn: () => markInquiryHandled(inquiry.id),
    onSuccess: (value) => {
      setInquiry(value);
      void queryClient.invalidateQueries({ queryKey: ['operations', 'inquiries'] });
      toast.show('Đã đánh dấu yêu cầu là đã xử lý.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể cập nhật.', 'danger'),
  });
  return (
    <div className="operation-detail-grid">
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{inquiry.full_name}</h2>
            <p>{inquiry.company_name ?? 'Khách hàng cá nhân'}</p>
          </div>
          <StatusBadge tone={inquiry.handled_at ? 'success' : 'info'}>
            {inquiry.handled_at ? 'Đã xử lý' : 'Chưa xử lý'}
          </StatusBadge>
        </div>
        {inquiry.email_status === 'email_failed' ? (
          <div className="operation-alert operation-alert--danger">
            <MailWarning size={20} />
            <div>
              <strong>Email thông báo gửi thất bại</strong>
              <p>
                Hãy chủ động liên hệ khách hàng bằng thông tin bên dưới và kiểm tra cấu hình email.
              </p>
            </div>
          </div>
        ) : null}
        <dl className="operation-details">
          <Detail label="Email" value={inquiry.email} />
          <Detail label="Điện thoại" value={inquiry.phone} />
          <Detail label="Kênh liên hệ mong muốn" value={inquiry.preferred_contact_method} />
          <Detail label="Tỉnh / thành" value={inquiry.province} />
          <Detail label="Ngôn ngữ" value={inquiry.locale.toUpperCase()} />
          <Detail label="Tiếp nhận" value={formatDateTime(inquiry.created_at)} />
          <Detail label="Nguồn" value={inquiry.source_url} />
          <Detail label="Đồng ý riêng tư" value={formatDateTime(inquiry.privacy_consent_at)} />
        </dl>
        <div className="operation-message">
          <span>Nội dung yêu cầu</span>
          <p>{inquiry.message}</p>
        </div>
      </section>
      <aside className="panel operation-card operation-sidebar">
        <h2>Hoàn tất xử lý</h2>
        <p>
          Trang này là hộp thư tiếp nhận, không lưu ghi chú CRM. Sau khi đã liên hệ hoặc chuyển đúng
          bộ phận, hãy đánh dấu hoàn tất.
        </p>
        {inquiry.handled_at ? (
          <div className="operation-complete">
            <CheckCircle2 size={20} />
            <span>Đã xử lý lúc {formatDateTime(inquiry.handled_at)}</span>
          </div>
        ) : (
          <Button
            loading={handled.isPending}
            onClick={() => handled.mutate()}
            icon={<CheckCircle2 size={18} />}
          >
            Đánh dấu đã xử lý
          </Button>
        )}
      </aside>
    </div>
  );
}
function Detail({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}
