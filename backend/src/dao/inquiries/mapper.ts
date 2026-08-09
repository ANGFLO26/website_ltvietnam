import type { Selectable } from 'kysely';
import type { InquiriesTable, InquiryOutboxTable } from '@ltv/db';
import type {
  EmailStatus,
  Inquiry,
  InquiryType,
  OutboxJob,
  OutboxStatus,
  PreferredContact,
} from './object.js';

function asPayload(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function toInquiry(row: Selectable<InquiriesTable>): Inquiry {
  return {
    id: row.id,
    inquiryType: row.inquiry_type as InquiryType,
    fullName: row.full_name,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    productId: row.product_id,
    serviceId: row.service_id,
    sourceUrl: row.source_url,
    locale: row.locale as 'vi' | 'en',
    preferredContactMethod: row.preferred_contact_method as PreferredContact | null,
    province: row.province,
    privacyConsentAt: row.privacy_consent_at,
    emailStatus: row.email_status as EmailStatus,
    idempotencyKey: row.idempotency_key,
    handledAt: row.handled_at,
    handledBy: row.handled_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * `ip_address`, `user_agent`, `captcha_score` KHONG co trong `Inquiry`.
 *
 * Chung la du lieu chong lam dung, khong phai noi dung yeu cau. Bo ra khoi
 * thuc the nghiep vu de chung khong the lot vao response API mot cach vo y —
 * cung cach `passwordHash` bi tach khoi `User`.
 */

export function toOutboxJob(row: Selectable<InquiryOutboxTable>): OutboxJob {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    notificationType: row.notification_type as OutboxJob['notificationType'],
    payload: asPayload(row.payload),
    channel: row.channel,
    recipient: row.recipient,
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    nextAttemptAt: row.next_attempt_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    lastError: row.last_error,
    sentAt: row.sent_at,
  };
}
