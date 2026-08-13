import { z } from 'zod';
import { queryBooleanSchema } from './parse.js';

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) => text(max).nullable();
const nullableUuid = uuid.nullable();
const slug = text(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const order = z.number().int().min(0);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const safeUrl = z
  .string()
  .trim()
  .max(2_048)
  .refine(
    (value) => value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//')),
    'Chi chap nhan HTTPS hoac duong dan noi bo bat dau bang /',
  );
const patch = <S extends z.ZodRawShape>(shape: S) =>
  z
    .object(shape)
    .strict()
    .partial()
    .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong');

export const documentSchema = z
  .object({
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
    file_id: uuid,
    title: text(255),
    slug,
    description: nullableText(10_000).optional(),
    language: z.enum(['vi', 'en', 'multi']).optional(),
    version: nullableText(100).optional(),
    publication_date: date.nullable().optional(),
    visibility: z
      .enum(['public', 'hidden', 'email_required', 'customer_only', 'staff_only'])
      .optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
    product_ids: z.array(uuid).max(500).optional(),
    brand_ids: z.array(uuid).max(500).optional(),
    service_ids: z.array(uuid).max(500).optional(),
    post_ids: z.array(uuid).max(500).optional(),
  })
  .strict();
export const documentPatchSchema = documentSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export const documentListSchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    visibility: z
      .enum(['public', 'hidden', 'email_required', 'customer_only', 'staff_only'])
      .optional(),
    document_type: z
      .enum([
        'catalogue',
        'brochure',
        'datasheet',
        'application_note',
        'company_profile',
        'manual',
        'certificate',
        'other',
      ])
      .optional(),
    language: z.enum(['vi', 'en', 'multi']).optional(),
    q: text(255).optional(),
    include_deleted: queryBooleanSchema.default(false),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const customerShape = {
  name: text(255),
  short_description: nullableText(2_000).optional(),
  logo_id: nullableUuid.optional(),
  industry_id: nullableUuid.optional(),
  website_url: z.string().url().max(2_048).nullable().optional(),
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  display_order: order.optional(),
};
export const customerSchema = z.object(customerShape).strict();
export const customerPatchSchema = patch(customerShape);
export const customerListSchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    public: queryBooleanSchema.optional(),
    featured: queryBooleanSchema.optional(),
    industry_id: uuid.optional(),
    include_deleted: queryBooleanSchema.default(false),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const officeShape = {
  office_type: z.enum([
    'head_office',
    'branch',
    'representative_office',
    'service_center',
    'workshop',
  ]),
  name: text(255),
  address: text(2_000),
  working_hours: nullableText(1_000).optional(),
  description: nullableText(5_000).optional(),
  phone: nullableText(100).optional(),
  fax: nullableText(100).optional(),
  email: z.string().email().max(320).nullable().optional(),
  map_url: safeUrl.nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  featured_image_id: nullableUuid.optional(),
  display_order: order.optional(),
};
const officeBase = z.object(officeShape).strict();
const coordinatePair = (
  value: { latitude?: number | null | undefined; longitude?: number | null | undefined },
  ctx: z.RefinementCtx,
) => {
  const hasLatitude = value.latitude !== undefined && value.latitude !== null;
  const hasLongitude = value.longitude !== undefined && value.longitude !== null;
  if (hasLatitude !== hasLongitude)
    ctx.addIssue({
      code: 'custom',
      path: ['latitude'],
      message: 'Latitude va longitude phai duoc nhap cung nhau',
    });
};
export const officeSchema = officeBase.superRefine(coordinatePair);
export const officePatchSchema = officeBase
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong')
  .superRefine(coordinatePair);
export const officeListSchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    office_type: officeShape.office_type.optional(),
  })
  .strict();

