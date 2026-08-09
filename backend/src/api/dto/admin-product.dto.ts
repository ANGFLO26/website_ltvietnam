import { anyBlockSchema, validateContentField } from '@ltv/contracts';
import { z } from 'zod';
import { queryBooleanSchema } from './parse.js';

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) => text(max).nullable();
const nullableUuid = uuid.nullable();
const slug = text(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const content = (field: string) =>
  z
    .array(anyBlockSchema)
    .max(200)
    .superRefine((value, ctx) => {
      try {
        validateContentField(field, value);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : 'Khoi noi dung khong hop le',
        });
      }
    });

const category = z.object({ category_id: uuid, is_primary: z.boolean().optional() }).strict();
const standard = z
  .object({
    standard_id: uuid,
    compliance_type: z.enum(['compliance', 'correlation', 'specification', 'reference']).optional(),
    note: nullableText(2_000).optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .strict();
const application = z.object({ application_id: uuid, is_primary: z.boolean().optional() }).strict();
const industry = z.object({ industry_id: uuid }).strict();
const media = z
  .object({
    media_id: uuid,
    media_role: z.enum(['gallery', 'diagram', 'application', 'interface', 'dimension']).optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .strict();
const related = z
  .object({
    related_product_id: uuid,
    relation_type: z.enum(['similar', 'alternative', 'accessory', 'compatible', 'recommended']),
    display_order: z.number().int().min(0).optional(),
  })
  .strict();
const specification = z
  .object({
    id: uuid.optional(),
    group_key: nullableText(100).optional(),
    label: text(500),
    value: nullableText(2_000).optional(),
    unit: nullableText(100).optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .strict();

export const adminProductListQuerySchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    brand_id: uuid.optional(),
    q: text(255).optional(),
    include_deleted: queryBooleanSchema.default(false),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const adminProductCreateSchema = z
  .object({
    brand_id: uuid,
    name: text(255),
    slug,
    short_description: nullableText(2_000).optional(),
    model: nullableText(255).optional(),
    internal_code: nullableText(100).optional(),
    sku: nullableText(100).optional(),
    product_type: z
      .enum(['equipment', 'spare_part', 'accessory', 'consumable', 'chemical', 'other'])
      .optional(),
    featured_image_id: nullableUuid.optional(),
    overview: content('products.overview').optional(),
    features: content('products.features').optional(),
    applications_text: content('products.applications_text').optional(),
    principle: content('products.principle').optional(),
    sample_types: content('products.sample_types').optional(),
    operating_conditions: content('products.operating_conditions').optional(),
    accessories_options: content('products.accessories_options').optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
    price_visibility: z.enum(['hidden', 'visible', 'contact']).optional(),
    sale_mode: z.enum(['inquiry', 'online']).optional(),
    requires_configuration: z.boolean().optional(),
    warranty_months: z.number().int().min(0).max(1_200).nullable().optional(),
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
    discontinued_at: z
      .string()
      .datetime()
      .transform((value) => new Date(value))
      .nullable()
      .optional(),
    categories: z.array(category).max(100).optional(),
    standards: z.array(standard).max(100).optional(),
    applications: z.array(application).max(100).optional(),
    industries: z.array(industry).max(100).optional(),
    media: z.array(media).max(100).optional(),
    related_products: z.array(related).max(100).optional(),
    specifications: z.array(specification).max(500).optional(),
  })
  .strict();

export const adminProductPatchSchema = adminProductCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong de cap nhat');
