'use client';

import type { AdminDocumentView } from '@ltv/contracts';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { AdminPage } from '@/lib/api/envelope';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { FilterBar, SearchField } from '@/components/data-table/FilterBar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { catalogueKeys, listDocuments } from '@/features/catalogue/api';
import { queryString } from '@/lib/format';

export function DocumentList({ initial }: { readonly initial: AdminPage<AdminDocumentView> }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [visibility, setVisibility] = useState('');
  const [page, setPage] = useState(1);
  const query = queryString({
    q: search,
    status,
    document_type: type,
    visibility,
    page,
    page_size: 20,
  });
  const documents = useQuery({
    queryKey: catalogueKeys.documents(query),
    queryFn: () => listDocuments(query),
    initialData: query === '?page=1&page_size=20' ? initial : undefined,
  });
  const columns: readonly DataColumn<AdminDocumentView>[] = [
    {
      id: 'title',
      header: 'Tài liệu',
      render: (row) => (
        <div className="table-primary">
          <Link href={`/documents/${row.id}`}>{row.title}</Link>
          <small>
            {typeLabel(row.document_type)} · /{row.slug}
          </small>
        </div>
      ),
    },
    { id: 'language', header: 'Ngôn ngữ', render: (row) => row.language.toUpperCase() },
    { id: 'visibility', header: 'Quyền tải', render: (row) => visibilityLabel(row.visibility) },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          tone={
            row.status === 'published' ? 'success' : row.status === 'hidden' ? 'warning' : 'neutral'
          }
        >
          {row.status === 'published'
            ? 'Đã xuất bản'
            : row.status === 'hidden'
              ? 'Đã ẩn'
              : 'Bản nháp'}
        </StatusBadge>
      ),
    },
    { id: 'downloads', header: 'Lượt tải', render: (row) => row.download_count },
    {
      id: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <Link className="button button--secondary table-action" href={`/documents/${row.id}`}>
          Sửa
        </Link>
      ),
    },
  ];
  return (
    <section className="panel catalogue-list-panel">
      <div className="catalogue-list-panel__heading">
        <div>
          <h2>Danh sách tài liệu</h2>
          <p>{documents.data?.meta.total_items ?? 0} tài liệu</p>
        </div>
        <Link className="button button--primary" href="/documents/new">
          <Plus size={17} />
          Thêm tài liệu
        </Link>
      </div>
      <FilterBar>
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tiêu đề hoặc slug…"
        />
        <Select
          label="Loại"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="catalogue">Catalogue</option>
          <option value="brochure">Brochure</option>
          <option value="datasheet">Datasheet</option>
          <option value="manual">Hướng dẫn</option>
          <option value="certificate">Chứng nhận</option>
          <option value="other">Khác</option>
        </Select>
        <Select
          label="Trạng thái"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="hidden">Đã ẩn</option>
        </Select>
        <Select
          label="Quyền tải"
          value={visibility}
          onChange={(event) => {
            setVisibility(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="public">Công khai</option>
          <option value="hidden">Ẩn</option>
          <option value="email_required">Cần email</option>
          <option value="customer_only">Khách hàng</option>
          <option value="staff_only">Nội bộ</option>
        </Select>
      </FilterBar>
      {documents.isLoading ? <LoadingState label="Đang tải tài liệu…" /> : null}
      {documents.error ? (
        <ErrorState
          message={
            documents.error instanceof Error ? documents.error.message : 'Không thể tải tài liệu.'
          }
        />
      ) : null}
      {documents.data ? (
        <>
          <DataTable
            rows={documents.data.data}
            columns={columns}
            rowKey={(row) => row.id}
            caption="Danh sách tài liệu"
          />
          <div className="pagination">
            <span>
              Trang {documents.data.meta.page} / {Math.max(1, documents.data.meta.total_pages)}
            </span>
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= documents.data.meta.total_pages}
                onClick={() => setPage((value) => value + 1)}
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
function typeLabel(value: string): string {
  return (
    {
      catalogue: 'Catalogue',
      brochure: 'Brochure',
      datasheet: 'Datasheet',
      application_note: 'Application note',
      company_profile: 'Hồ sơ công ty',
      manual: 'Hướng dẫn',
      certificate: 'Chứng nhận',
      other: 'Khác',
    }[value] ?? value
  );
}
function visibilityLabel(value: string): string {
  return (
    {
      public: 'Công khai',
      hidden: 'Ẩn',
      email_required: 'Cần email',
      customer_only: 'Khách hàng',
      staff_only: 'Nội bộ',
    }[value] ?? value
  );
}
