'use client';

import type {
  AdminContentDetailView,
  AdminContentEntityWriteRequest,
  AdminContentTranslationView,
  AdminContentTranslationWriteRequest,
  AdminLocale,
  ContentBlock,
  Faq,
} from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { BlockEditor } from '@/components/content-editor/BlockEditor';
import { ContentPreview } from '@/components/content-editor/ContentPreview';
import { FaqEditor } from '@/components/content-editor/FaqEditor';
import { LanguageTabs } from '@/components/content-editor/LanguageTabs';
import { createEditorState, serializeEditorState } from '@/components/content-editor/editor-state';
import { FormSection } from '@/components/forms/FormSection';
import { LifecycleActions } from '@/components/forms/LifecycleActions';
import { PublishPreflightPanel } from '@/components/forms/PublishPreflightPanel';
import { RelationSelector } from '@/components/forms/RelationSelector';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { saveTranslation, updateContent } from './api';
import type { ContentResourceConfig } from './config';
import type { ContentFormOptions } from './options.server';

type TranslationDraft = {
  title: string;
  slug: string;
  lead: string;
  customer_display_name: string;
  seo_title: string;
  seo_description: string;
  overview: ContentBlock[];
  customer_problems: ContentBlock[];
  scope_of_work: ContentBlock[];
  process: ContentBlock[];
  benefits: ContentBlock[];
  implementation: ContentBlock[];
  result: ContentBlock[];
  content: ContentBlock[];
  faq: Faq;
  status: 'draft' | 'published' | 'hidden';
};
type EntityDraft = {
  parent_id: string;
  service_type: string;
  project_type: string;
  customer_id: string;
  customer_visibility: string;
  location_text: string;
  country_code: string;
  started_at: string;
  completed_at: string;
  category_id: string;
  page_type: string;
  featured_image_id: string;
  is_featured: boolean;
  display_order: number;
  product_ids: readonly string[];
  brand_ids: readonly string[];
  industry_ids: readonly string[];
  service_ids: readonly string[];
  project_ids: readonly string[];
  media_ids: readonly string[];
};

