'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { changePassword } from './api';
import { AuthError } from './AuthError';

const schema = z
  .object({
    current_password: z.string().min(1, 'Hãy nhập mật khẩu hiện tại').max(200),
    new_password: z.string().min(12, 'Mật khẩu mới cần ít nhất 12 ký tự').max(200),
    confirm_password: z.string().min(1, 'Hãy nhập lại mật khẩu mới'),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    path: ['confirm_password'],
    message: 'Mật khẩu nhập lại chưa khớp',
  })
  .refine((value) => value.new_password !== value.current_password, {
    path: ['new_password'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });
type Value = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const form = useForm<Value>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });
  const mutation = useMutation({
    mutationFn: (value: Value) =>
      changePassword({
        current_password: value.current_password,
        new_password: value.new_password,
      }),
    onSuccess: () => window.location.assign('/login?password=changed'),
  });
  return (
    <form
      className="panel form-card"
      onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
    >
      <div className="form-card__heading">
        <KeyRound size={21} />
        <div>
          <h2>Đổi mật khẩu</h2>
          <p>Thao tác này đăng xuất tất cả phiên, bao gồm phiên hiện tại.</p>
        </div>
      </div>
      <AuthError error={mutation.error} />
      <Field
        label="Mật khẩu hiện tại"
        type="password"
        autoComplete="current-password"
        required
        error={form.formState.errors.current_password?.message}
        {...form.register('current_password')}
      />
      <Field
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        required
        description="Ít nhất 12 ký tự."
        error={form.formState.errors.new_password?.message}
        {...form.register('new_password')}
      />
      <Field
        label="Nhập lại mật khẩu mới"
        type="password"
        autoComplete="new-password"
        required
        error={form.formState.errors.confirm_password?.message}
        {...form.register('confirm_password')}
      />
      <div className="form-card__actions">
        <Button type="submit" loading={mutation.isPending}>
          Đổi mật khẩu và đăng xuất
        </Button>
      </div>
    </form>
  );
}
