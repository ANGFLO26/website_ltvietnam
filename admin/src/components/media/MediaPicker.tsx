'use client';

import type { MediaAdminView } from '@ltv/contracts';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, Images, X } from 'lucide-react';
import { useState } from 'react';
import { SearchField } from '@/components/data-table/FilterBar';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { catalogueKeys, listMedia } from '@/features/catalogue/api';
import { queryString } from '@/lib/format';

export function MediaPicker({
  value,
  onChange,
  mode = 'image',
  label = 'Chọn media',
}: {
  readonly value: MediaAdminView | null;
  readonly onChange: (media: MediaAdminView | null) => void;
  readonly mode?: 'image' | 'document';
  readonly label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = queryString({ type: mode, q: search, page_size: 60 });
  const media = useQuery({
    queryKey: catalogueKeys.media(query),
    queryFn: () => listMedia(query),
    enabled: open,
  });
  return (
    <div className="media-picker-field">
      <span className="field__label">{label}</span>
      {value ? (
        <div className="media-picker-field__value">
          <MediaThumbnail media={value} size={72} />
          <div>
            <strong>{value.title ?? value.original_name}</strong>
            <small>{value.mime_type}</small>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Bỏ chọn media"
            icon={<X size={17} />}
            onClick={() => onChange(null)}
          />
        </div>
      ) : (
        <p className="field__description">
          Chưa chọn {mode === 'image' ? 'hình ảnh' : 'tài liệu PDF'}.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        icon={mode === 'image' ? <Images size={17} /> : <FileSearch size={17} />}
        onClick={() => setOpen(true)}
      >
        {value ? 'Chọn media khác' : label}
      </Button>
      <Dialog
        open={open}
        title={mode === 'image' ? 'Chọn hình ảnh' : 'Chọn tài liệu PDF'}
        description={
          mode === 'image'
            ? 'Chỉ ảnh JPEG, PNG hoặc WebP được hiển thị.'
            : 'Chỉ tệp PDF bảo vệ được hiển thị.'
        }
        onOpenChange={setOpen}
      >
        <div className="media-picker-dialog">
          <SearchField value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mô tả…" />
          {media.isLoading ? <LoadingState label="Đang tải thư viện…" /> : null}
          {media.error ? (
            <ErrorState
              message={media.error instanceof Error ? media.error.message : 'Không thể tải media.'}
            />
          ) : null}
          {media.data ? (
            <div className="media-picker-grid">
              {media.data.data
                .filter((item) =>
                  mode === 'image'
                    ? item.mime_type.startsWith('image/')
                    : item.mime_type === 'application/pdf',
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="media-picker-card"
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <MediaThumbnail media={item} size={120} />
                    <span>{item.title ?? item.original_name}</span>
                  </button>
                ))}
              {media.data.data.filter((item) =>
                mode === 'image'
                  ? item.mime_type.startsWith('image/')
                  : item.mime_type === 'application/pdf',
              ).length === 0 ? (
                <p>Không có media phù hợp.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
