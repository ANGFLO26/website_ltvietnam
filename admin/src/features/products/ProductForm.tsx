'use client';

import type {
  AdminProductDetailView,
  AdminProductListItemView,
  AdminProductMediaRole,
  AdminProductWriteRequest,
  AdminTaxonomyListItemView,
  MediaAdminView,
} from '@ltv/contracts';
import { anyBlockSchema } from '@ltv/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Plus, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormSection } from '@/components/forms/FormSection';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { PublishPreflightPanel } from '@/components/forms/PublishPreflightPanel';
import { RelationSelector } from '@/components/forms/RelationSelector';
import { MediaPicker } from '@/components/media/MediaPicker';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { createProduct, updateProduct } from '@/features/catalogue/api';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError, fieldErrorsOf } from '@/lib/api/errors';
import { slugify } from '@/lib/format';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

const blocksSchema = z.array(anyBlockSchema).max(200);
const schema = z.object({
  brand_id: z.string().uuid('Hãy chọn hãng'),
  name: z.string().trim().min(1, 'Hãy nhập tên sản phẩm').max(255),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không hợp lệ'),
  short_description: z.string().trim().max(2_000),
  model: z.string().trim().max(255),
  internal_code: z.string().trim().max(100),
  sku: z.string().trim().max(100),
  product_type: z.enum(['equipment', 'spare_part', 'accessory', 'consumable', 'chemical', 'other']),
  price_visibility: z.enum(['hidden', 'visible', 'contact']),
  sale_mode: z.enum(['inquiry', 'online']),
  warranty_months: z.number().int().min(0).max(1_200).nullable(),
  requires_configuration: z.boolean(),
  is_featured: z.boolean(),
  display_order: z.number().int().min(0),
  discontinued_at: z.string(),
  seo_title: z.string().trim().max(255),
  seo_description: z.string().trim().max(500),
  overview: z.string(),
  features: z.string(),
  applications_text: z.string(),
  principle: z.string(),
  sample_types: z.string(),
  operating_conditions: z.string(),
  accessories_options: z.string(),
});
type Value = z.infer<typeof schema>;
type StandardState = {
  readonly id: string;
  readonly compliance: 'compliance' | 'correlation' | 'specification' | 'reference';
  readonly note: string;
};
type RelatedState = {
  readonly id: string;
  readonly relation: 'similar' | 'alternative' | 'accessory' | 'compatible' | 'recommended';
};
type SpecState = {
  readonly id?: string;
  readonly group: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
};
type RelationField =
  | 'categories'
  | 'standards'
  | 'applications'
  | 'industries'
  | 'media'
  | 'related_products'
  | 'specifications';

export interface ProductFormOptions {
  readonly brands: readonly AdminTaxonomyListItemView[];
  readonly categories: readonly AdminTaxonomyListItemView[];
  readonly standards: readonly AdminTaxonomyListItemView[];
  readonly applications: readonly AdminTaxonomyListItemView[];
  readonly industries: readonly AdminTaxonomyListItemView[];
  readonly products: readonly AdminProductListItemView[];
}

