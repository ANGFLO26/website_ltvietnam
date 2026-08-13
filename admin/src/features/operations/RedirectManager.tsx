'use client';

import type { AdminRedirectView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import type { AdminPage } from '@/lib/api/envelope';
import { AdminApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { createRedirect, deleteRedirect, updateRedirect } from './api';

type Form = {
  id: string | null;
  source_path: string;
  target_path: string;
  redirect_type: 301 | 302;
  status: 'active' | 'disabled';
};
const empty = (): Form => ({
  id: null,
  source_path: '/',
  target_path: '/',
  redirect_type: 301,
  status: 'active',
});
export function RedirectManager({ initial }: { readonly initial: AdminPage<AdminRedirectView> }) {
  const [rows, setRows] = useState([...initial.data]);
  const [form, setForm] = useState<Form>(empty);
  const baseline = form.id ? rows.find((row) => row.id === form.id) : null;
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(baseline ? from(baseline) : empty()));
  const toast = useToast();
  const qc = useQueryClient();
  const saved = (value: AdminRedirectView) => {
    setRows((current) => [value, ...current.filter((x) => x.id !== value.id)]);
    setForm(from(value));
    void qc.invalidateQueries({ queryKey: ['operations', 'redirects'] });
  };
  const save = useMutation({
    mutationFn: () =>
      form.id
        ? updateRedirect(form.id, {
            target_path: form.target_path,
            redirect_type: form.redirect_type,
            status: form.status,
          })
        : createRedirect({
            source_path: form.source_path,
            target_path: form.target_path,
            redirect_type: form.redirect_type,
          }),
    onSuccess: (value) => {
      saved(value);
      toast.show('Đã lưu chuyển hướng.', 'success');
    },
    onError: (error) => toast.show(redirectError(error), 'danger'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteRedirect(id),
    onSuccess: (_, id) => {
      setRows((current) => current.filter((x) => x.id !== id));
      setForm(empty());
      toast.show('Đã xóa chuyển hướng.', 'success');
    },
    onError: (error) => toast.show(redirectError(error), 'danger'),
  });
  const columns: readonly DataColumn<AdminRedirectView>[] = [
    {
      id: 'source',
      header: 'Đường dẫn cũ',
      render: (row) => (
        <button type="button" className="table-link" onClick={() => setForm(from(row))}>
          {row.source_path}
        </button>
      ),
    },
    { id: 'target', header: 'Chuyển tới', render: (row) => row.target_path },
    { id: 'type', header: 'Loại', render: (row) => row.redirect_type },
    {
      id: 'hits',
      header: 'Lượt dùng',
      render: (row) => (
        <div className="table-primary">
          <span>{row.hit_count}</span>
          <small>{formatDateTime(row.last_hit_at)}</small>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge tone={row.status === 'active' ? 'success' : 'warning'}>
          {row.status}
        </StatusBadge>
      ),
    },
  ];
  return (
    <div className="operation-split">
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Danh sách chuyển hướng</h2>
            <p>{rows.length} quy tắc</p>
          </div>
          <Button icon={<Plus size={17} />} onClick={() => setForm(empty())}>
            Tạo mới
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Danh sách chuyển hướng"
        />
      </section>
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{form.id ? 'Chỉnh sửa chuyển hướng' : 'Thêm chuyển hướng'}</h2>
            <p>
              Hệ thống tự phát hiện vòng lặp, chuỗi chuyển hướng và xung đột route đang hoạt động.
            </p>
          </div>
        </div>
        <Field
          label="Đường dẫn cũ"
          required
          disabled={Boolean(form.id)}
          value={form.source_path}
          onChange={(e) => setForm({ ...form, source_path: e.target.value })}
          description="Bắt đầu bằng /, ví dụ /san-pham-cu"
        />
        <Field
          label="Đường dẫn đích"
          required
          value={form.target_path}
          onChange={(e) => setForm({ ...form, target_path: e.target.value })}
        />
        <div className="form-grid form-grid--two">
          <Select
            label="Mã chuyển hướng"
            value={form.redirect_type}
            onChange={(e) =>
              setForm({ ...form, redirect_type: Number(e.target.value) as 301 | 302 })
            }
          >
            <option value={301}>301 · Vĩnh viễn</option>
            <option value={302}>302 · Tạm thời</option>
          </Select>
          {form.id ? (
            <Select
              label="Trạng thái"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'] })}
            >
              <option value="active">Hoạt động</option>
              <option value="disabled">Tắt</option>
            </Select>
          ) : null}
        </div>
        <div className="operation-actions">
          <Button loading={save.isPending} icon={<Save size={17} />} onClick={() => save.mutate()}>
            Lưu
          </Button>
          {form.id ? (
            <Button
              variant="danger"
              loading={remove.isPending}
              icon={<Trash2 size={17} />}
              onClick={() => {
                if (window.confirm('Xóa chuyển hướng này?')) remove.mutate(form.id!);
              }}
            >
              Xóa
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
function from(x: AdminRedirectView): Form {
  return {
    id: x.id,
    source_path: x.source_path,
    target_path: x.target_path,
    redirect_type: x.redirect_type,
    status: x.status,
  };
}
function redirectError(error: unknown) {
  if (!(error instanceof AdminApiError))
    return error instanceof Error ? error.message : 'Không thể lưu chuyển hướng.';
  return (
    (
      {
        REDIRECT_LOOP: 'Không thể lưu vì sẽ tạo vòng lặp chuyển hướng.',
        REDIRECT_CHAIN: 'Đích đang chuyển hướng tiếp. Hãy chọn thẳng đường dẫn cuối.',
        REDIRECT_ROUTE_CONFLICT: 'Đường dẫn cũ đang là một trang hoạt động trên website.',
        REDIRECT_SOURCE_CONFLICT: 'Đường dẫn cũ đã có quy tắc chuyển hướng.',
      } as Record<string, string>
    )[error.code] ?? error.message
  );
}
