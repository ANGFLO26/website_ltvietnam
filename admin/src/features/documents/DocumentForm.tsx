'use client';

import type {
  AdminDocumentDetailView,
  AdminDocumentWriteRequest,
  MediaAdminView,
} from '@ltv/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormSection } from '@/components/forms/FormSection';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { PublishPreflightPanel } from '@/components/forms/PublishPreflightPanel';
import { RelationSelector, type RelationOption } from '@/components/forms/RelationSelector';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { createDocument, updateDocument } from '@/features/catalogue/api';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError, fieldErrorsOf } from '@/lib/api/errors';
import { slugify } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

const schema = z.object({
  document_type: z.enum([
    'catalogue',
    'brochure',
    'datasheet',
    'application_note',
    'company_profile',
    'manual',
    'certificate',
    'other',
  ]),
  title: z.string().trim().min(1, 'Hãy nhập tiêu đề').max(255),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không hợp lệ'),
  description: z.string().trim().max(10_000),
  language: z.enum(['vi', 'en', 'multi']),
  version: z.string().trim().max(100),
  publication_date: z.string(),
  visibility: z.enum(['public', 'hidden', 'email_required', 'customer_only', 'staff_only']),
  seo_title: z.string().trim().max(255),
  seo_description: z.string().trim().max(500),
});
type Value = z.infer<typeof schema>;
export interface DocumentFormOptions {
  readonly products: readonly RelationOption[];
  readonly brands: readonly RelationOption[];
  readonly services: readonly RelationOption[];
  readonly posts: readonly RelationOption[];
}