export function ProductForm({
  detail,
  options,
  featured: initialFeatured,
  gallery: initialGallery,
}: {
  readonly detail?: AdminProductDetailView;
  readonly options: ProductFormOptions;
  readonly featured: MediaAdminView | null;
  readonly gallery: readonly MediaAdminView[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [featured, setFeatured] = useState(initialFeatured);
  const [gallery, setGallery] = useState<readonly MediaAdminView[]>(initialGallery);
  const [mediaRoles, setMediaRoles] = useState<Record<string, AdminProductMediaRole>>(() =>
    Object.fromEntries(detail?.media.map((item) => [item.id, item.media_role]) ?? []),
  );
  const [categoryIds, setCategoryIds] = useState<readonly string[]>(
    detail?.categories.map((item) => item.id) ?? [],
  );
  const [primaryCategory, setPrimaryCategory] = useState<string | null>(
    detail?.categories.find((item) => item.is_primary)?.id ?? null,
  );
  const [applicationIds, setApplicationIds] = useState<readonly string[]>(
    detail?.applications.map((item) => item.id) ?? [],
  );
  const [primaryApplication, setPrimaryApplication] = useState<string | null>(
    detail?.applications.find((item) => item.is_primary)?.id ?? null,
  );
  const [industryIds, setIndustryIds] = useState<readonly string[]>(
    detail?.industries.map((item) => item.id) ?? [],
  );
  const [standards, setStandards] = useState<readonly StandardState[]>(
    detail?.standards.map((item) => ({
      id: item.id,
      compliance: item.compliance_type,
      note: item.note ?? '',
    })) ?? [],
  );
  const [related, setRelated] = useState<readonly RelatedState[]>(
    detail?.related.map((item) => ({ id: item.card.id, relation: item.relation_type })) ?? [],
  );
  const [specs, setSpecs] = useState<readonly SpecState[]>(
    detail?.specifications.map((item) => ({
      id: item.id,
      group: item.group_key ?? '',
      label: item.label,
      value: item.value ?? '',
      unit: item.unit ?? '',
    })) ?? [],
  );
  const [dirtyRelations, setDirtyRelations] = useState<ReadonlySet<RelationField>>(() => new Set());
  const touchRelation = (field: RelationField) =>
    setDirtyRelations((current) => new Set(current).add(field));
  const form = useForm<Value>({ resolver: zodResolver(schema), defaultValues: defaults(detail) });
  useUnsavedChanges(
    form.formState.isDirty || dirtyRelations.size > 0 || featured?.id !== initialFeatured?.id,
  );
  const publish = useMutation({
    mutationFn: () =>
      adminBrowserRequest(`/admin/products/${detail!.product.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      toast.show('Đã xuất bản sản phẩm.', 'success');
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể xuất bản.', 'danger'),
  });
  const save = useMutation({
    mutationFn: (value: Value) => {
      if (categoryIds.length > 0 && !primaryCategory)
        throw new Error('Hãy chọn đúng một danh mục chính.');
      if (primaryCategory && !categoryIds.includes(primaryCategory))
        throw new Error('Danh mục chính phải nằm trong tập danh mục đã chọn.');
      if (primaryApplication && !applicationIds.includes(primaryApplication))
        throw new Error('Ứng dụng chính phải nằm trong tập ứng dụng đã chọn.');
      const body = buildProductPayload(value, {
        featured,
        gallery,
        mediaRoles,
        categoryIds,
        primaryCategory,
        standards,
        applicationIds,
        primaryApplication,
        industryIds,
        related,
        specs,
        dirtyRelations,
        isCreate: !detail,
      });
      return detail ? updateProduct(detail.product.id, body) : createProduct(body);
    },
    onSuccess: async (saved, value) => {
      await queryClient.invalidateQueries({ queryKey: ['catalogue', 'products'] });
      setDirtyRelations(new Set());
      form.reset(value);
      toast.show('Đã lưu sản phẩm.', 'success');
      if (!detail) router.replace(`/products/${saved.product.id}`);
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
            : 'Không thể lưu sản phẩm.',
        'danger',
      );
    },
  });
  const current = detail?.product;
  return (
    <form className="editor-layout" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
      <div className="editor-main">
        <FormSection
          id="identity"
          title="Thông tin sản phẩm"
          description="Sản phẩm kỹ thuật dùng một ngôn ngữ; không tạo tab VI/EN."
        >
          <div className="form-grid form-grid--two">
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
            <Select label="Loại sản phẩm" {...form.register('product_type')}>
              <option value="equipment">Thiết bị</option>
              <option value="spare_part">Phụ tùng</option>
              <option value="accessory">Phụ kiện</option>
              <option value="consumable">Vật tư tiêu hao</option>
              <option value="chemical">Hóa chất</option>
              <option value="other">Khác</option>
            </Select>
            <Field
              label="Tên sản phẩm"
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
            <Field
              label="Slug"
              required
              error={form.formState.errors.slug?.message}
              {...form.register('slug')}
            />
            <Field label="Model" {...form.register('model')} />
            <Field label="Mã nội bộ" {...form.register('internal_code')} />
            <Field label="SKU" {...form.register('sku')} />
            <Field
              label="Bảo hành (tháng)"
              type="number"
              min={0}
              max={1200}
              {...form.register('warranty_months', {
                setValueAs: (value) => (value === '' ? null : Number(value)),
              })}
            />
          </div>
          <Textarea label="Mô tả ngắn" rows={4} {...form.register('short_description')} />
        </FormSection>
        <FormSection
          id="media"
          title="Ảnh đại diện và gallery"
          description="Ảnh đại diện tách khỏi gallery; PDF không xuất hiện trong MediaPicker này."
        >
          <div className="form-grid form-grid--two">
            <MediaPicker label="Ảnh đại diện" value={featured} onChange={setFeatured} />
            <MediaPicker
              label="Thêm ảnh gallery"
              value={null}
              onChange={(item) => {
                if (item && !gallery.some((current) => current.id === item.id)) {
                  touchRelation('media');
                  setGallery([...gallery, item]);
                  setMediaRoles((roles) => ({ ...roles, [item.id]: 'gallery' }));
                }
              }}
            />
          </div>
          {gallery.length ? (
            <div className="selected-media-list">
              {gallery.map((item, index) => (
                <div key={item.id}>
                  <GripVertical size={16} />
                  <MediaThumbnail media={item} size={64} />
                  <span>{item.title ?? item.original_name}</span>
                  <Select
                    label="Vai trò"
                    value={mediaRoles[item.id] ?? 'gallery'}
                    onChange={(event) => {
                      touchRelation('media');
                      setMediaRoles((roles) => ({
                        ...roles,
                        [item.id]: event.target.value as AdminProductMediaRole,
                      }));
                    }}
                  >
                    <option value="gallery">Gallery</option>
                    <option value="diagram">Sơ đồ</option>
                    <option value="application">Ứng dụng</option>
                    <option value="interface">Giao diện</option>
                    <option value="dimension">Kích thước</option>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Bỏ ${item.original_name}`}
                    icon={<X size={16} />}
                    onClick={() => {
                      touchRelation('media');
                      setGallery(gallery.filter((media) => media.id !== item.id));
                    }}
                  />
                  <small>Thứ tự {index + 1}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Chưa có ảnh gallery.</p>
          )}
        </FormSection>
        <FormSection
          id="categories"
          title="Danh mục"
          description="Có thể chọn nhiều danh mục nhưng đúng một danh mục chính."
        >
          <RelationSelector
            label="Danh mục sản phẩm"
            options={options.categories.map(option)}
            selected={categoryIds}
            onChange={(ids) => {
              touchRelation('categories');
              setCategoryIds(ids);
            }}
            primaryId={primaryCategory}
            onPrimaryChange={(id) => {
              touchRelation('categories');
              setPrimaryCategory(id);
            }}
          />
        </FormSection>
        <FormSection
          id="standards"
          title="Tiêu chuẩn"
          description="Chọn tiêu chuẩn và loại quan hệ kỹ thuật."
        >
          <RelationSelector
            label="Tiêu chuẩn"
            options={options.standards.map(option)}
            selected={standards.map((item) => item.id)}
            onChange={(ids) => {
              touchRelation('standards');
              setStandards(
                ids.map(
                  (id) =>
                    standards.find((item) => item.id === id) ?? {
                      id,
                      compliance: 'compliance',
                      note: '',
                    },
                ),
              );
            }}
          />
          {standards.map((item) => (
            <div key={item.id} className="relation-detail-row">
              <strong>{options.standards.find((option) => option.id === item.id)?.label}</strong>
              <Select
                label="Loại quan hệ"
                value={item.compliance}
                onChange={(event) => {
                  touchRelation('standards');
                  setStandards(
                    standards.map((row) =>
                      row.id === item.id
                        ? { ...row, compliance: event.target.value as StandardState['compliance'] }
                        : row,
                    ),
                  );
                }}
              >
                <option value="compliance">Tuân thủ</option>
                <option value="correlation">Tương quan</option>
                <option value="specification">Đặc tả</option>
                <option value="reference">Tham chiếu</option>
              </Select>
              <Field
                label="Ghi chú"
                value={item.note}
                onChange={(event) => {
                  touchRelation('standards');
                  setStandards(
                    standards.map((row) =>
                      row.id === item.id ? { ...row, note: event.target.value } : row,
                    ),
                  );
                }}
              />
            </div>
          ))}
        </FormSection>
        <FormSection
          id="applications"
          title="Ứng dụng và ngành"
          description="Ứng dụng có tối đa một mục chính; ngành là danh sách phẳng."
        >
          <div className="form-grid form-grid--two">
            <RelationSelector
              label="Ứng dụng"
              options={options.applications.map(option)}
              selected={applicationIds}
              onChange={(ids) => {
                touchRelation('applications');
                setApplicationIds(ids);
              }}
              primaryId={primaryApplication}
              onPrimaryChange={(id) => {
                touchRelation('applications');
                setPrimaryApplication(id);
              }}
            />
            <RelationSelector
              label="Ngành"
              options={options.industries.map(option)}
              selected={industryIds}
              onChange={(ids) => {
                touchRelation('industries');
                setIndustryIds(ids);
              }}
            />
          </div>
        </FormSection>
        <FormSection
          id="specifications"
          title="Thông số kỹ thuật"
          description="Mỗi dòng gồm nhóm, nhãn, giá trị và đơn vị."
        >
          <div className="spec-editor">
            {specs.map((spec, index) => (
              <div key={spec.id ?? `new-${index}`} className="spec-row">
                <Field
                  label="Nhóm"
                  value={spec.group}
                  onChange={(event) => {
                    touchRelation('specifications');
                    setSpecs(updateAt(specs, index, { group: event.target.value }));
                  }}
                />
                <Field
                  label="Nhãn"
                  required
                  value={spec.label}
                  onChange={(event) => {
                    touchRelation('specifications');
                    setSpecs(updateAt(specs, index, { label: event.target.value }));
                  }}
                />
                <Field
                  label="Giá trị"
                  value={spec.value}
                  onChange={(event) => {
                    touchRelation('specifications');
                    setSpecs(updateAt(specs, index, { value: event.target.value }));
                  }}
                />
                <Field
                  label="Đơn vị"
                  value={spec.unit}
                  onChange={(event) => {
                    touchRelation('specifications');
                    setSpecs(updateAt(specs, index, { unit: event.target.value }));
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Xóa thông số"
                  icon={<X size={16} />}
                  onClick={() => {
                    touchRelation('specifications');
                    setSpecs(specs.filter((_, itemIndex) => itemIndex !== index));
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => {
                touchRelation('specifications');
                setSpecs([...specs, { group: '', label: '', value: '', unit: '' }]);
              }}
            >
              Thêm thông số
            </Button>
          </div>
        </FormSection>
        <FormSection
          id="related_products"
          title="Sản phẩm liên quan"
          description="Quan hệ này chỉ được gửi khi bạn thực sự thay đổi danh sách."
        >
          <RelationSelector
            label="Sản phẩm"
            options={options.products
              .filter((item) => item.id !== current?.id)
              .map((item) => ({
                id: item.id,
                label: item.name,
                description: item.model ?? item.brand.label,
              }))}
            selected={related.map((item) => item.id)}
            onChange={(ids) => {
              touchRelation('related_products');
              setRelated(
                ids.map(
                  (id) => related.find((item) => item.id === id) ?? { id, relation: 'similar' },
                ),
              );
            }}
          />
          {related.map((item) => (
            <Select
              key={item.id}
              label={options.products.find((product) => product.id === item.id)?.name ?? 'Sản phẩm'}
              value={item.relation}
              onChange={(event) => {
                touchRelation('related_products');
                setRelated(
                  related.map((row) =>
                    row.id === item.id
                      ? { ...row, relation: event.target.value as RelatedState['relation'] }
                      : row,
                  ),
                );
              }}
            >
              <option value="similar">Tương tự</option>
              <option value="alternative">Thay thế</option>
              <option value="accessory">Phụ kiện</option>
              <option value="compatible">Tương thích</option>
              <option value="recommended">Khuyến nghị</option>
            </Select>
          ))}
        </FormSection>
        <FormSection
          id="content"
          title="Nội dung kỹ thuật"
          description="A2 lưu an toàn ContentBlock JSON; editor trực quan đầy đủ thuộc A3."
        >
          <div className="content-json-grid">
            {CONTENT_FIELDS.map(({ key, label }) => (
              <Textarea
                key={key}
                label={label}
                rows={8}
                error={form.formState.errors[key]?.message}
                {...form.register(key)}
              />
            ))}
          </div>
        </FormSection>
        <FormSection id="seo" title="SEO và bán hàng">
          <div className="form-grid form-grid--two">
            <Field label="SEO title" {...form.register('seo_title')} />
            <Textarea label="SEO description" rows={3} {...form.register('seo_description')} />
            <Select label="Hiển thị giá" {...form.register('price_visibility')}>
              <option value="hidden">Ẩn</option>
              <option value="visible">Hiện giá</option>
              <option value="contact">Liên hệ</option>
            </Select>
            <Select label="Chế độ bán" {...form.register('sale_mode')}>
              <option value="inquiry">Gửi yêu cầu</option>
              <option value="online">Mua trực tuyến</option>
            </Select>
            <Field
              label="Ngừng kinh doanh từ"
              type="datetime-local"
              {...form.register('discontinued_at')}
            />
          </div>
          <Checkbox
            label="Cần cấu hình trước khi báo giá"
            {...form.register('requires_configuration')}
          />
        </FormSection>
        {detail ? (
          <PublishPreflightPanel
            target={{ entity: 'product', id: detail.product.id }}
            onReady={() => publish.mutate()}
          />
        ) : null}
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>Lưu và trạng thái</h2>
          <Checkbox label="Sản phẩm nổi bật" {...form.register('is_featured')} />
          <Field
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            {...form.register('display_order', { valueAsNumber: true })}
          />
          <Button type="submit" loading={save.isPending} icon={<Save size={17} />}>
            {detail ? 'Lưu thay đổi' : 'Tạo bản nháp'}
          </Button>
          {detail ? (
            <LifecycleActions
              resourcePath={`/admin/products/${detail.product.id}`}
              status={detail.product.status}
              returnTo="/products"
              queryKey={['catalogue', 'products']}
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

const CONTENT_FIELDS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'features', label: 'Tính năng' },
  { key: 'applications_text', label: 'Nội dung ứng dụng' },
  { key: 'principle', label: 'Nguyên lý' },
  { key: 'sample_types', label: 'Loại mẫu' },
  { key: 'operating_conditions', label: 'Điều kiện vận hành' },
  { key: 'accessories_options', label: 'Phụ kiện và tùy chọn' },
] as const;
function defaults(detail?: AdminProductDetailView): Value {
  const p = detail?.product;
  const json = (value: unknown) => JSON.stringify(value ?? [], null, 2);
  return {
    brand_id: p?.brand_id ?? '',
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    short_description: p?.short_description ?? '',
    model: p?.model ?? '',
    internal_code: p?.internal_code ?? '',
    sku: p?.sku ?? '',
    product_type: p?.product_type ?? 'equipment',
    price_visibility: p?.price_visibility ?? 'hidden',
    sale_mode: p?.sale_mode ?? 'inquiry',
    warranty_months: p?.warranty_months ?? null,
    requires_configuration: p?.requires_configuration ?? false,
    is_featured: p?.is_featured ?? false,
    display_order: p?.display_order ?? 0,
    discontinued_at: p?.discontinued_at ? p.discontinued_at.slice(0, 16) : '',
    seo_title: p?.seo_title ?? '',
    seo_description: p?.seo_description ?? '',
    overview: json(p?.overview),
    features: json(p?.features),
    applications_text: json(p?.applications_text),
    principle: json(p?.principle),
    sample_types: json(p?.sample_types),
    operating_conditions: json(p?.operating_conditions),
    accessories_options: json(p?.accessories_options),
  };
}
export function buildProductPayload(
  value: Value,
  state: {
    featured: MediaAdminView | null;
    gallery: readonly MediaAdminView[];
    mediaRoles: Readonly<Record<string, AdminProductMediaRole>>;
    categoryIds: readonly string[];
    primaryCategory: string | null;
    standards: readonly StandardState[];
    applicationIds: readonly string[];
    primaryApplication: string | null;
    industryIds: readonly string[];
    related: readonly RelatedState[];
    specs: readonly SpecState[];
    dirtyRelations: ReadonlySet<RelationField>;
    isCreate: boolean;
  },
): AdminProductWriteRequest {
  const body: AdminProductWriteRequest = {
    brand_id: value.brand_id,
    name: value.name,
    slug: value.slug,
    short_description: value.short_description || null,
    model: value.model || null,
    internal_code: value.internal_code || null,
    sku: value.sku || null,
    product_type: value.product_type,
    featured_image_id: state.featured?.id ?? null,
    overview: parseBlocks(value.overview),
    features: parseBlocks(value.features),
    applications_text: parseBlocks(value.applications_text),
    principle: parseBlocks(value.principle),
    sample_types: parseBlocks(value.sample_types),
    operating_conditions: parseBlocks(value.operating_conditions),
    accessories_options: parseBlocks(value.accessories_options),
    seo_title: value.seo_title || null,
    seo_description: value.seo_description || null,
    price_visibility: value.price_visibility,
    sale_mode: value.sale_mode,
    requires_configuration: value.requires_configuration,
    warranty_months: value.warranty_months,
    is_featured: value.is_featured,
    display_order: value.display_order,
    discontinued_at: value.discontinued_at ? new Date(value.discontinued_at).toISOString() : null,
  };
  const include = (field: RelationField) => state.isCreate || state.dirtyRelations.has(field);
  return {
    ...body,
    ...(include('categories') && {
      categories: state.categoryIds.map((id) => ({
        category_id: id,
        is_primary: id === state.primaryCategory,
      })),
    }),
    ...(include('standards') && {
      standards: state.standards.map((item, index) => ({
        standard_id: item.id,
        compliance_type: item.compliance,
        note: item.note || null,
        display_order: index,
      })),
    }),
    ...(include('applications') && {
      applications: state.applicationIds.map((id) => ({
        application_id: id,
        is_primary: id === state.primaryApplication,
      })),
    }),
    ...(include('industries') && {
      industries: state.industryIds.map((id) => ({ industry_id: id })),
    }),
    ...(include('media') && {
      media: state.gallery.map((item, index) => ({
        media_id: item.id,
        media_role: state.mediaRoles[item.id] ?? 'gallery',
        display_order: index,
      })),
    }),
    ...(include('related_products') && {
      related_products: state.related.map((item, index) => ({
        related_product_id: item.id,
        relation_type: item.relation,
        display_order: index,
      })),
    }),
    ...(include('specifications') && {
      specifications: state.specs
        .filter((item) => item.label.trim())
        .map((item, index) => ({
          ...(item.id ? { id: item.id } : {}),
          group_key: item.group || null,
          label: item.label,
          value: item.value || null,
          unit: item.unit || null,
          display_order: index,
        })),
    }),
  };
}
function parseBlocks(value: string) {
  try {
    return blocksSchema.parse(JSON.parse(value || '[]'));
  } catch {
    throw new Error('Một vùng ContentBlock JSON không hợp lệ.');
  }
}
function option(item: AdminTaxonomyListItemView) {
  return { id: item.id, label: item.label, description: item.parent?.label ?? item.slug };
}
function updateAt(
  rows: readonly SpecState[],
  index: number,
  patch: Partial<SpecState>,
): readonly SpecState[] {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
}
