'use client';

import type { MediaAdminView } from '@ltv/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormSection } from '@/components/forms/FormSection';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { updateMedia } from '@/features/catalogue/api';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError } from '@/lib/api/errors';
import { formatBytes, formatDateTime } from '@/lib/format';

const schema = z.object({
  title: z.string().trim().max(255),
  alt_text: z.string().trim().max(500),
  caption: z.string().trim().max(2_000),
  credit: z.string().trim().max(500),
});
type Value = z.infer<typeof schema>;

export function MediaDetailForm({ media }: { readonly media: MediaAdminView }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<Value>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: media.title ?? '',
      alt_text: media.alt_text ?? '',
      caption: media.caption ?? '',
      credit: media.credit ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (value: Value) => updateMedia(media.id, nullable(value)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'media'] });
      toast.show('Đã lưu metadata media.', 'success');
      router.refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => adminBrowserRequest<void>(`/admin/media/${media.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'media'] });
      toast.show('Đã xóa media.', 'success');
      router.push('/media');
    },
    onError: (error) => {
      toast.show(error instanceof AdminApiError ? error.message : 'Không thể xóa media.', 'danger');
      setConfirmDelete(false);
    },
  });
  return (
    <form className="editor-layout" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
      <div className="editor-main">
        <FormSection
          title="Xem trước và metadata"
          description="Chỉ metadata được phép sửa; tệp, MIME và checksum là bất biến."
        >
          <div className="media-detail-preview">
            <MediaThumbnail media={media} size={360} />
          </div>
          <div className="form-grid form-grid--two">
            <Field
              label="Tiêu đề"
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
            <Field
              label="Alt text"
              description={
                media.mime_type.startsWith('image/')
                  ? 'Bắt buộc trước khi ảnh được dùng trên nội dung công khai.'
                  : 'Không áp dụng cho PDF.'
              }
              error={form.formState.errors.alt_text?.message}
              {...form.register('alt_text')}
            />
            <Textarea
              label="Chú thích"
              rows={4}
              error={form.formState.errors.caption?.message}
              {...form.register('caption')}
            />
            <Textarea
              label="Nguồn / bản quyền"
              rows={4}
              error={form.formState.errors.credit?.message}
              {...form.register('credit')}
            />
          </div>
        </FormSection>
        <FormSection
          title="Nơi đang sử dụng"
          description="Media đang được tham chiếu sẽ bị backend chặn xóa."
        >
          {media.usage && media.usage.total > 0 ? (
            <div className="usage-list">
              <strong>{media.usage.total} tham chiếu</strong>
              <ul>
                {media.usage.places.map((place) => (
                  <li
                    key={`${place.source}:${place.entity_type}:${place.entity_id}:${place.field_name}:${place.locale ?? ''}`}
                  >
                    <span>{place.entity_type}</span>
                    <code>
                      {place.field_name}
                      {place.locale ? ` · ${place.locale}` : ''}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Media chưa được sử dụng.</p>
          )}
        </FormSection>
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>Thông tin tệp</h2>
          <dl>
            <div>
              <dt>Tên gốc</dt>
              <dd>{media.original_name}</dd>
            </div>
            <div>
              <dt>MIME</dt>
              <dd>{media.mime_type}</dd>
            </div>
            <div>
              <dt>Dung lượng</dt>
              <dd>{formatBytes(media.file_size_bytes)}</dd>
            </div>
            <div>
              <dt>Kích thước</dt>
              <dd>{media.width && media.height ? `${media.width} × ${media.height}` : '—'}</dd>
            </div>
            <div>
              <dt>Ngày tải</dt>
              <dd>{formatDateTime(media.created_at)}</dd>
            </div>
          </dl>
          <Button type="submit" loading={save.isPending} icon={<Save size={17} />}>
            Lưu thay đổi
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={<Trash2 size={17} />}
            onClick={() => setConfirmDelete(true)}
          >
            Xóa media
          </Button>
          {save.error ? (
            <p className="form-submit-error" role="alert">
              {save.error instanceof Error ? save.error.message : 'Không thể lưu.'}
            </p>
          ) : null}
        </section>
      </aside>
      <Dialog
        open={confirmDelete}
        title="Xóa media?"
        description="Thao tác chỉ thành công khi tệp không còn được sử dụng."
        onOpenChange={setConfirmDelete}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              data-autofocus
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p>
          Nếu backend báo đang được sử dụng, hãy kiểm tra danh sách tham chiếu và gỡ chúng trước.
        </p>
      </Dialog>
    </form>
  );
}

function nullable(value: Value): Record<keyof Value, string | null> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item || null]),
  ) as Record<keyof Value, string | null>;
}
