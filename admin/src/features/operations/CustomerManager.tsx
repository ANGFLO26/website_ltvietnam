'use client';

import type { AdminCustomerView, AdminTaxonomyListItemView, MediaAdminView } from '@ltv/contracts';
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
import type { AdminPage } from '@/lib/api/envelope';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { createCustomer, customerLifecycle, operationKeys, updateCustomer } from './api';

type Form = {
  id: string | null;
  name: string;
  short_description: string;
  logo_id: string | null;
  industry_id: string;
  website_url: string;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  status: AdminCustomerView['status'];
};
const empty = (): Form => ({
  id: null,
  name: '',
  short_description: '',
  logo_id: null,
  industry_id: '',
  website_url: '',
  is_public: false,
  is_featured: false,
  display_order: 0,
  status: 'draft',
});

export function CustomerManager({
  initial,
  media,
  industries,
}: {
  readonly initial: AdminPage<AdminCustomerView>;
  readonly media: readonly MediaAdminView[];
  readonly industries: readonly AdminTaxonomyListItemView[];
}) {
  const [rows, setRows] = useState([...initial.data]);
  const [form, setForm] = useState<Form>(empty);
  const baseline = form.id ? rows.find((row) => row.id === form.id) : null;
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(baseline ? from(baseline) : empty()));
  const [consent, setConsent] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = (value: AdminCustomerView) => {
    setRows((current) => [value, ...current.filter((item) => item.id !== value.id)]);
    setForm(from(value));
    void qc.invalidateQueries({ queryKey: operationKeys.customers });
  };
  const save = useMutation({
    mutationFn: () => {
      if ((form.is_public || form.is_featured) && !consent)
        throw new Error('Hãy xác nhận doanh nghiệp cho phép công khai logo/tên.');
      const body = {
        name: form.name,
        short_description: form.short_description || null,
        logo_id: form.logo_id,
        industry_id: form.industry_id || null,
        website_url: form.website_url || null,
        is_public: form.is_public,
        is_featured: form.is_featured,
        display_order: form.display_order,
      };
      return form.id ? updateCustomer(form.id, body) : createCustomer(body);
    },
    onSuccess: (value) => {
      refresh(value);
      toast.show('Đã lưu khách hàng.', 'success');
    },
    onError: showError(toast),
  });
  const publish = useMutation({
    mutationFn: () => {
      if (!form.id) throw new Error('Hãy lưu khách hàng trước.');
      if (!consent) throw new Error('Cần xác nhận quyền công khai trước khi xuất bản.');
      return customerLifecycle(form.id, form.status === 'published' ? 'hide' : 'publish');
    },
    onSuccess: (value) => {
      refresh(value);
      toast.show(
        value.status === 'published' ? 'Đã xuất bản khách hàng.' : 'Đã ẩn khách hàng.',
        'success',
      );
    },
    onError: showError(toast),
  });
  const columns: readonly DataColumn<AdminCustomerView>[] = [
    {
      id: 'name',
      header: 'Khách hàng',
      render: (row) => (
        <div className="table-primary">
          <button
            type="button"
            className="table-link"
            onClick={() => {
              setForm(from(row));
              setConsent(false);
            }}
          >
            {row.name}
          </button>
          <small>{row.short_description ?? 'Chưa có mô tả'}</small>
        </div>
      ),
    },
    {
      id: 'featured',
      header: 'Hiển thị',
      render: (row) => (
        <>
          {row.is_featured ? <StatusBadge tone="info">Nổi bật</StatusBadge> : null}{' '}
          {row.is_public ? (
            <StatusBadge tone="success">Công khai</StatusBadge>
          ) : (
            <StatusBadge>Riêng tư</StatusBadge>
          )}
        </>
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
    { id: 'order', header: 'Thứ tự', render: (row) => row.display_order },
  ];
  const selectedMedia = media.find((item) => item.id === form.logo_id) ?? null;
  return (
    <div className="operation-split">
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Khách hàng tiêu biểu</h2>
            <p>{rows.length} khách hàng</p>
          </div>
          <Button
            icon={<Plus size={17} />}
            onClick={() => {
              setForm(empty());
              setConsent(false);
            }}
          >
            Tạo mới
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Danh sách khách hàng"
        />
      </section>
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{form.id ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}</h2>
            <p>Logo chỉ xuất hiện công khai sau khi được xác nhận quyền sử dụng.</p>
          </div>
        </div>
        <div className="form-grid form-grid--two">
          <Field
            label="Tên khách hàng"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Website"
            type="url"
            placeholder="https://…"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
          />
          <Select
            label="Ngành"
            value={form.industry_id}
            onChange={(e) => setForm({ ...form, industry_id: e.target.value })}
          >
            <option value="">Chưa phân loại</option>
            {industries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <Field
            label="Thứ tự"
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
          />
        </div>
        <Textarea
          label="Mô tả ngắn"
          value={form.short_description}
          onChange={(e) => setForm({ ...form, short_description: e.target.value })}
        />
        <MediaPicker
          label="Chọn logo"
          value={selectedMedia}
          onChange={(value) => setForm({ ...form, logo_id: value?.id ?? null })}
        />
        <div className="operation-checks">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            />
            <span>Cho phép hiển thị công khai</span>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            <span>Đưa lên trang chủ</span>
          </label>
          <label className="checkbox privacy-confirm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>Tôi xác nhận khách hàng đã cho phép công khai tên và logo</span>
          </label>
        </div>
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
function from(row: AdminCustomerView): Form {
  return {
    id: row.id,
    name: row.name,
    short_description: row.short_description ?? '',
    logo_id: row.logo_id,
    industry_id: row.industry_id ?? '',
    website_url: row.website_url ?? '',
    is_public: row.is_public,
    is_featured: row.is_featured,
    display_order: row.display_order,
    status: row.status,
  };
}
function showError(toast: ReturnType<typeof useToast>) {
  return (error: Error) => toast.show(error.message, 'danger');
}
