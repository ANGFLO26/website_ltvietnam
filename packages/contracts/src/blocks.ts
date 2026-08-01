/**
 * Luoc do content block — cai dat co tham quyen.
 *
 * Tai lieu: doc/11_CONTENT_BLOCK_SCHEMA.md
 * Khi tai lieu va file nay khac nhau, FILE NAY THANG — no la thu chay validator.
 *
 * Ba nguyen tac khong duoc pha:
 *   1. Khong bao gio luu HTML. Backend luu du lieu co cau truc, frontend dung HTML.
 *   2. Media chi tham chieu bang media_id, KHONG bao gio bang URL.
 *      Day la dieu kien de content_media_refs hoat dong (ADR-005 v1.3).
 *   3. Mang phang, khong long nhau.
 */
import { z } from 'zod';

// ─────────────────────────── Gioi han (B25) ───────────────────────────
export const LIMITS = {
  blocksPerField: 200,
  jsonBytesPerField: 256 * 1024,
  textPerBlock: 5_000,
  spansPerBlock: 100,
  itemsPerList: 100,
  imagesPerGallery: 24,
  tableRows: 100,
  tableColumns: 10,
  faqItems: 50,
  validateMs: 200,
} as const;

const uuid = z.string().uuid();
const plain = (max: number) => z.string().trim().min(1).max(max);

// ─────────────────────────── Link trong van ban ───────────────────────────
const INTERNAL_KINDS = [
  'product',
  'service',
  'project',
  'post',
  'brand',
  'document',
  'page',
] as const;

export const linkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(INTERNAL_KINDS), slug: plain(255) }),
  // CHI https. Chan javascript:, data:, vbscript: va moi scheme khac.
  z.object({ kind: z.literal('external'), url: z.string().url().startsWith('https://').max(2048) }),
  z.object({ kind: z.literal('anchor'), block_id: uuid }),
]);
export type ContentLink = z.infer<typeof linkSchema>;

// ─────────────────────────── Span ───────────────────────────
export const MARKS = ['bold', 'italic', 'code', 'sup', 'sub'] as const;

export const spanSchema = z.object({
  text: z.string().max(LIMITS.textPerBlock),
  marks: z.array(z.enum(MARKS)).max(3).optional(),
  link: linkSchema.optional(),
});
export type Span = z.infer<typeof spanSchema>;

const spans = z
  .array(spanSchema)
  .min(1)
  .max(LIMITS.spansPerBlock)
  .refine((a) => a.reduce((n, s) => n + s.text.length, 0) <= LIMITS.textPerBlock, {
    message: `Tong do dai van ban vuot ${LIMITS.textPerBlock} ky tu`,
  });

const base = { id: uuid };

// ─────────────────────────── Muoi loai block ───────────────────────────
export const headingSchema = z.object({
  ...base,
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]), // khong cho h1
  text: plain(200),
});

export const paragraphSchema = z.object({ ...base, type: z.literal('paragraph'), spans });

export const listSchema = z.object({
  ...base,
  type: z.literal('list'),
  style: z.enum(['bullet', 'number']),
  items: z.array(z.object({ spans })).min(1).max(LIMITS.itemsPerList),
});

export const imageSchema = z.object({
  ...base,
  type: z.literal('image'),
  media_id: uuid,
  caption: z.string().trim().max(500).optional(),
  alt: z.string().trim().max(500).optional(),
  size: z.enum(['full', 'wide', 'inline']).default('full'),
});

export const gallerySchema = z.object({
  ...base,
  type: z.literal('gallery'),
  layout: z.enum(['grid', 'carousel']),
  items: z
    .array(z.object({ media_id: uuid, caption: z.string().trim().max(500).optional() }))
    .min(1)
    .max(LIMITS.imagesPerGallery),
});

export const tableSchema = z
  .object({
    ...base,
    type: z.literal('table'),
    headers: z.array(z.string().trim().max(500)).min(1).max(LIMITS.tableColumns),
    rows: z
      .array(z.array(z.string().trim().max(500)))
      .min(1)
      .max(LIMITS.tableRows),
  })
  .refine((t) => t.rows.every((r) => r.length === t.headers.length), {
    message: 'Moi dong phai co so o bang so cot',
  });

export const externalVideoSchema = z.object({
  ...base,
  type: z.literal('external_video'),
  provider: z.enum(['youtube', 'vimeo']), // ADR-012 whitelist
  video_id: z
    .string()
    .trim()
    .regex(/^[\w-]{1,64}$/), // luu ID, KHONG luu URL
  title: plain(200),
  caption: z.string().trim().max(500).optional(),
});

export const fileSchema = z.object({
  ...base,
  type: z.literal('file'),
  document_id: uuid, // qua documents, khong tro thang media
  label: z.string().trim().max(200).optional(),
});

export const calloutSchema = z.object({
  ...base,
  type: z.literal('callout'),
  variant: z.enum(['info', 'note', 'warning', 'success']),
  title: z.string().trim().max(200).optional(),
  spans,
});

export const dividerSchema = z.object({ ...base, type: z.literal('divider') });

