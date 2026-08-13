'use client';

import type { AdminPostCategoryView } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormSection } from '@/components/forms/FormSection';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { updatePostCategory } from './api';

export function PostCategoryForm({ item }: { readonly item: AdminPostCategoryView }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const initial = {
    name: item.name,
    slug: item.slug,
    description: item.description ?? '',
    seo_title: item.seo_title ?? '',
    seo_description: item.seo_description ?? '',
    display_order: item.display_order,
  };
  const [value, setValue] = useState(initial);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);
  const save = useMutation({
    mutationFn: () =>
      updatePostCategory(item.id, {
        ...value,
        description: value.description || null,
        seo_title: value.seo_title || null,
        seo_description: value.seo_description || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['content', 'post-categories'] });
      toast.show('Đã lưu danh mục.', 'success');
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu danh mục.', 'danger'),
  });
  return (
    <div className="editor-layout">
      <div className="editor-main">
        <FormSection
          id="identity"
          title="Thông tin danh mục"
          description="Danh mục dùng một tên và slug chung, không tách bản dịch."
        >
          <div className="form-grid form-grid--two">
            <Field
              label="Tên danh mục"
              required
              value={value.name}
              onChange={(event) => setValue({ ...value, name: event.target.value })}
            />
            <Field
              label="Slug"
              required
              value={value.slug}
              onChange={(event) => setValue({ ...value, slug: event.target.value })}
            />
            <Field
              label="Thứ tự"
              type="number"
              min={0}
              value={value.display_order}
              onChange={(event) =>
                setValue({ ...value, display_order: Number(event.target.value) })
              }
            />
          </div>
          <Textarea
            label="Mô tả"
            rows={5}
            value={value.description}
            onChange={(event) => setValue({ ...value, description: event.target.value })}
          />
        </FormSection>
        <FormSection id="seo" title="SEO">
          <div className="form-grid form-grid--two">
            <Field
              label="SEO title"
              value={value.seo_title}
              onChange={(event) => setValue({ ...value, seo_title: event.target.value })}
            />
            <Textarea
              label="SEO description"
              rows={3}
              value={value.seo_description}
              onChange={(event) => setValue({ ...value, seo_description: event.target.value })}
            />
          </div>
        </FormSection>
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>Lưu và trạng thái</h2>
          <Button
            type="button"
            icon={<Save size={17} />}
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate()}
          >
            Lưu thay đổi
          </Button>
          <LifecycleActions
            resourcePath={`/admin/post-categories/${item.id}`}
            status={item.status}
            returnTo="/content/post-categories"
            queryKey={['content', 'post-categories']}
          />
        </section>
      </aside>
    </div>
  );
}
