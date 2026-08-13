'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { slugify } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { createContent, createPostCategory } from './api';
import type { ContentFormOptions } from './options.server';
import type { ContentResourceConfig } from './config';

export function ContentQuickCreate({
  config,
  options,
}: {
  readonly config: ContentResourceConfig;
  readonly options: ContentFormOptions;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const create = useMutation({
    mutationFn: async () => {
      if (config.resource === 'post-categories') return createPostCategory({ name: title, slug });
      if (config.resource === 'posts') return createContent('posts', { category_id: category });
      if (config.resource === 'projects')
        return createContent('projects', { project_type: 'other' });
      if (config.resource === 'pages') return createContent('pages', { page_type: 'standard' });
      return createContent('services', {});
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['content', config.resource] });
      toast.show('Đã tạo bản nháp.', 'success');
      const id = 'entity' in saved ? saved.entity.id : saved.id;
      router.replace(`/content/${config.resource}/${id}`);
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể tạo nội dung.', 'danger'),
  });
  useUnsavedChanges(Boolean(title || slug || category) && !create.isSuccess);
  const translationEntity = config.resource !== 'post-categories';
  return (
    <form
      className="panel quick-create-panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (translationEntity || (title.trim() && slug.trim())) create.mutate();
      }}
    >
      <div className="quick-create-panel__intro">
        <div>
          <h2>Tạo bản nháp {config.singular}</h2>
          <p>
            {translationEntity
              ? 'Tạo khung dữ liệu trước, sau đó biên tập VI và EN độc lập.'
              : 'Danh mục bài viết dùng một tên và slug chung.'}
          </p>
        </div>
      </div>
      {config.resource === 'post-categories' ? (
        <div className="form-grid form-grid--two">
          <Field
            label="Tên danh mục"
            required
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug) setSlug(slugify(event.target.value));
            }}
          />
          <Field
            label="Slug"
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
      ) : null}
      {config.resource === 'posts' ? (
        <Select
          label="Danh mục bài viết"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Chọn danh mục</option>
          {options.postCategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      ) : null}
      <div className="quick-create-panel__actions">
        <Button
          type="submit"
          loading={create.isPending}
          disabled={config.resource === 'posts' && !category}
          icon={<ArrowRight size={17} />}
        >
          Tạo và tiếp tục
        </Button>
      </div>
    </form>
  );
}
