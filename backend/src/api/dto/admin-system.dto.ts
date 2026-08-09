import { z } from 'zod';
import { queryBooleanSchema } from './parse.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const path = text(2_048)
  .startsWith('/')
  .refine((value) => !value.includes('\0'), 'Duong dan khong hop le');

export const settingGroupPatchSchema = z
  .record(z.string().trim().min(1).max(255), z.union([z.string().max(256 * 1024), z.null()]))
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot cau hinh');

export const redirectListQuerySchema = z
  .object({
    status: z.enum(['active', 'disabled']).optional(),
    q: text(255).optional(),
    never_hit: queryBooleanSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const redirectCreateSchema = z
  .object({
    source_path: path,
    target_path: path,
    redirect_type: z.union([z.literal(301), z.literal(302)]).optional(),
  })
  .strict();

export const redirectPatchSchema = z
  .object({
    target_path: path.optional(),
    redirect_type: z.union([z.literal(301), z.literal(302)]).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Can it nhat mot truong de cap nhat');

export const userListQuerySchema = z
  .object({
    status: z.enum(['active', 'disabled', 'locked']).optional(),
    q: text(255).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const userCreateSchema = z
  .object({
    name: text(255),
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(200),
  })
  .strict();

export const userPatchSchema = z
  .object({
    status: z.enum(['active', 'disabled', 'locked']),
  })
  .strict();
