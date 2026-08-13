'use client';

import type { AdminContentListItemView, AdminPostCategoryView } from '@ltv/contracts';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { FilterBar, SearchField } from '@/components/data-table/FilterBar';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AdminPage } from '@/lib/api/envelope';
import { queryString } from '@/lib/format';
import { contentKeys, listContent, listPostCategories } from './api';
import type { ContentResourceConfig } from './config';
import { ContentResourceTabs } from './ContentResourceTabs';

type Row = AdminContentListItemView | AdminPostCategoryView;

export function ContentList({
  config,
  initial,
}: {
  readonly config: ContentResourceConfig;
  readonly initial: AdminPage<Row>;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [locale, setLocale] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const query = queryString({
    q: config.resource === 'post-categories' ? '' : search,
    status,
    locale: config.resource === 'post-categories' ? '' : locale,
    include_deleted: config.resource === 'post-categories' ? '' : includeDeleted,
    page,
    page_size: 20,
  });
  const result = useQuery({
    queryKey: contentKeys.list(config.resource, query),
    queryFn: () =>
      config.resource === 'post-categories'
        ? listPostCategories(query)
        : listContent(config.resource, query),
    initialData: query === '?page=1&page_size=20' ? initial : undefined,
  });
  const columns: readonly DataColumn<Row>[] = [
    {
      id: 'title',
      header: config.label,
      render: (row) => (
        <div className="table-primary">
          <Link href={`/content/${config.resource}/${row.id}`}>{titleOf(row)}</Link>
          <small>/{row.slug ?? 'chưa-có-slug'}</small>
        </div>
      ),
    },
    ...(config.resource === 'post-categories'
      ? []
      : ([
          {
            id: 'translations',
            header: 'Bản dịch',
            render: (row: Row) => (
              <div className="translation-badges">
                {(['vi', 'en'] as const).map((item) => {
                  const translation =
                    'translations' in row
                      ? row.translations.find((candidate) => candidate.locale === item)
                      : undefined;
                  return (
                    <StatusBadge
                      key={item}
                      tone={
                        translation?.status === 'published'
                          ? 'success'
                          : translation
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {item.toUpperCase()} ·{' '}
                      {translation
                        ? translation.status === 'published'
                          ? 'Công khai'
                          : 'Nháp'
                        : 'Thiếu'}
                    </StatusBadge>
                  );
                })}
              </div>
            ),
          },
        ] as readonly DataColumn<Row>[])),
    {
      id: 'status',
      header: 'Trạng thái khung',
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
              : row.status === 'archived'
                ? 'Lưu trữ'
                : 'Bản nháp'}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      render: (row) =>
        'deleted_at' in row && row.deleted_at ? (
          <LifecycleActions
            resourcePath={`/admin/${config.resource}/${row.id}`}
            status={row.status}
            deleted
            queryKey={['content', config.resource]}
          />
        ) : (
          <Link
            className="button button--secondary table-action"
            href={`/content/${config.resource}/${row.id}`}
          >
            Sửa
          </Link>
        ),
    },
  ];
  return (
    <>
      <ContentResourceTabs active={config.resource} />
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>{config.label}</h2>
            <p>{result.data?.meta.total_items ?? 0} bản ghi</p>
          </div>
          <Link className="button button--primary" href={`/content/${config.resource}/new`}>
            <Plus size={17} />
            Tạo {config.singular}
          </Link>
        </div>
        <FilterBar>
          {config.resource !== 'post-categories' ? (
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tìm theo tiêu đề hoặc slug…"
            />
          ) : null}
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
          {config.resource !== 'post-categories' ? (
            <>
              <Select
                label="Ngôn ngữ ưu tiên"
                value={locale}
                onChange={(event) => {
                  setLocale(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">VI mặc định</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
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
            </>
          ) : null}
        </FilterBar>
        {result.isLoading ? <LoadingState label="Đang tải nội dung…" /> : null}
        {result.error ? (
          <ErrorState
            message={
              result.error instanceof Error ? result.error.message : 'Không thể tải nội dung.'
            }
          />
        ) : null}
        {result.data ? (
          <>
            <DataTable
              rows={result.data.data}
              columns={columns}
              rowKey={(row) => row.id}
              caption={`Danh sách ${config.label}`}
            />
            <div className="pagination">
              <span>
                Trang {result.data.meta.page} / {Math.max(1, result.data.meta.total_pages)}
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
                  disabled={page >= result.data.meta.total_pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}

function titleOf(row: Row): string {
  return 'translations' in row ? (row.title ?? 'Chưa có bản dịch') : row.name;
}
