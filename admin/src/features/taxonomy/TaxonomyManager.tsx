'use client';

import type { AdminTaxonomyKind, AdminTaxonomyListItemView } from '@ltv/contracts';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { AdminPage } from '@/lib/api/envelope';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { FilterBar, SearchField } from '@/components/data-table/FilterBar';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { catalogueKeys, listTaxonomy } from '@/features/catalogue/api';
import { formatDateTime, queryString } from '@/lib/format';
import { TAXONOMY_CONFIG, TAXONOMY_KINDS } from './config';

export function TaxonomyManager({
  kind,
  initial,
}: {
  readonly kind: AdminTaxonomyKind;
  readonly initial: AdminPage<AdminTaxonomyListItemView>;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const query = queryString({
    q: search,
    status,
    include_deleted: includeDeleted,
    page,
    page_size: 20,
  });
  const rows = useQuery({
    queryKey: catalogueKeys.taxonomy(kind, query),
    queryFn: () => listTaxonomy(kind, query),
    initialData: query === '?page=1&page_size=20' ? initial : undefined,
  });
  const config = TAXONOMY_CONFIG[kind];
  const columns: readonly DataColumn<AdminTaxonomyListItemView>[] = [
    {
      id: 'label',
      header: 'Tên',
      render: (row) => (
        <div className="table-primary">
          <Link href={`/taxonomy/${row.kind}/${row.id}`}>{row.label}</Link>
          <small>/{row.slug}</small>
        </div>
      ),
    },
    ...(config.tree
      ? [
          {
            id: 'parent',
            header: 'Cấp cha',
            render: (row: AdminTaxonomyListItemView) => row.parent?.label ?? 'Gốc',
          },
        ]
      : []),
    { id: 'products', header: 'Sản phẩm', render: (row) => row.related_product_count },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          tone={
            row.deleted_at
              ? 'danger'
              : row.status === 'published'
                ? 'success'
                : row.status === 'hidden'
                  ? 'warning'
                  : 'neutral'
          }
        >
          {row.deleted_at ? 'Đã xóa' : statusLabel(row.status)}
        </StatusBadge>
      ),
    },
    { id: 'updated', header: 'Cập nhật', render: (row) => formatDateTime(row.updated_at) },
    {
      id: 'actions',
      header: 'Thao tác',
      render: (row) =>
        row.deleted_at ? (
          <LifecycleActions
            resourcePath={`/admin/${pathOf(kind)}/${row.id}`}
            status={row.status}
            deleted
            queryKey={['catalogue', 'taxonomy', kind]}
          />
        ) : (
          <Link
            className="button button--secondary table-action"
            href={`/taxonomy/${row.kind}/${row.id}`}
          >
            Sửa
          </Link>
        ),
    },
  ];
  return (
    <div className="catalogue-stack">
      <nav className="resource-tabs" aria-label="Nhóm taxonomy">
        {TAXONOMY_KINDS.map((item) => (
          <Link
            key={item}
            href={`/taxonomy?kind=${item}`}
            className={item === kind ? 'is-active' : ''}
          >
            {TAXONOMY_CONFIG[item].plural}
          </Link>
        ))}
      </nav>
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>{config.plural}</h2>
            <p>{rows.data?.meta.total_items ?? 0} bản ghi</p>
          </div>
          <Link className="button button--primary" href={`/taxonomy/new?kind=${kind}`}>
            <Plus size={17} />
            Thêm {config.label.toLowerCase()}
          </Link>
        </div>
        <FilterBar>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={`Tìm ${config.label.toLowerCase()}…`}
          />
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
          <label className="checkbox filter-checkbox">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => {
                setIncludeDeleted(event.target.checked);
                setPage(1);
              }}
            />
            <span>Hiện đã xóa</span>
          </label>
        </FilterBar>
        {rows.isLoading ? <LoadingState label="Đang tải taxonomy…" /> : null}
        {rows.error ? (
          <ErrorState
            message={rows.error instanceof Error ? rows.error.message : 'Không thể tải dữ liệu.'}
          />
        ) : null}
        {rows.data ? (
          <>
            <DataTable
              rows={rows.data.data}
              columns={columns}
              rowKey={(row) => row.id}
              caption={config.plural}
            />
            <div className="pagination">
              <span>
                Trang {rows.data.meta.page} / {Math.max(1, rows.data.meta.total_pages)}
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
                  disabled={page >= rows.data.meta.total_pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function pathOf(kind: AdminTaxonomyKind): string {
  return {
    brand: 'brands',
    product_category: 'product-categories',
    standard: 'standards',
    application: 'applications',
    industry: 'industries',
  }[kind];
}
function statusLabel(status: string): string {
  return status === 'published'
    ? 'Đã xuất bản'
    : status === 'hidden'
      ? 'Đã ẩn'
      : status === 'archived'
        ? 'Lưu trữ'
        : 'Bản nháp';
}