export function DocumentForm({
  detail,
  file: initialFile,
  options,
}: {
  readonly detail?: AdminDocumentDetailView;
  readonly file: MediaAdminView | null;
  readonly options: DocumentFormOptions;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState(initialFile);
  const [products, setProducts] = useState<readonly string[]>(detail?.links.product_ids ?? []);
  const [brands, setBrands] = useState<readonly string[]>(detail?.links.brand_ids ?? []);
  const [services, setServices] = useState<readonly string[]>(detail?.links.service_ids ?? []);
  const [posts, setPosts] = useState<readonly string[]>(detail?.links.post_ids ?? []);
  const form = useForm<Value>({ resolver: zodResolver(schema), defaultValues: defaults(detail) });
  useUnsavedChanges(
    form.formState.isDirty ||
      file?.id !== initialFile?.id ||
      !sameIds(products, detail?.links.product_ids ?? []) ||
      !sameIds(brands, detail?.links.brand_ids ?? []) ||
      !sameIds(services, detail?.links.service_ids ?? []) ||
      !sameIds(posts, detail?.links.post_ids ?? []),
  );
  const publish = useMutation({
    mutationFn: () =>
      adminBrowserRequest(`/admin/documents/${detail!.document.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      toast.show('Đã xuất bản tài liệu.', 'success');
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể xuất bản.', 'danger'),
  });
  const save = useMutation({
    mutationFn: (value: Value) => {
      if (!file) throw new Error('Hãy chọn một tệp PDF.');
      const body: AdminDocumentWriteRequest = {
        document_type: value.document_type,
        file_id: file.id,
        title: value.title,
        slug: value.slug,
        description: value.description || null,
        language: value.language,
        version: value.version || null,
        publication_date: value.publication_date || null,
        visibility: value.visibility,
        seo_title: value.seo_title || null,
        seo_description: value.seo_description || null,
        product_ids: products,
        brand_ids: brands,
        service_ids: services,
        post_ids: posts,
      };
      return detail ? updateDocument(detail.document.id, body) : createDocument(body);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'documents'] });
      toast.show('Đã lưu tài liệu.', 'success');
      if (!detail) router.replace(`/documents/${saved.id}`);
      else router.refresh();
    },
    onError: (error) => {
      for (const field of fieldErrorsOf(error))
        form.setError(field.field as keyof Value, { message: field.message });
      toast.show(
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Không thể lưu.',
        'danger',
      );
    },
  });
  return (
    <form className="editor-layout" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
      <div className="editor-main">
        <FormSection
          id="identity"
          title="Thông tin tài liệu"
          description="Tài liệu chỉ tải được công khai khi đồng thời published và visibility=public."
        >
          <div className="form-grid form-grid--two">
            <Select label="Loại tài liệu" {...form.register('document_type')}>
              <option value="catalogue">Catalogue</option>
              <option value="brochure">Brochure</option>
              <option value="datasheet">Datasheet</option>
              <option value="application_note">Application note</option>
              <option value="company_profile">Hồ sơ công ty</option>
              <option value="manual">Hướng dẫn</option>
              <option value="certificate">Chứng nhận</option>
              <option value="other">Khác</option>
            </Select>
            <Select label="Ngôn ngữ" {...form.register('language')}>
              <option value="vi">VI</option>
              <option value="en">EN</option>
              <option value="multi">Đa ngôn ngữ</option>
            </Select>
            <Field
              label="Tiêu đề"
              required
              error={form.formState.errors.title?.message}
              {...form.register('title', {
                onBlur: (event) => {
                  if (!form.getValues('slug'))
                    form.setValue('slug', slugify(String(event.target.value)), {
                      shouldValidate: true,
                    });
                },
              })}
            />
            <Field
              label="Slug"
              required
              error={form.formState.errors.slug?.message}
              {...form.register('slug')}
            />
            <Field label="Phiên bản" {...form.register('version')} />
            <Field
              label="Ngày xuất bản tài liệu"
              type="date"
              {...form.register('publication_date')}
            />
            <Select label="Quyền tải" {...form.register('visibility')}>
              <option value="public">Công khai</option>
              <option value="hidden">Ẩn</option>
              <option value="email_required">Yêu cầu email</option>
              <option value="customer_only">Chỉ khách hàng</option>
              <option value="staff_only">Chỉ nội bộ</option>
            </Select>
          </div>
          <Textarea label="Mô tả" rows={5} {...form.register('description')} />
        </FormSection>
        <FormSection
          id="file_id"
          title="Tệp PDF"
          description="MediaPicker chỉ hiển thị PDF; ảnh không thể được chọn làm tài liệu."
        >
          <MediaPicker mode="document" label="Chọn PDF" value={file} onChange={setFile} />
        </FormSection>
        <FormSection
          id="relations"
          title="Liên kết nội dung"
          description="Gửi toàn bộ tập quan hệ trong một transaction."
        >
          <div className="form-grid form-grid--two">
            <RelationSelector
              label="Sản phẩm"
              options={options.products}
              selected={products}
              onChange={setProducts}
            />
            <RelationSelector
              label="Hãng"
              options={options.brands}
              selected={brands}
              onChange={setBrands}
            />
            <RelationSelector
              label="Dịch vụ"
              options={options.services}
              selected={services}
              onChange={setServices}
            />
            <RelationSelector
              label="Bài viết"
              options={options.posts}
              selected={posts}
              onChange={setPosts}
            />
          </div>
        </FormSection>
        <FormSection id="seo" title="SEO">
          <div className="form-grid form-grid--two">
            <Field label="SEO title" {...form.register('seo_title')} />
            <Textarea label="SEO description" rows={3} {...form.register('seo_description')} />
          </div>
        </FormSection>
        {detail ? (
          <PublishPreflightPanel
            target={{ entity: 'document', id: detail.document.id }}
            onReady={() => publish.mutate()}
          />
        ) : null}
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>Lưu và trạng thái</h2>
          <Button type="submit" loading={save.isPending} icon={<Save size={17} />}>
            {detail ? 'Lưu thay đổi' : 'Tạo bản nháp'}
          </Button>
          {detail ? (
            <LifecycleActions
              resourcePath={`/admin/documents/${detail.document.id}`}
              status={detail.document.status}
              returnTo="/documents"
              queryKey={['catalogue', 'documents']}
              allowPublish={false}
            />
          ) : null}
          {save.error ? (
            <p className="form-submit-error" role="alert">
              {save.error instanceof Error ? save.error.message : 'Không thể lưu.'}
            </p>
          ) : null}
        </section>
      </aside>
    </form>
  );
}
function defaults(detail?: AdminDocumentDetailView): Value {
  const item = detail?.document;
  return {
    document_type: item?.document_type ?? 'datasheet',
    title: item?.title ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    language: item?.language ?? 'vi',
    version: item?.version ?? '',
    publication_date: item?.publication_date ?? '',
    visibility: item?.visibility ?? 'hidden',
    seo_title: item?.seo_title ?? '',
    seo_description: item?.seo_description ?? '',
  };
}
function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
