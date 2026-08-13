'use client';

import type {
  AdminTaxonomyDetailView,
  AdminTaxonomyKind,
  AdminTaxonomyListItemView,
  AdminTaxonomyWriteRequest,
  MediaAdminView,
} from '@ltv/contracts';
import { anyBlockSchema } from '@ltv/contracts';
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
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { createTaxonomy, updateTaxonomy } from '@/features/catalogue/api';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError, fieldErrorsOf } from '@/lib/api/errors';
import { slugify } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { TAXONOMY_CONFIG } from './config';

const blocksSchema = z.array(anyBlockSchema).max(200);
const schema = z.object({
  name: z.string().trim().max(255),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  parent_id: z.string(),
  brand_type: z.string(),
  organization: z.string().trim().max(100),
  code: z.string().trim().max(100),
  short_description: z.string().trim().max(2_000),
  description: z.string(),
  country_code: z.string().trim().max(2),
  website_url: z.string().trim(),
  seo_title: z.string().trim().max(255),
  seo_description: z.string().trim().max(500),
  display_order: z.number().int().min(0),
  is_featured: z.boolean(),
});
type Value = z.infer<typeof schema>;

export function TaxonomyForm({
  kind,
  detail,
  parents,
  media: initialMedia,
}: {
  readonly kind: AdminTaxonomyKind;
  readonly detail?: AdminTaxonomyDetailView;
  readonly parents: readonly AdminTaxonomyListItemView[];
  readonly media: {
    readonly logo?: MediaAdminView | null;
    readonly cover?: MediaAdminView | null;
    readonly featured?: MediaAdminView | null;
    readonly icon?: MediaAdminView | null;
  };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [logo, setLogo] = useState(initialMedia.logo ?? null);
  const [cover, setCover] = useState(initialMedia.cover ?? null);
  const [featured, setFeatured] = useState(initialMedia.featured ?? null);
  const [icon, setIcon] = useState(initialMedia.icon ?? null);
  const form = useForm<Value>({ resolver: zodResolver(schema), defaultValues: defaults(detail) });
  useUnsavedChanges(
    form.formState.isDirty ||
      (logo?.id ?? null) !== (initialMedia.logo?.id ?? null) ||
      (cover?.id ?? null) !== (initialMedia.cover?.id ?? null) ||
      (featured?.id ?? null) !== (initialMedia.featured?.id ?? null) ||
      (icon?.id ?? null) !== (initialMedia.icon?.id ?? null),
  );
  const publish = useMutation({
    mutationFn: () =>
      adminBrowserRequest(`/admin/${resource(kind)}/${detail!.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      toast.show('Đã xuất bản hãng.', 'success');
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể xuất bản.', 'danger'),
  });
  const save = useMutation({
    mutationFn: async (value: Value) => {
      const body = payload(kind, value, { logo, cover, featured, icon });
      if (detail) return updateTaxonomy(kind, detail.id, body);
      const createBody = { ...body };
      delete createBody.is_featured;
      delete createBody.display_order;
      return createTaxonomy(kind, createBody);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'taxonomy', kind] });
      toast.show('Đã lưu taxonomy.', 'success');
      if (!detail) router.replace(`/taxonomy/${kind}/${saved.id}`);
      else router.refresh();
    },
    onError: (error) => {
      for (const field of fieldErrorsOf(error))
        form.setError(field.field as keyof Value, { message: field.message });
      toast.show(
        error instanceof AdminApiError ? error.message : 'Không thể lưu taxonomy.',
        'danger',
      );
    },
  });
  const config = TAXONOMY_CONFIG[kind];
  const parentChanged =
    detail && config.tree && form.watch('parent_id') !== (detail.parent_id ?? '');
  const parentOptions = config.tree ? orderedTreeOptions(parents, detail?.id) : [];
  return (
    <form className="editor-layout" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
      <div className="editor-main">
        <FormSection
          id="identity"
          title="Thông tin chính"
          description={`${config.label} được tạo ở trạng thái bản nháp.`}
        >
          <div className="form-grid form-grid--two">
            {kind === 'standard' ? (
              <>
                <Field
                  label="Tổ chức"
                  required
                  error={form.formState.errors.organization?.message}
                  {...form.register('organization')}
                />
                <Field
                  label="Mã tiêu chuẩn"
                  required
                  error={form.formState.errors.code?.message}
                  {...form.register('code')}
                />
              </>
            ) : (
              <Field
                label="Tên"
                required
                error={form.formState.errors.name?.message}
                {...form.register('name', {
                  onBlur: (event) => {
                    if (!form.getValues('slug'))
                      form.setValue('slug', slugify(String(event.target.value)), {
                        shouldValidate: true,
                      });
                  },
                })}
              />
            )}
            <Field
              label="Slug"
              required
              error={form.formState.errors.slug?.message}
              {...form.register('slug')}
            />
            {kind === 'brand' ? (
              <Select label="Loại hãng" required {...form.register('brand_type')}>
                <option value="manufacturer">Nhà sản xuất</option>
                <option value="sub_brand">Hãng con</option>
                <option value="global_partner">Đối tác toàn cầu</option>
                <option value="service_partner">Đối tác dịch vụ</option>
                <option value="supplier">Nhà cung cấp</option>
              </Select>
            ) : null}
            {config.tree ? (
              <Select
                label="Cấp cha"
                description="Các mục con được thụt vào theo cây; không thể chuyển một mục vào chính nhánh con của nó."
                {...form.register('parent_id')}
              >
                <option value="">Nút gốc</option>
                {parentOptions.map(({ item, depth, disabled }) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={disabled}
                  >{`${'— '.repeat(depth)}${item.label}`}</option>
                ))}
              </Select>
            ) : null}
            {parentChanged ? (
              <div className="inline-warning" role="status">
                Đổi cấp cha sẽ cập nhật đường dẫn phân cấp của toàn bộ nhánh con.
              </div>
            ) : null}
            {kind === 'brand' || kind === 'product_category' ? (
              <Field label="Mã nội bộ" {...form.register('code')} />
            ) : null}
            {kind === 'brand' ? (
              <>
                <Field label="Mã quốc gia" placeholder="VN" {...form.register('country_code')} />
                <Field
                  label="Website"
                  type="url"
                  placeholder="https://…"
                  {...form.register('website_url')}
                />
              </>
            ) : null}
          </div>
          {kind === 'brand' || kind === 'product_category' ? (
            <Textarea label="Mô tả ngắn" rows={4} {...form.register('short_description')} />
          ) : null}
          {kind === 'standard' ? (
            <Textarea label="Mô tả" rows={7} {...form.register('description')} />
          ) : kind !== 'brand' ? (
            <Textarea
              label="Nội dung block (JSON)"
              rows={10}
              description="A2 giữ nguyên cấu trúc block; trình soạn thảo trực quan đầy đủ được triển khai ở A3."
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
          ) : null}
        </FormSection>
        {kind !== 'standard' ? (
          <FormSection
            id="media"
            title="Hình ảnh"
            description="MediaPicker chỉ cho chọn ảnh, không cho gắn PDF vào trường hình."
          >
            <div className="form-grid form-grid--two">
              {kind === 'brand' ? (
                <>
                  <MediaPicker label="Logo" value={logo} onChange={setLogo} />
                  <MediaPicker label="Ảnh bìa" value={cover} onChange={setCover} />
                </>
              ) : null}
              {kind === 'product_category' || kind === 'industry' ? (
                <MediaPicker label="Ảnh đại diện" value={featured} onChange={setFeatured} />
              ) : null}
              {kind !== 'brand' ? (
                <MediaPicker label="Biểu tượng" value={icon} onChange={setIcon} />
              ) : null}
            </div>
          </FormSection>
        ) : null}
        {kind !== 'brand' ? (
          <FormSection
            id="seo"
            title="SEO"
            description="Canonical và robots được hệ thống tự sinh."
          >
            <div className="form-grid form-grid--two">
              <Field label="SEO title" {...form.register('seo_title')} />
              <Textarea label="SEO description" rows={3} {...form.register('seo_description')} />
            </div>
          </FormSection>
        ) : null}
        {detail && kind === 'brand' ? (
          <PublishPreflightPanel
            target={{ entity: 'brand', id: detail.id }}
            onReady={() => publish.mutate()}
          />
        ) : null}
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>Lưu và trạng thái</h2>
          <Checkbox label="Nổi bật" {...form.register('is_featured')} />
          <Field
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            {...form.register('display_order', { valueAsNumber: true })}
          />
          <Button type="submit" loading={save.isPending} icon={<Save size={17} />}>
            Lưu thay đổi
          </Button>
          {detail ? (
            <LifecycleActions
              resourcePath={`/admin/${resource(kind)}/${detail.id}`}
              status={detail.status}
              returnTo={`/taxonomy?kind=${kind}`}
              queryKey={['catalogue', 'taxonomy', kind]}
              allowPublish={kind !== 'brand'}
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

function defaults(detail: AdminTaxonomyDetailView | undefined): Value {
  return {
    name: detail?.name ?? '',
    slug: detail?.slug ?? '',
    parent_id: detail?.parent_id ?? '',
    brand_type: detail?.brand_type ?? 'manufacturer',
    organization: detail?.organization ?? '',
    code: detail?.code ?? '',
    short_description: detail?.short_description ?? '',
    description:
      typeof detail?.description === 'string'
        ? detail.description
        : JSON.stringify(detail?.description ?? [], null, 2),
    country_code: detail?.country_code ?? '',
    website_url: detail?.website_url ?? '',
    seo_title: detail?.seo_title ?? '',
    seo_description: detail?.seo_description ?? '',
    display_order: detail?.display_order ?? 0,
    is_featured: detail?.is_featured ?? false,
  };
}
function payload(
  kind: AdminTaxonomyKind,
  value: Value,
  media: {
    logo: MediaAdminView | null;
    cover: MediaAdminView | null;
    featured: MediaAdminView | null;
    icon: MediaAdminView | null;
  },
): AdminTaxonomyWriteRequest {
  const common = {
    slug: value.slug,
    is_featured: value.is_featured,
    display_order: value.display_order,
  };
  if (kind === 'brand')
    return {
      ...common,
      name: value.name,
      parent_id: value.parent_id || null,
      brand_type: value.brand_type as NonNullable<AdminTaxonomyWriteRequest['brand_type']>,
      short_description: value.short_description || null,
      code: value.code || null,
      country_code: value.country_code || null,
      website_url: value.website_url || null,
      logo_id: media.logo?.id ?? null,
      cover_image_id: media.cover?.id ?? null,
    };
  if (kind === 'standard')
    return {
      ...common,
      organization: value.organization,
      code: value.code,
      name: value.name || null,
      description: value.description || null,
      seo_title: value.seo_title || null,
      seo_description: value.seo_description || null,
    };
  const blocks = parseBlocks(value.description);
  if (kind === 'product_category')
    return {
      ...common,
      name: value.name,
      parent_id: value.parent_id || null,
      short_description: value.short_description || null,
      description: blocks,
      code: value.code || null,
      featured_image_id: media.featured?.id ?? null,
      icon_id: media.icon?.id ?? null,
      seo_title: value.seo_title || null,
      seo_description: value.seo_description || null,
    };
  if (kind === 'application')
    return {
      ...common,
      name: value.name,
      parent_id: value.parent_id || null,
      description: blocks,
      icon_id: media.icon?.id ?? null,
      seo_title: value.seo_title || null,
      seo_description: value.seo_description || null,
    };
  return {
    ...common,
    name: value.name,
    description: blocks,
    featured_image_id: media.featured?.id ?? null,
    icon_id: media.icon?.id ?? null,
    seo_title: value.seo_title || null,
    seo_description: value.seo_description || null,
  };
}
function parseBlocks(value: string) {
  try {
    return blocksSchema.parse(JSON.parse(value || '[]'));
  } catch {
    throw new Error('Nội dung block JSON không hợp lệ.');
  }
}
function resource(kind: AdminTaxonomyKind): string {
  return {
    brand: 'brands',
    product_category: 'product-categories',
    standard: 'standards',
    application: 'applications',
    industry: 'industries',
  }[kind];
}

function orderedTreeOptions(items: readonly AdminTaxonomyListItemView[], currentId?: string) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const children = new Map<string | null, AdminTaxonomyListItemView[]>();
  for (const item of items) {
    const parentId = item.parent && byId.has(item.parent.id) ? item.parent.id : null;
    const group = children.get(parentId) ?? [];
    group.push(item);
    children.set(parentId, group);
  }
  for (const group of children.values()) {
    group.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }

  const isDescendant = (item: AdminTaxonomyListItemView) => {
    if (!currentId) return false;
    const visited = new Set<string>();
    let parent = item.parent;
    while (parent && !visited.has(parent.id)) {
      if (parent.id === currentId) return true;
      visited.add(parent.id);
      parent = byId.get(parent.id)?.parent ?? null;
    }
    return false;
  };
  const result: { item: AdminTaxonomyListItemView; depth: number; disabled: boolean }[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const item of children.get(parentId) ?? []) {
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      if (item.id !== currentId) result.push({ item, depth, disabled: isDescendant(item) });
      visit(item.id, depth + 1);
    }
  };
  visit(null, 0);
  for (const item of items) {
    if (!visited.has(item.id) && item.id !== currentId) {
      result.push({ item, depth: 0, disabled: isDescendant(item) });
    }
  }
  return result;
}
