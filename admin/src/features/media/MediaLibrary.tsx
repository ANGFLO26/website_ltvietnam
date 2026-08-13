'use client';

import type { MediaAdminView } from '@ltv/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, UploadCloud, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AdminPage } from '@/lib/api/envelope';
import { FilterBar, SearchField } from '@/components/data-table/FilterBar';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { catalogueKeys, listMedia, uploadMedia } from '@/features/catalogue/api';
import { formatBytes, formatDateTime, queryString } from '@/lib/format';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 20 * 1024 * 1024;
type QueueItem = {
  readonly name: string;
  readonly status: 'uploading' | 'done' | 'error';
  readonly message?: string;
};

export function MediaLibrary({ initial }: { readonly initial: AdminPage<MediaAdminView> }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<readonly QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = queryString({ q: search, type, page, page_size: 20 });
  const media = useQuery({
    queryKey: catalogueKeys.media(query),
    queryFn: () => listMedia(query),
    initialData: query === '?page=1&page_size=20' ? initial : undefined,
  });
  const totalLabel = useMemo(
    () => `${media.data?.meta.total_items ?? 0} tệp`,
    [media.data?.meta.total_items],
  );

  async function upload(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    const selected = [...files];
    setUploading(true);
    setQueue(selected.map((file) => ({ name: file.name, status: 'uploading' })));
    let successes = 0;
    for (const file of selected) {
      if (!ALLOWED.has(file.type) || file.size > MAX_BYTES) {
        setQueue((current) =>
          current.map((item) =>
            item.name === file.name
              ? {
                  ...item,
                  status: 'error',
                  message: !ALLOWED.has(file.type) ? 'Định dạng không hỗ trợ' : 'Vượt quá 20 MB',
                }
              : item,
          ),
        );
        continue;
      }
      const body = new FormData();
      body.set('file', file);
      body.set('title', file.name.replace(/\.[^.]+$/, ''));
      try {
        await uploadMedia(body);
        successes += 1;
        setQueue((current) =>
          current.map((item) => (item.name === file.name ? { ...item, status: 'done' } : item)),
        );
      } catch (error) {
        setQueue((current) =>
          current.map((item) =>
            item.name === file.name
              ? {
                  ...item,
                  status: 'error',
                  message: error instanceof Error ? error.message : 'Upload thất bại',
                }
              : item,
          ),
        );
      }
    }
    setUploading(false);
    if (successes > 0) {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'media'] });
      toast.show(`Đã tải lên ${successes}/${selected.length} tệp.`, 'success');
    }
  }

  return (
    <div className="catalogue-stack">
      <section className="panel media-upload-panel">
        <div>
          <h2>Tải tệp mới</h2>
          <p>
            JPEG, PNG, WebP hoặc PDF; tối đa 20 MB mỗi tệp. Hệ thống kiểm tra cả MIME và magic
            bytes.
          </p>
        </div>
        <label className={`media-upload-dropzone${uploading ? ' is-disabled' : ''}`}>
          <UploadCloud size={24} aria-hidden="true" />
          <span>{uploading ? 'Đang tải lên…' : 'Chọn một hoặc nhiều tệp'}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={uploading}
            onChange={(event) => {
              void upload(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {queue.length ? (
          <ul className="upload-queue" aria-live="polite">
            {queue.map((item) => (
              <li key={item.name}>
                {item.status === 'done' ? (
                  <CheckCircle2 size={17} />
                ) : item.status === 'error' ? (
                  <XCircle size={17} />
                ) : (
                  <span className="button__spinner" />
                )}
                <span>{item.name}</span>
                <small>
                  {item.message ?? (item.status === 'done' ? 'Hoàn tất' : 'Đang xử lý')}
                </small>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Thư viện</h2>
            <p>{totalLabel}</p>
          </div>
          <FilterBar>
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tên tệp, tiêu đề, alt…"
            />
            <Select
              label="Loại tệp"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="image">Hình ảnh</option>
              <option value="document">Tài liệu PDF</option>
            </Select>
          </FilterBar>
        </div>
        {media.isLoading ? <LoadingState label="Đang tải thư viện…" /> : null}
        {media.error ? (
          <ErrorState
            message={media.error instanceof Error ? media.error.message : 'Không thể tải media.'}
          />
        ) : null}
        {media.data ? (
          <>
            <div className="media-library-grid">
              {media.data.data.map((item) => (
                <Link key={item.id} href={`/media/${item.id}`} className="media-library-card">
                  <div className="media-library-card__preview">
                    <MediaThumbnail media={item} size={220} />
                  </div>
                  <div className="media-library-card__body">
                    <strong>{item.title ?? item.original_name}</strong>
                    <span>
                      {formatBytes(item.file_size_bytes)} · {formatDateTime(item.created_at)}
                    </span>
                    {item.mime_type.startsWith('image/') && !item.alt_text ? (
                      <small className="media-warning">
                        <AlertTriangle size={13} /> Thiếu alt text
                      </small>
                    ) : null}
                  </div>
                </Link>
              ))}
              {media.data.data.length === 0 ? <p>Không có media phù hợp với bộ lọc.</p> : null}
            </div>
            <div className="pagination">
              <span>
                Trang {media.data.meta.page} / {Math.max(1, media.data.meta.total_pages)}
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
                  disabled={page >= media.data.meta.total_pages}
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
