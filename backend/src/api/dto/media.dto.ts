import { z } from 'zod';
import { ALLOWED_MEDIA_MIME_TYPES } from '../../services/media/interface.js';

const formText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().trim().min(1).max(max).nullable().optional(),
  );

export const mediaUploadBodySchema = z
  .object({
    title: formText(255),
    alt_text: formText(500),
    caption: formText(2_000),
    credit: formText(500),
  })
  .strict();

export const mediaPatchBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).nullable().optional(),
    alt_text: z.string().trim().min(1).max(500).nullable().optional(),
    caption: z.string().trim().min(1).max(2_000).nullable().optional(),
    credit: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong de cap nhat');

export const mediaListQuerySchema = z
  .object({
    type: z.enum(['image', 'document']).optional(),
    mime_type: z.enum(ALLOWED_MEDIA_MIME_TYPES).optional(),
    q: z.string().trim().min(1).max(255).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
