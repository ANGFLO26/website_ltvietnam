'use client';

import type { AdminManagedUserView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, Plus, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import type { AdminPage } from '@/lib/api/envelope';
import { formatDateTime } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { createUser, setUserStatus } from './api';

export function UserManager({
  initial,
  currentUserId,
}: {
  readonly initial: AdminPage<AdminManagedUserView>;
  readonly currentUserId: string;
}) {
  const [rows, setRows] = useState([...initial.data]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useUnsavedChanges(creating && Boolean(name || email || password));
  const toast = useToast();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => createUser({ name, email, password }),
    onSuccess: (value) => {
      setRows((current) => [value, ...current]);
      setCreating(false);
      setName('');
      setEmail('');
      setPassword('');
      toast.show('Đã tạo tài khoản quản trị.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể tạo tài khoản.', 'danger'),
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: AdminManagedUserView['status'] }) =>
      setUserStatus(id, value),
    onSuccess: (value) => {
      setRows((current) => current.map((x) => (x.id === value.id ? value : x)));
      void qc.invalidateQueries({ queryKey: ['operations', 'users'] });
      toast.show('Đã cập nhật trạng thái tài khoản.', 'success');
    },
    onError: (error) =>
      toast.show(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật. Hệ thống không cho khóa chính mình hoặc quản trị viên cuối cùng.',
        'danger',
      ),
  });
  const columns: readonly DataColumn<AdminManagedUserView>[] = [
    {
      id: 'user',
      header: 'Quản trị viên',
      render: (row) => (
        <div className="table-primary">
          <strong>
            {row.name}
            {row.id === currentUserId ? ' (bạn)' : ''}
          </strong>
          <small>{row.email}</small>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge
          tone={
            row.status === 'active' ? 'success' : row.status === 'locked' ? 'danger' : 'warning'
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
    {
      id: 'last',
      header: 'Đăng nhập gần nhất',
      render: (row) => formatDateTime(row.last_login_at),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      render: (row) =>
        row.id === currentUserId ? (
          <small className="field__description">Không thể tự khóa</small>
        ) : row.status === 'active' ? (
          <Button
            variant="secondary"
            loading={status.isPending && status.variables?.id === row.id}
            icon={<LockKeyhole size={16} />}
            onClick={() => status.mutate({ id: row.id, value: 'disabled' })}
          >
            Khóa
          </Button>
        ) : (
          <Button
            variant="secondary"
            loading={status.isPending && status.variables?.id === row.id}
            icon={<UserCheck size={16} />}
            onClick={() => status.mutate({ id: row.id, value: 'active' })}
          >
            Mở khóa
          </Button>
        ),
    },
  ];
  return (
    <>
      <section className="panel catalogue-list-panel">
        <div className="catalogue-list-panel__heading">
          <div>
            <h2>Tài khoản quản trị</h2>
            <p>{rows.length} tài khoản · mọi tài khoản có vai trò admin</p>
          </div>
          <Button icon={<Plus size={17} />} onClick={() => setCreating((v) => !v)}>
            Tạo tài khoản
          </Button>
        </div>
        {creating ? (
          <div className="user-create-form">
            <div className="form-grid form-grid--two">
              <Field
                label="Họ tên"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Field
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label="Mật khẩu ban đầu"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                description="Dùng mật khẩu dài, không dùng lại mật khẩu cá nhân."
              />
            </div>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Tạo tài khoản
            </Button>
          </div>
        ) : null}
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Danh sách tài khoản quản trị"
        />
      </section>
      <div className="operation-note security-note">
        <LockKeyhole size={18} />
        <span>Backend ngăn tự vô hiệu hóa và ngăn khóa quản trị viên hoạt động cuối cùng.</span>
      </div>
    </>
  );
}
