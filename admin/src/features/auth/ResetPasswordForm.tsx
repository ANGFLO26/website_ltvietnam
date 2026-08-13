'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { resetPassword } from './api';
import { AuthError } from './AuthError';

const resetFormSchema = z
  .object({
    new_password: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự').max(200),
    confirm_password: z.string().min(1, 'Hãy nhập lại mật khẩu'),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    path: ['confirm_password'],
    message: 'Mật khẩu nhập lại chưa khớp',
  });
type ResetForm = z.infer<typeof resetFormSchema>;

export function ResetPasswordForm({ token }: { readonly token: string }) {
  const form = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  });
  const mutation = useMutation({
    mutationFn: (value: ResetForm) => resetPassword({ token, new_password: value.new_password }),
  });
  if (!token) {
    return (
      <div className="auth-form auth-success auth-success--warning">
        <h1>Liên kết không hợp lệ</h1>
        <p>URL thiếu token đặt lại mật khẩu. Hãy yêu cầu một liên kết mới.</p>
        <Link className="button button--secondary" href="/forgot-password">
          Yêu cầu liên kết mới
        </Link>
      </div>
    );
  }
  if (mutation.isSuccess) {
    return (
      <div className="auth-form auth-success" role="status">
        <KeyRound size={34} />
        <h1>Đã đặt lại mật khẩu</h1>
        <p>Tất cả phiên cũ đã bị thu hồi. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <Link className="button button--primary" href="/login">
          Đăng nhập
        </Link>
      </div>
    );
  }
  return (
    <form className="auth-form" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
      <div className="auth-form__heading">
        <span className="auth-form__icon">
          <KeyRound size={22} />
        </span>
        <div>
          <p>Khôi phục tài khoản</p>
          <h1>Đặt mật khẩu mới</h1>
        </div>
      </div>
      <p className="auth-form__intro">Dùng ít nhất 12 ký tự và không sử dụng lại mật khẩu cũ.</p>
      <AuthError error={mutation.error} />
      <Field
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        required
        error={form.formState.errors.new_password?.message}
        {...form.register('new_password')}
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
        Lưu mật khẩu mới
      </Button>
    </form>
  );
}