export function ContentForm({
  detail,
  config,
  options,
}: {
  readonly detail: AdminContentDetailView;
  readonly config: ContentResourceConfig;
  readonly options: ContentFormOptions;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const resource = config.resource as 'services' | 'projects' | 'posts' | 'pages';
  const [entity, setEntity] = useState(() => entityDraft(detail));
  const entitySnapshot = useRef(JSON.stringify(entity));
  const [active, setActive] = useState<AdminLocale>('vi');
  const [drafts, setDrafts] = useState<Record<AdminLocale, TranslationDraft>>(() => ({
    vi: translationDraft(detail, 'vi'),
    en: translationDraft(detail, 'en'),
  }));
  const translationSnapshots = useRef<Record<AdminLocale, string>>({
    vi: JSON.stringify(drafts.vi),
    en: JSON.stringify(drafts.en),
  });
  const [preview, setPreview] = useState(false);
  const dirty = {
    vi: JSON.stringify(drafts.vi) !== translationSnapshots.current.vi,
    en: JSON.stringify(drafts.en) !== translationSnapshots.current.en,
  };
  const entityDirty = JSON.stringify(entity) !== entitySnapshot.current;
  useUnsavedChanges(entityDirty || dirty.vi || dirty.en);
  const baseSave = useMutation({
    mutationFn: () => updateContent(resource, detail.entity.id, entityBody(detail, entity)),
    onSuccess: async () => {
      entitySnapshot.current = JSON.stringify(entity);
      await queryClient.invalidateQueries({ queryKey: ['content', resource] });
      toast.show('Đã lưu cấu hình nội dung.', 'success');
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu cấu hình.', 'danger'),
  });
  const localeSave = useMutation({
    mutationFn: ({ locale, status }: { locale: AdminLocale; status?: 'published' | 'hidden' }) =>
      saveTranslation(resource, detail.entity.id, locale, {
        ...translationBody(detail.kind, drafts[locale]),
        ...(status ? { status } : {}),
      }),
    onSuccess: async (saved, variables) => {
      const next = fromSaved(detail.kind, saved);
      setDrafts((current) => ({ ...current, [variables.locale]: next }));
      translationSnapshots.current[variables.locale] = JSON.stringify(next);
      await queryClient.invalidateQueries({ queryKey: ['content', resource] });
      toast.show(
        variables.status === 'published'
          ? `Đã xuất bản ${variables.locale.toUpperCase()}.`
          : variables.status === 'hidden'
            ? `Đã ẩn ${variables.locale.toUpperCase()}.`
            : `Đã lưu bản dịch ${variables.locale.toUpperCase()}.`,
        'success',
      );
      router.refresh();
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu bản dịch.', 'danger'),
  });
  const translationStates = Object.fromEntries(
    (['vi', 'en'] as const).map((locale) => [locale, findTranslation(detail, locale)?.status]),
  );
  const activeDraft = drafts[active];
  const updateDraft = (patch: Partial<TranslationDraft>) =>
    setDrafts((current) => ({ ...current, [active]: { ...current[active], ...patch } }));
  return (
    <div className="editor-layout">
      <div className="editor-main">
        <FormSection
          id="entity"
          title="Cấu hình chung"
          description="Thông tin dùng chung cho cả VI và EN. Nội dung dịch được lưu độc lập ở phần bên dưới."
        >
          <EntityFields detail={detail} value={entity} onChange={setEntity} options={options} />
          {detail.kind === 'project' && entity.customer_visibility === 'public' ? (
            <div className="privacy-warning" role="alert">
              <strong>Cảnh báo công khai tên khách hàng</strong>
              <p>
                Chế độ “Công khai” cho phép website nêu tên thật. Hãy xác nhận quyền công bố và điều
                khoản NDA trước khi xuất bản.
              </p>
            </div>
          ) : null}
          <Button
            type="button"
            icon={<Save size={17} />}
            loading={baseSave.isPending}
            disabled={!entityDirty}
            onClick={() => baseSave.mutate()}
          >
            Lưu cấu hình chung
          </Button>
        </FormSection>
        <section className="panel translation-panel">
          <div className="translation-panel__heading">
            <div>
              <p className="section-eyebrow">Nội dung song ngữ</p>
              <h2>Biên tập từng ngôn ngữ độc lập</h2>
              <p>Đổi tab không sao chép hoặc ghi đè bản dịch còn lại.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              icon={preview ? <EyeOff size={17} /> : <Eye size={17} />}
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? 'Đóng xem trước' : 'Xem trước bản nháp'}
            </Button>
          </div>
          <LanguageTabs
            active={active}
            onChange={setActive}
            states={translationStates}
            dirty={dirty}
          />
          {preview ? (
            <ContentPreview
              blocks={previewBlocks(detail.kind, activeDraft)}
              title={`Xem trước nội bộ · ${active.toUpperCase()}`}
            />
          ) : (
            <TranslationFields
              kind={detail.kind}
              value={activeDraft}
              onChange={updateDraft}
              options={options}
            />
          )}
        </section>
        {!preview ? (
          <PublishPreflightPanel
            target={{ entity: detail.kind, id: detail.entity.id, locale: active }}
            onReady={() => localeSave.mutate({ locale: active, status: 'published' })}
          />
        ) : null}
      </div>
      <aside className="editor-sidebar">
        <section className="panel editor-summary">
          <h2>
            {active.toUpperCase()} · {statusLabel(activeDraft.status)}
          </h2>
          <p>
            Lưu bản dịch trước khi chạy kiểm tra xuất bản để preflight đọc đúng dữ liệu mới nhất.
          </p>
          <Button
            type="button"
            icon={<Save size={17} />}
            loading={localeSave.isPending}
            disabled={!dirty[active]}
            onClick={() => localeSave.mutate({ locale: active })}
          >
            Lưu bản dịch {active.toUpperCase()}
          </Button>
          {activeDraft.status === 'published' ? (
            <Button
              type="button"
              variant="secondary"
              icon={<EyeOff size={17} />}
              onClick={() => localeSave.mutate({ locale: active, status: 'hidden' })}
            >
              Ẩn bản {active.toUpperCase()}
            </Button>
          ) : null}
          <hr />
          {detail.kind === 'page' && detail.entity.is_system_page ? (
            <p className="privacy-warning">
              <strong>Trang hệ thống</strong>
              <br />
              Trang này không thể xóa.
            </p>
          ) : (
            <LifecycleActions
              resourcePath={`/admin/${resource}/${detail.entity.id}`}
              status={detail.entity.status}
              returnTo={`/content/${resource}`}
              queryKey={['content', resource]}
              allowPublish={false}
            />
          )}
        </section>
      </aside>
    </div>
  );
}

function EntityFields({
  detail,
  value,
  onChange,
  options,
}: {
  readonly detail: AdminContentDetailView;
  readonly value: EntityDraft;
  readonly onChange: (value: EntityDraft) => void;
  readonly options: ContentFormOptions;
}) {
  const set = <K extends keyof EntityDraft>(key: K, next: EntityDraft[K]) =>
    onChange({ ...value, [key]: next });
  const featured = options.media.find((item) => item.id === value.featured_image_id) ?? null;
  return (
    <div className="entity-fields">
      {detail.kind === 'service' ? (
        <div className="form-grid form-grid--two">
          <Select
            label="Dịch vụ cha"
            value={value.parent_id}
            onChange={(event) => set('parent_id', event.target.value)}
          >
            <option value="">Không có</option>
            {options.services
              .filter((item) => item.id !== detail.entity.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </Select>
          <Field
            label="Loại dịch vụ"
            value={value.service_type}
            onChange={(event) => set('service_type', event.target.value)}
          />
          <Field
            label="Thứ tự"
            type="number"
            min={0}
            value={value.display_order}
            onChange={(event) => set('display_order', Number(event.target.value))}
          />
        </div>
      ) : null}
      {detail.kind === 'project' ? (
        <div className="form-grid form-grid--two">
          <Select
            label="Loại dự án"
            value={value.project_type}
            onChange={(event) => set('project_type', event.target.value)}
          >
            {[
              'installation',
              'commissioning',
              'handover',
              'training',
              'maintenance',
              'repair',
              'fabrication',
              'case_study',
              'other',
            ].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            label="Khách hàng"
            value={value.customer_id}
            onChange={(event) => set('customer_id', event.target.value)}
          >
            <option value="">Không liên kết</option>
            {options.customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select
            label="Mức công khai khách hàng"
            value={value.customer_visibility}
            onChange={(event) => set('customer_visibility', event.target.value)}
          >
            <option value="confidential">Bảo mật hoàn toàn</option>
            <option value="hide_name">Ẩn tên</option>
            <option value="industry_only">Chỉ nêu ngành</option>
            <option value="public">Công khai tên thật</option>
          </Select>
          <Field
            label="Địa điểm"
            value={value.location_text}
            onChange={(event) => set('location_text', event.target.value)}
          />
          <Field
            label="Mã quốc gia"
            maxLength={2}
            value={value.country_code}
            onChange={(event) => set('country_code', event.target.value.toUpperCase())}
          />
          <Field
            label="Ngày bắt đầu"
            type="date"
            value={value.started_at}
            onChange={(event) => set('started_at', event.target.value)}
          />
          <Field
            label="Ngày hoàn thành"
            type="date"
            value={value.completed_at}
            onChange={(event) => set('completed_at', event.target.value)}
          />
        </div>
      ) : null}
      {detail.kind === 'post' ? (
        <Select
          label="Danh mục bài viết"
          value={value.category_id}
          onChange={(event) => set('category_id', event.target.value)}
        >
          <option value="">Chọn danh mục</option>
          {options.postCategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      ) : null}
      {detail.kind === 'page' ? (
        <div className="form-grid form-grid--two">
          <Field label="Loại trang" value={value.page_type} disabled />
          <Field
            label="Thứ tự"
            type="number"
            min={0}
            value={value.display_order}
            onChange={(event) => set('display_order', Number(event.target.value))}
          />
        </div>
      ) : null}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.is_featured}
          onChange={(event) => set('is_featured', event.target.checked)}
        />
        <span>Nội dung nổi bật</span>
      </label>
      <MediaPicker
        label="Ảnh đại diện"
        value={featured}
        onChange={(item) => set('featured_image_id', item?.id ?? '')}
      />
      <RelationFields kind={detail.kind} value={value} set={set} options={options} />
    </div>
  );
}

function RelationFields({
  kind,
  value,
  set,
  options,
}: {
  readonly kind: AdminContentDetailView['kind'];
  readonly value: EntityDraft;
  readonly set: <K extends keyof EntityDraft>(key: K, value: EntityDraft[K]) => void;
  readonly options: ContentFormOptions;
}) {
  if (kind === 'page') return null;
  return (
    <div className="form-grid form-grid--two relation-grid">
      <RelationSelector
        label="Sản phẩm liên quan"
        options={options.products}
        selected={value.product_ids}
        onChange={(ids) => set('product_ids', ids)}
      />
      <RelationSelector
        label="Hãng liên quan"
        options={options.brands}
        selected={value.brand_ids}
        onChange={(ids) => set('brand_ids', ids)}
      />
      {kind === 'service' ? (
        <RelationSelector
          label="Ngành liên quan"
          options={options.industries}
          selected={value.industry_ids}
          onChange={(ids) => set('industry_ids', ids)}
        />
      ) : null}
      {kind === 'project' || kind === 'post' ? (
        <RelationSelector
          label="Dịch vụ liên quan"
          options={options.services}
          selected={value.service_ids}
          onChange={(ids) => set('service_ids', ids)}
        />
      ) : null}
      {kind === 'post' ? (
        <RelationSelector
          label="Dự án liên quan"
          options={options.projects}
          selected={value.project_ids}
          onChange={(ids) => set('project_ids', ids)}
        />
      ) : null}
      {kind === 'project' || kind === 'post' ? (
        <RelationSelector
          label="Media thư viện"
          options={options.media.map((item) => ({
            id: item.id,
            label: item.title ?? item.original_name,
            description: item.mime_type,
          }))}
          selected={value.media_ids}
          onChange={(ids) => set('media_ids', ids)}
          max={100}
        />
      ) : null}
    </div>
  );
}

function TranslationFields({
  kind,
  value,
  onChange,
  options,
}: {
  readonly kind: AdminContentDetailView['kind'];
  readonly value: TranslationDraft;
  readonly onChange: (patch: Partial<TranslationDraft>) => void;
  readonly options: ContentFormOptions;
}) {
  const titleLabel = kind === 'service' ? 'Tên dịch vụ' : 'Tiêu đề';
  const fields = blockFields(kind);
  return (
    <div className="translation-fields">
      <FormSection id="translation-identity" title="Tiêu đề và đường dẫn">
        <div className="form-grid form-grid--two">
          <Field
            label={titleLabel}
            required
            value={value.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          <Field
            label="Slug"
            required
            value={value.slug}
            onChange={(event) => onChange({ slug: event.target.value })}
          />
        </div>
        <Textarea
          label={kind === 'page' ? 'Tóm tắt' : kind === 'post' ? 'Trích đoạn' : 'Mô tả ngắn'}
          rows={4}
          value={value.lead}
          onChange={(event) => onChange({ lead: event.target.value })}
        />
        {kind === 'project' ? (
          <Field
            label="Tên khách hàng hiển thị thay thế"
            value={value.customer_display_name}
            onChange={(event) => onChange({ customer_display_name: event.target.value })}
          />
        ) : null}
      </FormSection>
      {fields.map((item) => (
        <FormSection
          key={item.key}
          id={item.key}
          title={item.label}
          description={`Block hợp lệ được giới hạn riêng cho trường ${item.label.toLowerCase()}.`}
        >
          <BlockEditor
            field={item.schema}
            value={value[item.key]}
            onChange={(blocks) => onChange({ [item.key]: blocks })}
            media={options.media}
            documents={options.documents}
          />
        </FormSection>
      ))}
      {kind === 'service' ? (
        <FormSection id="faq" title="Câu hỏi thường gặp">
          <FaqEditor value={value.faq} onChange={(faq) => onChange({ faq })} />
        </FormSection>
      ) : null}
      <FormSection id="translation-seo" title="SEO theo ngôn ngữ">
        <div className="form-grid form-grid--two">
          <Field
            label="SEO title"
            value={value.seo_title}
            onChange={(event) => onChange({ seo_title: event.target.value })}
          />
          <Textarea
            label="SEO description"
            rows={3}
            value={value.seo_description}
            onChange={(event) => onChange({ seo_description: event.target.value })}
          />
        </div>
      </FormSection>
    </div>
  );
}

const emptyBlocks = (): ContentBlock[] => [];
function translationDraft(detail: AdminContentDetailView, locale: AdminLocale): TranslationDraft {
  const item = findTranslation(detail, locale) as
    (AdminContentTranslationView & Record<string, unknown>) | undefined;
  return {
    title: String((item && ('name' in item ? item.name : 'title' in item ? item.title : '')) || ''),
    slug: item?.slug ?? '',
    lead: String(
      (item &&
        ('short_description' in item
          ? (item.short_description ?? '')
          : 'summary' in item
            ? (item.summary ?? '')
            : 'excerpt' in item
              ? (item.excerpt ?? '')
              : '')) ||
        '',
    ),
    customer_display_name: String(
      item && 'customer_display_name' in item ? (item.customer_display_name ?? '') : '',
    ),
    seo_title: item?.seo_title ?? '',
    seo_description: item?.seo_description ?? '',
    overview: blocksOf(item, 'overview'),
    customer_problems: blocksOf(item, 'customer_problems'),
    scope_of_work: blocksOf(item, 'scope_of_work'),
    process: blocksOf(item, 'process'),
    benefits: blocksOf(item, 'benefits'),
    implementation: blocksOf(item, 'implementation'),
    result: blocksOf(item, 'result'),
    content: blocksOf(item, 'content'),
    faq: item && 'faq' in item ? cloneFaq(item.faq as Faq) : { version: 1, items: [] },
    status: item?.status ?? 'draft',
  };
}
function blocksOf(item: Record<string, unknown> | undefined, key: string): ContentBlock[] {
  const blocks = item?.[key];
  return Array.isArray(blocks) ? createEditorState(blocks as ContentBlock[]) : emptyBlocks();
}
function cloneFaq(value: Faq): Faq {
  return JSON.parse(JSON.stringify(value)) as Faq;
}
function findTranslation(
  detail: AdminContentDetailView,
  locale: AdminLocale,
): AdminContentTranslationView | undefined {
  return detail.translations.find((item) => item.locale === locale) as
    AdminContentTranslationView | undefined;
}
function fromSaved(
  kind: AdminContentDetailView['kind'],
  saved: AdminContentTranslationView,
): TranslationDraft {
  return translationDraft(
    {
      kind,
      entity: {} as never,
      translations: [saved],
      links: {},
      media: [],
    } as AdminContentDetailView,
    saved.locale,
  );
}

function translationBody(
  kind: AdminContentDetailView['kind'],
  value: TranslationDraft,
): AdminContentTranslationWriteRequest {
  const common = {
    slug: value.slug,
    seo_title: nullable(value.seo_title),
    seo_description: nullable(value.seo_description),
  };
  if (kind === 'service')
    return {
      ...common,
      name: value.title,
      short_description: nullable(value.lead),
      overview: serializeEditorState(value.overview),
      customer_problems: serializeEditorState(value.customer_problems),
      scope_of_work: serializeEditorState(value.scope_of_work),
      process: serializeEditorState(value.process),
      benefits: serializeEditorState(value.benefits),
      faq: value.faq,
    };
  if (kind === 'project')
    return {
      ...common,
      title: value.title,
      short_description: nullable(value.lead),
      scope_of_work: serializeEditorState(value.scope_of_work),
      implementation: serializeEditorState(value.implementation),
      result: serializeEditorState(value.result),
      customer_display_name: nullable(value.customer_display_name),
    };
  if (kind === 'post')
    return {
      ...common,
      title: value.title,
      excerpt: nullable(value.lead),
      content: serializeEditorState(value.content),
    };
  return {
    ...common,
    title: value.title,
    summary: nullable(value.lead),
    content: serializeEditorState(value.content),
  };
}
function blockFields(kind: AdminContentDetailView['kind']): readonly {
  readonly key: keyof Pick<
    TranslationDraft,
    | 'overview'
    | 'customer_problems'
    | 'scope_of_work'
    | 'process'
    | 'benefits'
    | 'implementation'
    | 'result'
    | 'content'
  >;
  readonly label: string;
  readonly schema: string;
}[] {
  if (kind === 'service')
    return [
      { key: 'overview', label: 'Tổng quan', schema: 'service_translations.overview' },
      {
        key: 'customer_problems',
        label: 'Vấn đề khách hàng',
        schema: 'service_translations.customer_problems',
      },
      {
        key: 'scope_of_work',
        label: 'Phạm vi công việc',
        schema: 'service_translations.scope_of_work',
      },
      { key: 'process', label: 'Quy trình', schema: 'service_translations.process' },
      { key: 'benefits', label: 'Lợi ích', schema: 'service_translations.benefits' },
    ];
  if (kind === 'project')
    return [
      {
        key: 'scope_of_work',
        label: 'Phạm vi công việc',
        schema: 'project_translations.scope_of_work',
      },
      { key: 'implementation', label: 'Triển khai', schema: 'project_translations.implementation' },
      { key: 'result', label: 'Kết quả', schema: 'project_translations.result' },
    ];
  return [{ key: 'content', label: 'Nội dung', schema: `${kind}_translations.content` }];
}
function previewBlocks(
  kind: AdminContentDetailView['kind'],
  value: TranslationDraft,
): ContentBlock[] {
  return blockFields(kind).flatMap((field) => value[field.key]);
}
function entityDraft(detail: AdminContentDetailView): EntityDraft {
  const base = {
    parent_id: '',
    service_type: '',
    project_type: 'other',
    customer_id: '',
    customer_visibility: 'confidential',
    location_text: '',
    country_code: '',
    started_at: '',
    completed_at: '',
    category_id: '',
    page_type: '',
    featured_image_id: detail.entity.featured_image_id ?? '',
    is_featured: 'is_featured' in detail.entity ? detail.entity.is_featured : false,
    display_order: 'display_order' in detail.entity ? detail.entity.display_order : 0,
    product_ids: detail.links.product_ids ?? [],
    brand_ids: detail.links.brand_ids ?? [],
    industry_ids: detail.links.industry_ids ?? [],
    service_ids: detail.links.service_ids ?? [],
    project_ids: detail.links.project_ids ?? [],
    media_ids: detail.media.map((item) => item.media_id),
  } satisfies EntityDraft;
  switch (detail.kind) {
    case 'service':
      return {
        ...base,
        parent_id: detail.entity.parent_id ?? '',
        service_type: detail.entity.service_type ?? '',
      };
    case 'project':
      return {
        ...base,
        project_type: detail.entity.project_type,
        customer_id: detail.entity.customer_id ?? '',
        customer_visibility: detail.entity.customer_visibility,
        location_text: detail.entity.location_text ?? '',
        country_code: detail.entity.country_code ?? '',
        started_at: detail.entity.started_at ?? '',
        completed_at: detail.entity.completed_at ?? '',
      };
    case 'post':
      return { ...base, category_id: detail.entity.category_id };
    case 'page':
      return { ...base, page_type: detail.entity.page_type };
  }
}
function entityBody(
  detail: AdminContentDetailView,
  value: EntityDraft,
): AdminContentEntityWriteRequest {
  const common = {
    featured_image_id: nullable(value.featured_image_id),
    is_featured: value.is_featured,
  };
  if (detail.kind === 'service')
    return {
      ...common,
      parent_id: nullable(value.parent_id),
      service_type: nullable(value.service_type),
      display_order: value.display_order,
      product_ids: value.product_ids,
      brand_ids: value.brand_ids,
      industry_ids: value.industry_ids,
    };
  if (detail.kind === 'project')
    return {
      ...common,
      project_type: value.project_type as never,
      customer_id: nullable(value.customer_id),
      customer_visibility: value.customer_visibility as never,
      location_text: nullable(value.location_text),
      country_code: nullable(value.country_code),
      started_at: nullable(value.started_at),
      completed_at: nullable(value.completed_at),
      product_ids: value.product_ids,
      service_ids: value.service_ids,
      brand_ids: value.brand_ids,
      media: value.media_ids.map((media_id) => ({
        media_id,
        caption:
          detail.media.find((item) => item.media_id === media_id && 'caption' in item)?.caption ??
          null,
      })),
    };
  if (detail.kind === 'post')
    return {
      ...common,
      category_id: value.category_id,
      product_ids: value.product_ids,
      service_ids: value.service_ids,
      project_ids: value.project_ids,
      brand_ids: value.brand_ids,
      media: value.media_ids,
    };
  return {
    featured_image_id: nullable(value.featured_image_id),
    display_order: value.display_order,
  };
}
function nullable(value: string): string | null {
  return value.trim() ? value.trim() : null;
}
function statusLabel(status: TranslationDraft['status']): string {
  return status === 'published' ? 'Đã xuất bản' : status === 'hidden' ? 'Đã ẩn' : 'Bản nháp';
}
