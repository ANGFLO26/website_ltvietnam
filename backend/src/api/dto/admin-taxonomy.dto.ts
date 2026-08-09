import { anyBlockSchema } from '@ltv/contracts';
import { z } from 'zod';
import { queryBooleanSchema } from './parse.js';

const uuid = z.string().uuid();
const slug = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) => text(max).nullable();
const nullableUuid = uuid.nullable();
const blocks = z.array(anyBlockSchema).max(200);

export const adminTaxonomyListQuerySchema = z
  .object({
    status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
    featured: queryBooleanSchema.optional(),
    parent_id: z.union([uuid, z.literal('root').transform(() => null)]).optional(),
    include_deleted: queryBooleanSchema.default(false),
    organization: text(100).optional(),
    q: text(255).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const adminDeleteQuerySchema = z
  .object({
    hard: queryBooleanSchema.default(false),
  })
  .strict();

export const brandCreateSchema = z
  .object({
    parent_id: nullableUuid.optional(),
    brand_type: z.enum([
      'manufacturer',
      'sub_brand',
      'global_partner',
      'service_partner',
      'supplier',
    ]),
    name: text(255),
    slug,
    short_description: nullableText(2_000).optional(),
    code: nullableText(100).optional(),
    country_code: nullableText(2).optional(),
    website_url: z.string().url().max(2_048).nullable().optional(),
    logo_id: nullableUuid.optional(),
    cover_image_id: nullableUuid.optional(),
  })
  .strict();

export const brandPatchSchema = brandCreateSchema
  .partial()
  .extend({
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(notEmpty, 'Can it nhat mot truong de cap nhat');

export const productCategoryCreateSchema = z
  .object({
    parent_id: nullableUuid.optional(),
    name: text(255),
    slug,
    short_description: nullableText(2_000).optional(),
    description: blocks.optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
    code: nullableText(100).optional(),
    featured_image_id: nullableUuid.optional(),
    icon_id: nullableUuid.optional(),
  })
  .strict();

export const productCategoryPatchSchema = productCategoryCreateSchema
  .partial()
  .extend({
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(notEmpty, 'Can it nhat mot truong de cap nhat');

export const standardCreateSchema = z
  .object({
    organization: text(100),
    code: text(100),
    slug,
    name: nullableText(255).optional(),
    description: nullableText(10_000).optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
  })
  .strict();

export const standardPatchSchema = standardCreateSchema
  .partial()
  .extend({
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(notEmpty, 'Can it nhat mot truong de cap nhat');

export const applicationCreateSchema = z
  .object({
    parent_id: nullableUuid.optional(),
    name: text(255),
    slug,
    description: blocks.optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
    icon_id: nullableUuid.optional(),
  })
  .strict();

export const applicationPatchSchema = applicationCreateSchema
  .partial()
  .extend({
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(notEmpty, 'Can it nhat mot truong de cap nhat');

export const industryCreateSchema = z
  .object({
    name: text(255),
    slug,
    description: blocks.optional(),
    seo_title: nullableText(255).optional(),
    seo_description: nullableText(500).optional(),
    featured_image_id: nullableUuid.optional(),
    icon_id: nullableUuid.optional(),
  })
  .strict();

export const industryPatchSchema = industryCreateSchema
  .partial()
  .extend({
    is_featured: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(notEmpty, 'Can it nhat mot truong de cap nhat');

function notEmpty(value: object): boolean {
  return Object.keys(value).length > 0;
}
