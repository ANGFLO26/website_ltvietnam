'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, PackagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { createProduct } from '@/features/catalogue/api';
import type { ProductFormOptions } from '@/features/products/ProductForm';
import { AdminApiError, fieldErrorsOf } from '@/lib/api/errors';
import { slugify } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

const schema = z.object({
  name: z.string().trim().min(1, 'Hãy nhập tên sản phẩm').max(255),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không hợp lệ'),
  brand_id: z.string().uuid('Hãy chọn hãng'),
  category_id: z.string().uuid('Hãy chọn danh mục chính'),
});
type Value = z.infer<typeof schema>;

export function ProductQuickCreate({ options }: { readonly options: ProductFormOptions }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<Value>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', brand_id: '', category_id: '' },
  });
  const create = useMutation({
    mutationFn: (value: Value) =>
      createProduct({
        name: value.name,
        slug: value.slug,
        brand_id: value.brand_id,
        categories: [{ category_id: value.category_id, is_primary: true }],
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'products'] });
      toast.show('Đã tạo bản nháp. Tiếp tục hoàn thiện các phần bên dưới.', 'success');
      router.replace(`/products/${saved.product.id}`);
    },
    onError: (error) => {
      for (const field of fieldErrorsOf(error)) {
        form.setError(field.field as keyof Value, { message: field.message });
      }
      toast.show(
        error instanceof AdminApiError ? error.message : 'Không thể tạo sản phẩm.',
        'danger',
      );
    },
  });
  useUnsavedChanges(form.formState.isDirty && !create.isSuccess);

  return (
    <form
      className="panel quick-create-panel"
      onSubmit={form.handleSubmit((value) => create.mutate(value))}
    >
      <div className="quick-create-panel__intro">
        <span className="quick-create-panel__icon">
          <PackagePlus size={22} />
        </span>
        <div>
          <h2>Tạo bản nháp tối thiểu</h2>
          <p>Chỉ cần bốn trường để có mã sản phẩm. Sau đó hệ thống mở form kỹ thuật đầy đủ.</p>
        </div>
      </div>
      <div className="form-grid form-grid--two">
        <Field
          label="Tên sản phẩm"
          required
          autoFocus
          error={form.formState.errors.name?.message}
          {...form.register('name', {
            onBlur: (event) => {
              if (!form.getValues('slug')) {
                form.setValue('slug', slugify(String(event.target.value)), {
                  shouldValidate: true,
                });
              }
            },
          })}
        />
        <Field
          label="Slug"
          required
          error={form.formState.errors.slug?.message}
          {...form.register('slug')}
        />
        <Select
          label="Hãng"
          required
          error={form.formState.errors.brand_id?.message}
          {...form.register('brand_id')}
        >
          <option value="">Chọn hãng</option>
          {options.brands.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="Danh mục chính"
          required
          error={form.formState.errors.category_id?.message}
          {...form.register('category_id')}
        >
          <option value="">Chọn danh mục</option>
          {options.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      {create.error ? (
        <p className="form-submit-error" role="alert">
          {create.error instanceof Error ? create.error.message : 'Không thể tạo sản phẩm.'}
        </p>
      ) : null}
      <div className="quick-create-panel__actions">
        <Button type="submit" loading={create.isPending} icon={<ArrowRight size={17} />}>
          Tạo và tiếp tục
        </Button>
      </div>
    </form>
  );
}
