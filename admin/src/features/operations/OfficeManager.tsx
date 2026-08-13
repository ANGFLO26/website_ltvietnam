'use client';

import type { AdminOfficeType, AdminOfficeView, MediaAdminView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MapPin, Plus, Save, Send } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { createOffice, officeLifecycle, operationKeys, updateOffice } from './api';

type Form = {
  id: string | null;
  office_type: AdminOfficeType;
  name: string;
  address: string;
  working_hours: string;
  description: string;
  phone: string;
  fax: string;
  email: string;
  map_url: string;
  latitude: string;
  longitude: string;
  featured_image_id: string | null;
  display_order: number;
  status: AdminOfficeView['status'];
};
const empty = (): Form => ({
  id: null,
  office_type: 'head_office',
  name: '',
  address: '',
  working_hours: '',
  description: '',
  phone: '',
  fax: '',
  email: '',
  map_url: '',
  latitude: '',
  longitude: '',
  featured_image_id: null,
  display_order: 0,
  status: 'draft',
});
const TYPES: Readonly<Record<AdminOfficeType, string>> = {
  head_office: 'Trụ sở chính',
  branch: 'Chi nhánh',
  representative_office: 'Văn phòng đại diện',
  service_center: 'Trung tâm dịch vụ',
  workshop: 'Xưởng',
};

export function OfficeManager({
  initial,
  media,
}: {
  readonly initial: readonly AdminOfficeView[];
  readonly media: readonly MediaAdminView[];
}) {
  const [rows, setRows] = useState([...initial]);
  const [form, setForm] = useState<Form>(empty);
  const baseline = form.id ? rows.find((row) => row.id === form.id) : null;
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(baseline ? from(baseline) : empty()));
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = (value: AdminOfficeView) => {
    setRows((current) => [value, ...current.filter((x) => x.id !== value.id)]);
    setForm(from(value));
    void qc.invalidateQueries({ queryKey: operationKeys.offices });
  };
  const save = useMutation({
    mutationFn: () => {
      if ((form.latitude === '') !== (form.longitude === ''))
        throw new Error('Vĩ độ và kinh độ phải được nhập cùng nhau.');
      const body = {
        office_type: form.office_type,
        name: form.name,
        address: form.address,
        working_hours: form.working_hours || null,
        description: form.description || null,
        phone: form.phone || null,
        fax: form.fax || null,
        email: form.email || null,
        map_url: form.map_url || null,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        featured_image_id: form.featured_image_id,
        display_order: form.display_order,
      };
      return form.id ? updateOffice(form.id, body) : createOffice(body);
    },
    onSuccess: (value) => {
      refresh(value);
      toast.show('Đã lưu văn phòng.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu.', 'danger'),
  });
  const publish = useMutation({
    mutationFn: () =>
      form.id
        ? officeLifecycle(form.id, form.status === 'published' ? 'hide' : 'publish')
        : Promise.reject(new Error('Hãy lưu văn phòng trước.')),
    onSuccess: (value) => {
      refresh(value);
      toast.show(
        value.status === 'published' ? 'Đã xuất bản văn phòng.' : 'Đã ẩn văn phòng.',
        'success',
      );
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể cập nhật.', 'danger'),
  });
  const columns: readonly DataColumn<AdminOfficeView>[] = [
    {
      id: 'name',
      header: 'Văn phòng',
      render: (row) => (
        <div className="table-primary">
          <button type="button" className="table-link" onClick={() => setForm(from(row))}>
            {row.name}
          </button>
          <small>{row.address}</small>
        </div>
      ),
    },
    { id: 'type', header: 'Loại', render: (row) => TYPES[row.office_type] },
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
  const selectedMedia = media.find((item) => item.id === form.featured_image_id) ?? null;
  const hasCoords =
    form.latitude !== '' &&
    form.longitude !== '' &&
    Number.isFinite(Number(form.latitude)) &&
    Number.isFinite(Number(form.longitude));
  const mapHref = hasCoords
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`
    : null;
  return (
    <div className="operation-split">
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Địa điểm hoạt động</h2>
            <p>{rows.length} văn phòng</p>
          </div>
          <Button icon={<Plus size={17} />} onClick={() => setForm(empty())}>
            Tạo mới
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Danh sách văn phòng"
        />
      </section>
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{form.id ? 'Chỉnh sửa văn phòng' : 'Thêm văn phòng'}</h2>
            <p>Tọa độ hợp lệ sẽ tạo bản xem trước vị trí.</p>
          </div>
        </div>
        <div className="form-grid form-grid--two">
          <Select
            label="Loại văn phòng"
            value={form.office_type}
            onChange={(e) => setForm({ ...form, office_type: e.target.value as AdminOfficeType })}
          >
            {Object.entries(TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Field
            label="Tên"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Field
            label="Giờ làm việc"
            value={form.working_hours}
            onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
          />
          <Field
            label="Thứ tự"
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
          />
        </div>
        <Textarea
          label="Địa chỉ"
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Textarea
          label="Mô tả"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Field
          label="URL bản đồ"
          description="Chỉ HTTPS hoặc đường dẫn nội bộ."
          value={form.map_url}
          onChange={(e) => setForm({ ...form, map_url: e.target.value })}
        />
        <div className="form-grid form-grid--two">
          <Field
            label="Vĩ độ"
            type="number"
            min={-90}
            max={90}
            step="any"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
          />
          <Field
            label="Kinh độ"
            type="number"
            min={-180}
            max={180}
            step="any"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
          />
        </div>
        {mapHref ? (
          <a className="map-preview" href={mapHref} target="_blank" rel="noreferrer">
            <MapPin size={24} />
            <div>
              <strong>Xem vị trí trên bản đồ</strong>
              <span>
                {form.latitude}, {form.longitude}
              </span>
            </div>
            <ExternalLink size={17} />
          </a>
        ) : (
          <div className="operation-note">Nhập đủ vĩ độ và kinh độ để xem trước vị trí.</div>
        )}
        <MediaPicker
          label="Chọn ảnh văn phòng"
          value={selectedMedia}
          onChange={(value) => setForm({ ...form, featured_image_id: value?.id ?? null })}
        />
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
function from(row: AdminOfficeView): Form {
  return {
    id: row.id,
    office_type: row.office_type,
    name: row.name,
    address: row.address,
    working_hours: row.working_hours ?? '',
    description: row.description ?? '',
    phone: row.phone ?? '',
    fax: row.fax ?? '',
    email: row.email ?? '',
    map_url: row.map_url ?? '',
    latitude: row.latitude?.toString() ?? '',
    longitude: row.longitude?.toString() ?? '',
    featured_image_id: row.featured_image_id,
    display_order: row.display_order,
    status: row.status,
  };
}