export const blockSchema = z.discriminatedUnion('type', [
  headingSchema,
  paragraphSchema,
  listSchema,
  imageSchema,
  gallerySchema,
  externalVideoSchema,
  fileSchema,
  calloutSchema,
  dividerSchema,
]);
// table dung .refine nen khong vao discriminatedUnion duoc
export const anyBlockSchema = z.union([blockSchema, tableSchema]);
export type ContentBlock = z.infer<typeof anyBlockSchema>;

export const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'list',
  'image',
  'gallery',
  'table',
  'external_video',
  'file',
  'callout',
  'divider',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

// ─────────────────────────── Phong bi ───────────────────────────
export const contentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(anyBlockSchema).max(LIMITS.blocksPerField),
});
export type Content = z.infer<typeof contentSchema>;

/** Chap nhan ca mang tran (du lieu cu) lan phong bi day du. */
export const contentInputSchema = z.union([
  contentSchema,
  z
    .array(anyBlockSchema)
    .max(LIMITS.blocksPerField)
    .transform((blocks) => ({ version: 1 as const, blocks })),
]);

// ─────────────────────────── FAQ (cau truc rieng) ───────────────────────────
export const faqSchema = z.object({
  version: z.literal(1),
  items: z
    .array(z.object({ id: uuid, question: plain(300), answer_spans: spans }))
    .max(LIMITS.faqItems),
});
export type Faq = z.infer<typeof faqSchema>;

// ─────────────────────────── Allowlist theo truong ───────────────────────────
const ALL = BLOCK_TYPES;
export const FIELD_ALLOWLIST: Readonly<Record<string, readonly BlockType[]>> = {
  'page_translations.content': ALL,
  'post_translations.content': ALL,
  'products.overview': [
    'heading',
    'paragraph',
    'list',
    'image',
    'table',
    'external_video',
    'callout',
    'divider',
  ],
  'products.features': ['list'],
  'products.applications_text': ['paragraph', 'list'],
  'products.principle': ['heading', 'paragraph', 'list', 'image', 'table'],
  'products.sample_types': ['paragraph', 'list', 'table'],
  'products.operating_conditions': ['paragraph', 'list', 'table'],
  'products.accessories_options': ['paragraph', 'list', 'table'],
  'service_translations.overview': ['heading', 'paragraph', 'list', 'image', 'callout', 'divider'],
  'service_translations.customer_problems': ['paragraph', 'list'],
  'service_translations.scope_of_work': ['paragraph', 'list', 'table'],
  'service_translations.process': ['list', 'paragraph', 'image'],
  'service_translations.benefits': ['list'],
  'project_translations.scope_of_work': ['paragraph', 'list', 'table'],
  'project_translations.implementation': ['heading', 'paragraph', 'list', 'image', 'gallery'],
  'project_translations.result': ['paragraph', 'list', 'table', 'gallery'],
  'brands.description': ['heading', 'paragraph', 'list', 'image', 'external_video', 'divider'],
  'product_categories.description': ['heading', 'paragraph', 'list', 'image'],
  'applications.description': ['heading', 'paragraph', 'list', 'image'],
  'industries.description': ['heading', 'paragraph', 'list', 'image'],
};

export class ContentValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

/** Validate mot truong noi dung theo allowlist cua chinh truong do. */
export function validateContentField(field: string, input: unknown): Content {
  const allowed = FIELD_ALLOWLIST[field];
  if (!allowed) {
    throw new ContentValidationError(
      `Truong khong co trong allowlist: ${field}`,
      'UNKNOWN_FIELD',
      field,
    );
  }
  const json = JSON.stringify(input ?? null);
  if (Buffer.byteLength(json, 'utf8') > LIMITS.jsonBytesPerField) {
    throw new ContentValidationError(
      `Noi dung vuot ${LIMITS.jsonBytesPerField} byte`,
      'CONTENT_BLOCK_LIMIT_EXCEEDED',
      field,
    );
  }
  const parsed = contentInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentValidationError(
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      'CONTENT_BLOCK_INVALID',
      field,
    );
  }
  const bad = parsed.data.blocks.find((b) => !allowed.includes(b.type as BlockType));
  if (bad) {
    throw new ContentValidationError(
      `Block '${bad.type}' khong duoc phep o truong '${field}'`,
      'CONTENT_BLOCK_NOT_ALLOWED_IN_FIELD',
      field,
    );
  }
  return parsed.data;
}

/**
 * Trich moi media_id trong noi dung — dau vao cho content_media_refs.
 *
 * Bo buoc nay thi MediaUsageService khong thay anh dung trong block,
 * va anh se bi xoa roi purge vinh vien (lo hong A4 cua v1.2.1).
 */
export function extractMediaIds(content: Content): string[] {
  const out = new Set<string>();
  for (const b of content.blocks) {
    if (b.type === 'image') out.add(b.media_id);
    else if (b.type === 'gallery') for (const it of b.items) out.add(it.media_id);
  }
  return [...out];
}

/** Trich moi document_id — de kiem tham chieu ton tai truoc khi ghi. */
export function extractDocumentIds(content: Content): string[] {
  return [...new Set(content.blocks.filter((b) => b.type === 'file').map((b) => b.document_id))];
}
