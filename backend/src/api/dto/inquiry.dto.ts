import { z } from 'zod';

const inquiryType = z.enum([
  'quotation',
  'product_consultation',
  'technical_support',
  'maintenance_repair',
  'partnership',
  'general_contact',
]);
const emailStatus = z.enum(['email_pending', 'email_sent', 'email_failed']);
const preferredContact = z.enum(['phone', 'email', 'zalo', 'any']);
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const inquiryBodySchema = z
  .object({
    inquiry_type: inquiryType,
    full_name: z.string().trim().min(1).max(255),
    company_name: optionalText(255),
    phone: optionalText(50),
    email: z.string().trim().email().max(320).nullable().optional(),
    message: z.string().trim().min(1).max(10_000),
    product_id: z.string().uuid().nullable().optional(),
    service_id: z.string().uuid().nullable().optional(),
    source_url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => value.startsWith('/') && !value.startsWith('//'),
        'source_url phai la duong dan noi bo bat dau bang /',
      )
      .nullable()
      .optional(),
    preferred_contact_method: preferredContact.nullable().optional(),
    province: optionalText(120),
    privacy_consent: z.literal(true),
    locale: z.enum(['vi', 'en']),
    captcha_token: z.string().min(1).max(4096),
    request_id: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.phone && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Can it nhat phone hoac email',
      });
    }
  });

const boolQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const inquiryListQuerySchema = z
  .object({
    status: emailStatus.optional(),
    handled: boolQuery.optional(),
    type: inquiryType.optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const handledBodySchema = z.object({ handled: z.literal(true) }).strict();

export type InquiryBodyDto = z.infer<typeof inquiryBodySchema>;
export type InquiryListQueryDto = z.infer<typeof inquiryListQuerySchema>;
