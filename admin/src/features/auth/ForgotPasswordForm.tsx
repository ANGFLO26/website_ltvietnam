'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { adminForgotPasswordRequestSchema, type AdminForgotPasswordRequest } from '@ltv/contracts';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { forgotPassword } from './api';
import { AuthError } from './AuthError';

export function ForgotPasswordForm() {
  const form = useForm<AdminForgotPasswordRequest>({
    resolver: zodResolver(adminForgotPasswordRequestSchema),
    defaultValues: { email: '' },
  });
  const mutation = useMutation({ mutationFn: forgotPassword });
  if (mutation.isSuccess) {
    return (
      <div className="auth-form auth-success" role="status">
        <MailCheck size={34} aria-hidden="true" />
        <h1>Kiểm tra hộp thư</h1>
        <p>Nếu email thuộc một tài khoản hợp lệ, hệ thống đã gửi liên kết đặt lại mật khẩu.</p>
        <Link className="button button--secondary" href="/login">
          <ArrowLeft size={16} /> Về đăng nhập
        </Link>
      </div>
    );
  }
  return (
    <form className="auth-form" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
      <div className="auth-form__heading">
        <span className="auth-form__icon">
          <MailCheck size={22} />
        </span>
        <div>
          <p>Khôi phục tài khoản</p>
          <h1>Quên mật khẩu</h1>
        </div>
      </div>
      <p className="auth-form__intro">
        Nhập email tài khoản. Phản hồi không tiết lộ email có tồn tại hay không.
      </p>
      <AuthError error={mutation.error} />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Button type="submit" loading={mutation.isPending}>
        Gửi liên kết đặt lại
      </Button>
      <Link className="auth-back-link" href="/login">
        <ArrowLeft size={15} /> Về đăng nhập
      </Link>
    </form>
  );
}
