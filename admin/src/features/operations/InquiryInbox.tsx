'use client';

import type { InquiryView } from '@ltv/contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { FilterBar } from '@/components/data-table/FilterBar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AdminPage } from '@/lib/api/envelope';
import { formatDateTime, queryString } from '@/lib/format';
import { listInquiries, operationKeys } from './api';

const TYPES: Readonly<Record<InquiryView['inquiry_type'], string>> = {
  quotation: 'Báo giá',
  product_consultation: 'Tư vấn sản phẩm',
  technical_support: 'Hỗ trợ kỹ thuật',
  maintenance_repair: 'Bảo trì / sửa chữa',
  partnership: 'Hợp tác',
  general_contact: 'Liên hệ chung',
};

export function InquiryInbox({ initial }: { readonly initial: AdminPage<InquiryView> }) {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [handled, setHandled] = useState('false');
  const [page, setPage] = useState(1);
  const query = queryString({ type, status, handled, page, page_size: 20 });
  const result = useQuery({
    queryKey: operationKeys.inquiries(query),
    queryFn: () => listInquiries(query),
    initialData: query === '?handled=false&page=1&page_size=20' ? initial : undefined,
  });
  const columns: readonly DataColumn<InquiryView>[] = [
    {
      id: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <div className="table-primary">
          <Link href={`/inquiries/${row.id}`}>{row.full_name}</Link>
          <small>{row.company_name ?? row.email ?? row.phone ?? 'Chưa có thông tin phụ'}</small>
        </div>
      ),
    },
    { id: 'type', header: 'Nhu cầu', render: (row) => TYPES[row.inquiry_type] },
    {
      id: 'email',
      header: 'Gửi email',
      render: (row) => (
        <StatusBadge
          tone={
            row.email_status === 'email_failed'
              ? 'danger'
              : row.email_status === 'email_sent'
                ? 'success'
                : 'warning'
          }
        >
          {row.email_status === 'email_failed'
            ? 'Gửi lỗi — cần kiểm tra'
            : row.email_status === 'email_sent'
              ? 'Đã gửi'
              : 'Đang chờ'}
        </StatusBadge>
      ),
    },
    {
      id: 'handled',
      header: 'Xử lý',
      render: (row) => (
        <StatusBadge tone={row.handled_at ? 'success' : 'info'}>
          {row.handled_at ? 'Đã xử lý' : 'Chưa xử lý'}
        </StatusBadge>
      ),
    },
    { id: 'created', header: 'Tiếp nhận', render: (row) => formatDateTime(row.created_at) },
    {
      id: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <Link className="button button--secondary table-action" href={`/inquiries/${row.id}`}>
          Xem chi tiết
        </Link>
      ),
    },
  ];
  return (
    <section className="panel catalogue-list-panel">
      <div className="catalogue-list-panel__heading">
        <div>
          <h2>Hộp thư yêu cầu</h2>
          <p>Chưa xử lý và lỗi gửi email được ưu tiên trước.</p>
        </div>
        <strong>{result.data?.meta.total_items ?? 0} yêu cầu</strong>
      </div>
      <FilterBar>
        <Select
          label="Loại yêu cầu"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {Object.entries(TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Trạng thái email"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="email_failed">Gửi lỗi</option>
          <option value="email_pending">Đang chờ</option>
          <option value="email_sent">Đã gửi</option>
        </Select>
        <Select
          label="Tình trạng xử lý"
          value={handled}
          onChange={(e) => {
            setHandled(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="false">Chưa xử lý</option>
          <option value="true">Đã xử lý</option>
        </Select>
      </FilterBar>
      {result.isLoading ? <LoadingState label="Đang tải yêu cầu…" /> : null}
      {result.error ? (
        <ErrorState
          message={result.error instanceof Error ? result.error.message : 'Không thể tải yêu cầu.'}
        />
      ) : null}
      {result.data ? (
        <>
          <DataTable
            rows={result.data.data}
            columns={columns}
            rowKey={(row) => row.id}
            caption="Danh sách yêu cầu khách hàng"
            emptyTitle="Không có yêu cầu phù hợp"
          />
          <div className="pagination">
            <span>
              Trang {result.data.meta.page} / {Math.max(1, result.data.meta.total_pages)}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                disabled={page >= result.data.meta.total_pages}
                onClick={() => setPage((v) => v + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