const bannerShape = {
  image_id: uuid,
  title: text(255),
  mobile_image_id: nullableUuid.optional(),
  subtitle: nullableText(1_000).optional(),
  button_label: nullableText(255).optional(),
  image_alt: nullableText(500).optional(),
  link_type: z
    .enum([
      'product',
      'product_category',
      'brand',
      'service',
      'project',
      'post',
      'page',
      'custom_url',
      'none',
    ])
    .optional(),
  link_target_id: nullableUuid.optional(),
  custom_url: safeUrl.nullable().optional(),
  open_new_tab: z.boolean().optional(),
  display_order: order.optional(),
  start_at: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .nullable()
    .optional(),
  end_at: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .nullable()
    .optional(),
};
const bannerBase = z.object(bannerShape).strict();
const polymorphicLink = (
  value: {
    link_type?: string | undefined;
    link_target_id?: string | null | undefined;
    custom_url?: string | null | undefined;
  },
  ctx: z.RefinementCtx,
) => {
  const kind = value.link_type;
  if (kind === undefined) return;
  if (kind === 'custom_url' && !value.custom_url)
    ctx.addIssue({ code: 'custom', path: ['custom_url'], message: 'Hay nhap URL tuy chinh' });
  if (kind === 'custom_url' && value.link_target_id)
    ctx.addIssue({
      code: 'custom',
      path: ['link_target_id'],
      message: 'Custom URL khong dung target ID',
    });
  if (kind === 'none' && (value.link_target_id || value.custom_url))
    ctx.addIssue({ code: 'custom', path: ['link_type'], message: 'Lien ket none khong co target' });
  if (!['custom_url', 'none'].includes(kind) && !value.link_target_id)
    ctx.addIssue({ code: 'custom', path: ['link_target_id'], message: 'Hay chon noi dung dich' });
  if (!['custom_url', 'none'].includes(kind) && value.custom_url)
    ctx.addIssue({
      code: 'custom',
      path: ['custom_url'],
      message: 'Loai lien ket noi bo khong dung custom URL',
    });
};
const bannerRules = (value: z.infer<typeof bannerBase>, ctx: z.RefinementCtx) => {
  polymorphicLink(value, ctx);
  if (value.start_at && value.end_at && value.start_at >= value.end_at)
    ctx.addIssue({
      code: 'custom',
      path: ['end_at'],
      message: 'Thoi gian ket thuc phai sau thoi gian bat dau',
    });
};
export const bannerSchema = bannerBase.superRefine(bannerRules);
export const bannerPatchSchema = bannerBase
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong')
  .superRefine((value, ctx) => {
    polymorphicLink(value, ctx);
    if (value.start_at && value.end_at && value.start_at >= value.end_at)
      ctx.addIssue({
        code: 'custom',
        path: ['end_at'],
        message: 'Thoi gian ket thuc phai sau thoi gian bat dau',
      });
  });
export const bannerListSchema = z
  .object({ status: z.enum(['draft', 'published', 'hidden']).optional() })
  .strict();

export const homepagePatchSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    display_order: order.optional(),
    settings: z.record(z.string().max(100), z.unknown()).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

export const menuSchema = z
  .object({
    code: text(100).regex(/^[a-z0-9_-]+$/),
    name: text(255),
    location: z.enum([
      'header',
      'mobile',
      'footer_company',
      'footer_products',
      'footer_services',
      'footer_legal',
    ]),
  })
  .strict();
export const menuPatchSchema = z
  .object({
    name: text(255).optional(),
    location: z
      .enum([
        'header',
        'mobile',
        'footer_company',
        'footer_products',
        'footer_services',
        'footer_legal',
      ])
      .optional(),
    status: z.enum(['active', 'hidden']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
const menuItemShape = {
  parent_id: nullableUuid.optional(),
  label: text(255),
  label_i18n_key: nullableText(255).optional(),
  title_attribute: nullableText(500).optional(),
  link_type: z.enum([
    'page',
    'product_category',
    'brand',
    'service',
    'post_category',
    'product',
    'post',
    'custom_url',
    'none',
  ]),
  link_target_id: nullableUuid.optional(),
  custom_url: safeUrl.nullable().optional(),
  icon_id: nullableUuid.optional(),
  open_new_tab: z.boolean().optional(),
  display_order: order.optional(),
  status: z.enum(['active', 'hidden']).optional(),
};
const menuItemBase = z.object(menuItemShape).strict();
export const menuItemSchema = menuItemBase.superRefine(polymorphicLink);
export const menuItemPatchSchema = menuItemBase
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong')
  .superRefine(polymorphicLink);
export const reorderSchema = z.object({ item_ids: z.array(uuid).max(500) }).strict();
