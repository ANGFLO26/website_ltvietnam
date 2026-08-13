import type { AdminDashboardRecentInquiryView, AdminDashboardView } from '@ltv/contracts';
import { AlertTriangle, Clock3, FileText, Inbox, MailWarning, Package } from 'lucide-react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';

const inquiryLabels: Record<AdminDashboardRecentInquiryView['inquiry_type'], string> = {
  quotation: 'Báo giá',
  product_consultation: 'Tư vấn sản phẩm',
  technical_support: 'Hỗ trợ kỹ thuật',
  maintenance_repair: 'Bảo trì / sửa chữa',
  partnership: 'Hợp tác',
  general_contact: 'Liên hệ chung',
};

export function DashboardOverview({ dashboard }: { readonly dashboard: AdminDashboardView }) {
  const totalContent = Object.values(dashboard.content).reduce((sum, value) => sum + value, 0);
  return (
    <div className="dashboard-grid">
      <section className="metric-grid" aria-label="Chỉ số vận hành">
        <MetricCard
          label="Yêu cầu chưa xử lý"
          value={dashboard.inquiries.unhandled}
          hint="Cần được liên hệ"
          tone={dashboard.inquiries.unhandled > 0 ? 'warning' : 'neutral'}
          icon={<Inbox size={20} />}
        />
        <MetricCard
          label="Email gửi lỗi"
          value={dashboard.inquiries.email_failed}
          hint="Cần kiểm tra ngay"
          tone={dashboard.inquiries.email_failed > 0 ? 'danger' : 'neutral'}
          icon={<MailWarning size={20} />}
        />
        <MetricCard
          label="Yêu cầu 30 ngày"
          value={dashboard.inquiries.last_30_days}
          hint={`${dashboard.inquiries.email_pending} email đang chờ`}
          icon={<Clock3 size={20} />}
        />
        <MetricCard
          label="Nội dung đang quản lý"
          value={totalContent}
          hint="Không tính bản ghi đã xóa"
          icon={<FileText size={20} />}
        />
      </section>

      {dashboard.inquiries.email_failed > 0 ? (
        <div className="operation-alert" role="alert">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Có email yêu cầu khách hàng gửi thất bại</strong>
            <p>Thông tin vẫn được lưu trong hệ thống. Hãy ưu tiên kiểm tra inbox vận hành.</p>
          </div>
        </div>
      ) : null}

      <div className="dashboard-columns">
        <section className="panel dashboard-panel">
          <div className="panel__heading">
            <div>
              <p className="panel__eyebrow">Vận hành</p>
              <h2>Yêu cầu gần đây</h2>
            </div>
            <StatusBadge tone={dashboard.inquiries.unhandled > 0 ? 'warning' : 'success'}>
              {dashboard.inquiries.unhandled} chưa xử lý
            </StatusBadge>
          </div>
          <DataTable
            caption="Yêu cầu khách hàng gần đây đã ẩn thông tin cá nhân"
            rows={dashboard.recent_inquiries}
            rowKey={(row) => row.id}
            emptyTitle="Chưa có yêu cầu"
            emptyDescription="Yêu cầu mới từ website sẽ xuất hiện tại đây."
            columns={recentColumns}
          />
          <p className="privacy-note">
            Dashboard chỉ hiển thị loại, trạng thái và thời gian; không tải PII.
          </p>
        </section>

        <section className="panel dashboard-panel">
          <div className="panel__heading">
            <div>
              <p className="panel__eyebrow">Kho nội dung</p>
              <h2>Quy mô hiện tại</h2>
            </div>
            <Package size={20} aria-hidden="true" />
          </div>
          <dl className="content-counts">
            <CountRow label="Sản phẩm" value={dashboard.content.products} />
            <CountRow label="Dịch vụ" value={dashboard.content.services} />
            <CountRow label="Dự án" value={dashboard.content.projects} />
            <CountRow label="Bài viết" value={dashboard.content.posts} />
            <CountRow label="Trang" value={dashboard.content.pages} />
          </dl>
          <p className="dashboard-updated">Cập nhật lúc {formatDateTime(dashboard.generated_at)}</p>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly tone?: 'neutral' | 'warning' | 'danger';
  readonly icon: React.ReactNode;
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value.toLocaleString('vi-VN')}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function CountRow({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value.toLocaleString('vi-VN')}</dd>
    </div>
  );
}

const recentColumns: readonly DataColumn<AdminDashboardRecentInquiryView>[] = [
  { id: 'type', header: 'Loại yêu cầu', render: (row) => inquiryLabels[row.inquiry_type] },
  {
    id: 'email',
    header: 'Email',
    render: (row) => (
      <StatusBadge
        tone={
          row.email_status === 'email_failed'
            ? 'danger'
            : row.email_status === 'email_pending'
              ? 'warning'
              : 'success'
        }
      >
        {row.email_status === 'email_failed'
          ? 'Gửi lỗi'
          : row.email_status === 'email_pending'
            ? 'Đang chờ'
            : 'Đã gửi'}
      </StatusBadge>
    ),
  },
  {
    id: 'handled',
    header: 'Xử lý',
    render: (row) => (
      <StatusBadge tone={row.handled ? 'success' : 'warning'}>
        {row.handled ? 'Đã xử lý' : 'Chưa xử lý'}
      </StatusBadge>
    ),
  },
  { id: 'created', header: 'Tiếp nhận', render: (row) => formatDateTime(row.created_at) },
];

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
