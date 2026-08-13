'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { adminLoginRequestSchema, type AdminLoginRequest } from '@ltv/contracts';
import { useMutation } from '@tanstack/react-query';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { safeNextPath } from '@/lib/auth/next-path';
import { login } from './api';
import { AuthError } from './AuthError';

export function LoginForm({
  nextPath,
  notice,
}: {
  readonly nextPath?: string;
  readonly notice?: string;
}) {
  const form = useForm<AdminLoginRequest>({
    resolver: zodResolver(adminLoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => window.location.assign(safeNextPath(nextPath)),
  });
  return (
    <form
      className="auth-form"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <div className="auth-form__heading">
        <span className="auth-form__icon">
          <LockKeyhole size={22} />
        </span>
        <div>
          <p>LT Vietnam Admin</p>
          <h1>Đăng nhập quản trị</h1>
        </div>
      </div>
      <p className="auth-form__intro">Sử dụng tài khoản nội bộ được cấp để tiếp tục.</p>
      {notice ? (
        <div className="form-notice" role="status">
          {notice}
        </div>
      ) : null}
      <AuthError error={mutation.error} />
      <Field
        label="Email"
        type="email"
        autoComplete="username"
        required
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Field
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        required
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <div className="auth-form__links">
        <Link href="/forgot-password">
          <Mail size={15} aria-hidden="true" /> Quên mật khẩu?
        </Link>
      </div>
      <Button
        type="submit"
        loading={mutation.isPending}
        icon={<LogIn size={17} aria-hidden="true" />}
      >
        Đăng nhập
      </Button>
      <p className="auth-form__footnote">
        Hệ thống mới chưa có tài khoản? <Link href="/setup">Khởi tạo quản trị đầu tiên</Link>
      </p>
    </form>
  );
}
