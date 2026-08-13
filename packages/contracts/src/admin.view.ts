import { z } from 'zod';
import type { Locale } from './routes.js';

export interface AdminSessionView {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

export interface AdminUserView extends AdminSessionView {
  readonly last_login_at: string | null;
}

export const adminLoginRequestSchema = z
  .object({
    email: z.string().trim().email('Email không hợp lệ').max(320),
    password: z.string().min(1, 'Hãy nhập mật khẩu').max(200),
  })
  .strict();

export const adminChangePasswordRequestSchema = z
  .object({
    current_password: z.string().min(1, 'Hãy nhập mật khẩu hiện tại').max(200),
    new_password: z.string().min(1, 'Hãy nhập mật khẩu mới').max(200),
  })
  .strict();

export const adminForgotPasswordRequestSchema = z
  .object({ email: z.string().trim().email('Email không hợp lệ').max(320) })
  .strict();

export const adminResetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, 'Thiếu token đặt lại mật khẩu').max(4096),
    new_password: z.string().min(1, 'Hãy nhập mật khẩu mới').max(200),
  })
  .strict();

export const adminBootstrapRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Hãy nhập họ tên').max(150),
    email: z.string().trim().email('Email không hợp lệ').max(320),
    password: z.string().min(1, 'Hãy nhập mật khẩu').max(200),
  })
  .strict();

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminChangePasswordRequest = z.infer<typeof adminChangePasswordRequestSchema>;
export type AdminForgotPasswordRequest = z.infer<typeof adminForgotPasswordRequestSchema>;
export type AdminResetPasswordRequest = z.infer<typeof adminResetPasswordRequestSchema>;
export type AdminBootstrapRequest = z.infer<typeof adminBootstrapRequestSchema>;

/** Cac trang thai dung chung cho entity co vong doi nhap/xuat ban. */
export type AdminEntityStatus = 'draft' | 'published' | 'hidden' | 'archived';

export type AdminContentKind = 'service' | 'project' | 'post' | 'page';
export type AdminTaxonomyKind =
  'brand' | 'product_category' | 'standard' | 'application' | 'industry';

export interface AdminTranslationSummaryView {
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly published_at: string | null;
}

/** Read-model gon cho DataTable noi dung; khong buoc frontend goi detail tung dong. */
export interface AdminContentListItemView {
  readonly id: string;
  readonly kind: AdminContentKind;
  readonly title: string | null;
  readonly slug: string | null;
  readonly status: AdminEntityStatus;
  readonly translations: readonly AdminTranslationSummaryView[];
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

export interface AdminRelationLabelView {
  readonly id: string;
  readonly label: string;
  readonly slug: string | null;
}

/** Read-model danh sach san pham voi cac nhan ma DataTable can hien ngay. */
export interface AdminProductListItemView {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly model: string | null;
  readonly internal_code: string | null;
  readonly sku: string | null;
  readonly status: AdminEntityStatus;
  readonly brand: AdminRelationLabelView;
  readonly primary_category: AdminRelationLabelView | null;
  readonly thumbnail_id: string | null;
  readonly thumbnail_url: string | null;
  readonly thumbnail_alt: string | null;
  readonly is_featured: boolean;
  readonly discontinued_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

/** Read-model dong nhat cho nam bang taxonomy trong admin. */
export interface AdminTaxonomyListItemView {
  readonly id: string;
  readonly kind: AdminTaxonomyKind;
  readonly label: string;
  readonly slug: string;
  readonly status: AdminEntityStatus;
  readonly parent: AdminRelationLabelView | null;
  readonly thumbnail_id: string | null;
  readonly thumbnail_url: string | null;
  readonly is_featured: boolean;
  readonly related_product_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

export type AdminPublishEntity =
  'product' | 'brand' | 'document' | 'service' | 'project' | 'post' | 'page';

const translatedPublishEntities = new Set<AdminPublishEntity>([
  'service',
  'project',
  'post',
  'page',
]);

/** Request dung chung cho nut "Kiem tra truoc khi xuat ban". */
export const adminPublishCheckRequestSchema = z
  .object({
    entity: z.enum(['product', 'brand', 'document', 'service', 'project', 'post', 'page']),
    id: z.string().uuid(),
    locale: z.enum(['vi', 'en']).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const translated = translatedPublishEntities.has(value.entity);
    if (translated && value.locale === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locale'],
        message: 'locale bat buoc cho noi dung co ban dich',
      });
    }
    if (!translated && value.locale !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locale'],
        message: 'locale khong duoc dung cho entity mot ngon ngu',
      });
    }
  });

export type AdminPublishCheckRequest = z.infer<typeof adminPublishCheckRequestSchema>;

export interface AdminPublishBlockerView {
  readonly field: string;
  readonly message: string;
}

export type AdminPublishCheckView =
  | { readonly ok: true; readonly blockers: readonly [] }
  | { readonly ok: false; readonly blockers: readonly AdminPublishBlockerView[] };

export interface AdminDashboardContentView {
  readonly products: number;
  readonly services: number;
  readonly projects: number;
  readonly posts: number;
  readonly pages: number;
}

export interface AdminDashboardInquiryView {
  readonly unhandled: number;
  readonly last_30_days: number;
  readonly email_pending: number;
  readonly email_failed: number;
}

/** Dong gan day co y khong chua ten, email, so dien thoai hoac noi dung yeu cau. */
export interface AdminDashboardRecentInquiryView {
  readonly id: string;
  readonly inquiry_type:
    | 'quotation'
    | 'product_consultation'
    | 'technical_support'
    | 'maintenance_repair'
    | 'partnership'
    | 'general_contact';
  readonly email_status: 'email_pending' | 'email_sent' | 'email_failed';
  readonly handled: boolean;
  readonly created_at: string;
}

/** Read-model tong quan van hanh; khong duoc dua secret/PII vao contract nay. */
export interface AdminDashboardView {
  readonly generated_at: string;
  readonly content: AdminDashboardContentView;
  readonly inquiries: AdminDashboardInquiryView;
  readonly recent_inquiries: readonly AdminDashboardRecentInquiryView[];
}
