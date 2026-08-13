'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { bootstrapAdmin } from './api';
import { AuthError } from './AuthError';

const setupSchema = z
  .object({
    name: z.string().trim().min(1, 'Hãy nhập họ tên').max(150),
    email: z.string().trim().email('Email không hợp lệ').max(320),
    password: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự').max(200),
    confirm_password: z.string().min(1, 'Hãy nhập lại mật khẩu'),
  })
  .refine((value) => value.password === value.confirm_password, {
    path: ['confirm_password'],
    message: 'Mật khẩu nhập lại chưa khớp',
  });
type SetupFormValue = z.infer<typeof setupSchema>;

export function SetupForm() {
  const form = useForm<SetupFormValue>({
    resolver: zodResolver(setupSchema),
    defaultValues: { name: '', email: '', password: '', confirm_password: '' },
  });
  const mutation = useMutation({
    mutationFn: (value: SetupFormValue) =>
      bootstrapAdmin({ name: value.name, email: value.email, password: value.password }),
    onSuccess: () => window.location.assign('/login?setup=success'),
  });
  return (
    <form className="auth-form" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
      <div className="auth-form__heading">
        <span className="auth-form__icon">
          <ShieldCheck size={22} />
        </span>
        <div>
          <p>Thiết lập một lần</p>
          <h1>Khởi tạo quản trị</h1>
        </div>
      </div>
      <p className="auth-form__intro">Chỉ dùng khi hệ thống chưa có bất kỳ tài khoản nào.</p>
      <AuthError error={mutation.error} />
      <Field
        label="Họ và tên"
        autoComplete="name"
        required
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Field
        label="Mật khẩu"
        type="password"
        autoComplete="new-password"
        required
        description="Ít nhất 12 ký tự."
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Field
        label="Nhập lại mật khẩu"
        type="password"
        autoComplete="new-password"
        required
        error={form.formState.errors.confirm_password?.message}
        {...form.register('confirm_password')}
      />
      <Button type="submit" loading={mutation.isPending}>
        Tạo tài khoản quản trị
      </Button>
      <p className="auth-form__footnote">
        Đã thiết lập? <Link href="/login">Về đăng nhập</Link>
      </p>
    </form>
  );
}
