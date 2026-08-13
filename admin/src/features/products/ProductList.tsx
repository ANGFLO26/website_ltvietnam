'use client';

import type { AdminProductListItemView, AdminTaxonomyListItemView } from '@ltv/contracts';
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
import { catalogueKeys, listProducts } from '@/features/catalogue/api';
import { formatDateTime, queryString } from '@/lib/format';

export function ProductList({
  initial,
  brands,
  categories,
}: {
  readonly initial: AdminPage<AdminProductListItemView>;
  readonly brands: readonly AdminTaxonomyListItemView[];
  readonly categories: readonly AdminTaxonomyListItemView[];
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const query = queryString({
    q: search,
    status,
    brand_id: brand,
    category_id: category,
    include_deleted: includeDeleted,
    page,
    page_size: 20,
  });
  const products = useQuery({
    queryKey: catalogueKeys.products(query),
    queryFn: () => listProducts(query),
    initialData: query === '?page=1&page_size=20' ? initial : undefined,
  });
  const columns: readonly DataColumn<AdminProductListItemView>[] = [
    {
      id: 'product',
      header: 'Sản phẩm',
      render: (row) => (
        <div className="table-primary">
          <Link href={`/products/${row.id}`}>{row.name}</Link>
          <small>{row.model ?? row.internal_code ?? `/${row.slug}`}</small>
        </div>
      ),
    },
    { id: 'brand', header: 'Hãng', render: (row) => row.brand.label },
    {
      id: 'category',
      header: 'Danh mục chính',
      render: (row) => row.primary_category?.label ?? <span className="text-danger">Chưa đặt</span>,
    },
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
          {row.deleted_at
            ? 'Đã xóa'
            : row.status === 'published'
              ? 'Đã xuất bản'
              : row.status === 'hidden'
                ? 'Đã ẩn'
                : 'Bản nháp'}
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
            resourcePath={`/admin/products/${row.id}`}
            status={row.status}
            deleted
            queryKey={['catalogue', 'products']}
          />
        ) : (
          <Link className="button button--secondary table-action" href={`/products/${row.id}`}>
            Sửa
          </Link>
        ),
    },
  ];
  return (
    <section className="panel catalogue-list-panel">
      <div className="catalogue-list-panel__heading">
        <div>
          <h2>Danh sách sản phẩm</h2>
          <p>{products.data?.meta.total_items ?? 0} sản phẩm</p>
        </div>
        <Link className="button button--primary" href="/products/new">
          <Plus size={17} />
          Tạo sản phẩm
        </Link>
      </div>
      <FilterBar>
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tên, model, SKU, mã nội bộ…"
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
        <Select
          label="Hãng"
          value={brand}
          onChange={(event) => {
            setBrand(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả hãng</option>
          {brands.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="Danh mục"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
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
      {products.isLoading ? <LoadingState label="Đang tải sản phẩm…" /> : null}
      {products.error ? (
        <ErrorState
          message={
            products.error instanceof Error ? products.error.message : 'Không thể tải sản phẩm.'
          }
        />
      ) : null}
      {products.data ? (
        <>
          <DataTable
            rows={products.data.data}
            columns={columns}
            rowKey={(row) => row.id}
            caption="Danh sách sản phẩm"
          />
          <div className="pagination">
            <span>
              Trang {products.data.meta.page} / {Math.max(1, products.data.meta.total_pages)}
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
                disabled={page >= products.data.meta.total_pages}
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
