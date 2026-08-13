'use client';

import type { AdminBannerLinkType, AdminBannerView, MediaAdminView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Send } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import type { OperationOption } from './options.server';
import { bannerLifecycle, createBanner, operationKeys, updateBanner } from './api';

type Form = {
  id: string | null;
  image_id: string | null;
  mobile_image_id: string | null;
  title: string;
  subtitle: string;
  button_label: string;
  image_alt: string;
  link_type: AdminBannerLinkType;
  link_target_id: string;
  custom_url: string;
  open_new_tab: boolean;
  display_order: number;
  start_at: string;
  end_at: string;
  status: AdminBannerView['status'];
};
const empty = (): Form => ({
  id: null,
  image_id: null,
  mobile_image_id: null,
  title: '',
  subtitle: '',
  button_label: '',
  image_alt: '',
  link_type: 'none',
  link_target_id: '',
  custom_url: '',
  open_new_tab: false,
  display_order: 0,
  start_at: '',
  end_at: '',
  status: 'draft',
});
const LINKS: Readonly<Record<AdminBannerLinkType, string>> = {
  none: 'Không liên kết',
  custom_url: 'URL tùy chỉnh',
  product: 'Sản phẩm',
  product_category: 'Danh mục sản phẩm',
  brand: 'Thương hiệu',
  service: 'Dịch vụ',
  project: 'Dự án',
  post: 'Bài viết',
  page: 'Trang nội dung',
};

