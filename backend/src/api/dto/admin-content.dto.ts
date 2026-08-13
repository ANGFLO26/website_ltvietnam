import { anyBlockSchema, faqSchema, validateContentField } from '@ltv/contracts';
import { z } from 'zod';
import { queryBooleanSchema } from './parse.js';
const uuid = z.string().uuid(),
  txt = (n: number) => z.string().trim().min(1).max(n),
  nt = (n: number) => txt(n).nullable(),
  nu = uuid.nullable();
const slug = txt(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  blocks = (field: string) =>
    z
      .array(anyBlockSchema)
      .max(200)
      .superRefine((value, ctx) => {
        try {
          validateContentField(field, value);
        } catch (error) {
          ctx.addIssue({
            code: 'custom',
            message: error instanceof Error ? error.message : 'Noi dung khong hop le',
          });
        }
      }),
  ids = z.array(uuid).max(500);
export const contentListSchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    translation_status: z.enum(['draft', 'published', 'hidden']).optional(),
    locale: z.enum(['vi', 'en']).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    featured: queryBooleanSchema.optional(),
    include_deleted: queryBooleanSchema.default(false),
    project_type: z
      .enum([
        'installation',
        'commissioning',
        'handover',
        'training',
        'maintenance',
        'repair',
        'fabrication',
        'case_study',
        'other',
      ])
      .optional(),
    category_id: uuid.optional(),
    parent_id: nu.optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
const serviceShape = {
  parent_id: nu.optional(),
  service_type: nt(100).optional(),
  featured_image_id: nu.optional(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  product_ids: ids.optional(),
  brand_ids: ids.optional(),
  industry_ids: ids.optional(),
};
export const serviceCreateSchema = z.object(serviceShape).strict(),
  servicePatchSchema = serviceCreateSchema.partial().refine((v) => Object.keys(v).length > 0);
const projectShape = {
  project_type: z.enum([
    'installation',
    'commissioning',
    'handover',
    'training',
    'maintenance',
    'repair',
    'fabrication',
    'case_study',
    'other',
  ]),
  customer_id: nu.optional(),
  customer_visibility: z.enum(['public', 'hide_name', 'industry_only', 'confidential']).optional(),
  location_text: nt(1000).optional(),
  country_code: nt(2).optional(),
  started_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  completed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  featured_image_id: nu.optional(),
  is_featured: z.boolean().optional(),
  product_ids: ids.optional(),
  service_ids: ids.optional(),
  brand_ids: ids.optional(),
  media: z
    .array(z.object({ media_id: uuid, caption: nt(500).optional() }).strict())
    .max(100)
    .optional(),
};
export const projectCreateSchema = z.object(projectShape).strict(),
  projectPatchSchema = projectCreateSchema.partial().refine((v) => Object.keys(v).length > 0);
const postShape = {
  category_id: uuid,
  featured_image_id: nu.optional(),
  author_id: nu.optional(),
  is_featured: z.boolean().optional(),
  product_ids: ids.optional(),
  service_ids: ids.optional(),
  project_ids: ids.optional(),
  brand_ids: ids.optional(),
  media: ids.optional(),
};
export const postCreateSchema = z.object(postShape).strict(),
  postPatchSchema = postCreateSchema.partial().refine((v) => Object.keys(v).length > 0);
const pageShape = {
  page_type: txt(100),
  featured_image_id: nu.optional(),
  is_system_page: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
};
export const pageCreateSchema = z.object(pageShape).strict(),
  pagePatchSchema = z
    .object({ featured_image_id: nu.optional(), display_order: z.number().int().min(0).optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0);
const seo = {
  seo_title: nt(255).optional(),
  seo_description: nt(500).optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
};
const translationPatch = <S extends z.ZodRawShape>(shape: S) =>
  z
    .object(shape)
    .strict()
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Can it nhat mot truong de cap nhat');
export const serviceTranslationSchema = translationPatch({
  name: txt(255),
  slug,
  short_description: nt(2000).optional(),
  overview: blocks('service_translations.overview').optional(),
  customer_problems: blocks('service_translations.customer_problems').optional(),
  scope_of_work: blocks('service_translations.scope_of_work').optional(),
  process: blocks('service_translations.process').optional(),
  benefits: blocks('service_translations.benefits').optional(),
  faq: faqSchema.optional(),
  ...seo,
});
export const projectTranslationSchema = translationPatch({
  title: txt(255),
  slug,
  short_description: nt(2000).optional(),
  scope_of_work: blocks('project_translations.scope_of_work').optional(),
  implementation: blocks('project_translations.implementation').optional(),
  result: blocks('project_translations.result').optional(),
  customer_display_name: nt(500).optional(),
  ...seo,
});
export const postTranslationSchema = translationPatch({
  title: txt(255),
  slug,
  excerpt: nt(2000).optional(),
  content: blocks('post_translations.content').optional(),
  ...seo,
});
export const pageTranslationSchema = translationPatch({
  title: txt(255),
  slug,
  summary: nt(2000).optional(),
  content: blocks('page_translations.content').optional(),
  ...seo,
});
const pcShape = {
  parent_id: nu.optional(),
  name: txt(255),
  slug,
  description: nt(5000).optional(),
  seo_title: nt(255).optional(),
  seo_description: nt(500).optional(),
  display_order: z.number().int().min(0).optional(),
};
export const postCategoryCreateSchema = z.object(pcShape).strict(),
  postCategoryPatchSchema = postCategoryCreateSchema
    .partial()
    .refine((v) => Object.keys(v).length > 0);