export function BannerManager({
  initial,
  media,
  targets,
}: {
  readonly initial: readonly AdminBannerView[];
  readonly media: readonly MediaAdminView[];
  readonly targets: Readonly<Record<string, readonly OperationOption[]>>;
}) {
  const [rows, setRows] = useState([...initial]);
  const [form, setForm] = useState<Form>(empty);
  const baseline = form.id ? rows.find((row) => row.id === form.id) : null;
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(baseline ? from(baseline) : empty()));
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = (value: AdminBannerView) => {
    setRows((current) => [value, ...current.filter((x) => x.id !== value.id)]);
    setForm(from(value));
    void qc.invalidateQueries({ queryKey: operationKeys.banners });
  };
  const save = useMutation({
    mutationFn: () => {
      if (!form.image_id) throw new Error('Hãy chọn ảnh desktop.');
      const body = {
        image_id: form.image_id,
        mobile_image_id: form.mobile_image_id,
        title: form.title,
        subtitle: form.subtitle || null,
        button_label: form.button_label || null,
        image_alt: form.image_alt || null,
        link_type: form.link_type,
        link_target_id: internal(form.link_type) ? form.link_target_id || null : null,
        custom_url: form.link_type === 'custom_url' ? form.custom_url || null : null,
        open_new_tab: form.open_new_tab,
        display_order: form.display_order,
        start_at: toIso(form.start_at),
        end_at: toIso(form.end_at),
      };
      return form.id ? updateBanner(form.id, body) : createBanner(body);
    },
    onSuccess: (value) => {
      refresh(value);
      toast.show('Đã lưu banner.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu banner.', 'danger'),
  });
  const publish = useMutation({
    mutationFn: () =>
      form.id
        ? bannerLifecycle(form.id, form.status === 'published' ? 'hide' : 'publish')
        : Promise.reject(new Error('Hãy lưu banner trước.')),
    onSuccess: (value) => {
      refresh(value);
      toast.show(value.status === 'published' ? 'Đã xuất bản banner.' : 'Đã ẩn banner.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể cập nhật.', 'danger'),
  });
  const columns: readonly DataColumn<AdminBannerView>[] = [
    {
      id: 'title',
      header: 'Banner',
      render: (row) => (
        <div className="table-primary">
          <button type="button" className="table-link" onClick={() => setForm(from(row))}>
            {row.title}
          </button>
          <small>{LINKS[row.link_type]}</small>
        </div>
      ),
    },
    {
      id: 'schedule',
      header: 'Lịch hiển thị',
      render: (row) => (
        <span>
          {formatDateTime(row.start_at)} → {formatDateTime(row.end_at)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          tone={
            row.status === 'published' ? 'success' : row.status === 'hidden' ? 'warning' : 'neutral'
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
  ];
  const targetOptions = targets[form.link_type] ?? [];
  return (
    <div className="operation-split">
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Banner</h2>
            <p>{rows.length} banner</p>
          </div>
          <Button icon={<Plus size={17} />} onClick={() => setForm(empty())}>
            Tạo mới
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Danh sách banner"
        />
      </section>
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{form.id ? 'Chỉnh sửa banner' : 'Thêm banner'}</h2>
            <p>Ảnh mobile là tùy chọn; khi bỏ trống hệ thống dùng ảnh desktop.</p>
          </div>
        </div>
        <div className="banner-media-grid">
          <MediaPicker
            label="Ảnh desktop"
            value={media.find((x) => x.id === form.image_id) ?? null}
            onChange={(value) => setForm({ ...form, image_id: value?.id ?? null })}
          />
          <MediaPicker
            label="Ảnh mobile"
            value={media.find((x) => x.id === form.mobile_image_id) ?? null}
            onChange={(value) => setForm({ ...form, mobile_image_id: value?.id ?? null })}
          />
        </div>
        <Field
          label="Tiêu đề"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          label="Phụ đề"
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
        <div className="form-grid form-grid--two">
          <Field
            label="Nhãn nút"
            value={form.button_label}
            onChange={(e) => setForm({ ...form, button_label: e.target.value })}
          />
          <Field
            label="Alt ảnh"
            value={form.image_alt}
            onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
          />
          <Select
            label="Loại liên kết"
            value={form.link_type}
            onChange={(e) =>
              setForm({
                ...form,
                link_type: e.target.value as AdminBannerLinkType,
                link_target_id: '',
                custom_url: '',
              })
            }
          >
            {Object.entries(LINKS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {internal(form.link_type) ? (
            <Select
              label="Nội dung đích"
              value={form.link_target_id}
              onChange={(e) => setForm({ ...form, link_target_id: e.target.value })}
            >
              <option value="">Chọn nội dung…</option>
              {targetOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </Select>
          ) : form.link_type === 'custom_url' ? (
            <Field
              label="URL đích"
              description="Chỉ HTTPS hoặc đường dẫn nội bộ."
              value={form.custom_url}
              onChange={(e) => setForm({ ...form, custom_url: e.target.value })}
            />
          ) : (
            <div className="operation-note">Banner này không có liên kết.</div>
          )}
          <Field
            label="Bắt đầu"
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm({ ...form, start_at: e.target.value })}
          />
          <Field
            label="Kết thúc"
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm({ ...form, end_at: e.target.value })}
          />
          <Field
            label="Thứ tự"
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
          />
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.open_new_tab}
            onChange={(e) => setForm({ ...form, open_new_tab: e.target.checked })}
          />
          <span>Mở liên kết trong tab mới</span>
        </label>
        <div className="operation-actions">
          <Button loading={save.isPending} icon={<Save size={17} />} onClick={() => save.mutate()}>
            Lưu
          </Button>
          {form.id ? (
            <Button
              variant="secondary"
              loading={publish.isPending}
              icon={<Send size={17} />}
              onClick={() => publish.mutate()}
            >
              {form.status === 'published' ? 'Ẩn' : 'Xuất bản'}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
function internal(type: AdminBannerLinkType) {
  return type !== 'none' && type !== 'custom_url';
}
function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
function local(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}
function from(row: AdminBannerView): Form {
  return {
    id: row.id,
    image_id: row.image_id,
    mobile_image_id: row.mobile_image_id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    button_label: row.button_label ?? '',
    image_alt: row.image_alt ?? '',
    link_type: row.link_type,
    link_target_id: row.link_target_id ?? '',
    custom_url: row.custom_url ?? '',
    open_new_tab: row.open_new_tab,
    display_order: row.display_order,
    start_at: local(row.start_at),
    end_at: local(row.end_at),
    status: row.status,
  };
}
