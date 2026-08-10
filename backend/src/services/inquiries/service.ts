import { createHash } from 'node:crypto';
import type { InquiryAcceptedView, InquiryView } from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { Inquiry } from '../../dao/inquiries/object.js';
import { DomainError, NotFoundError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import type { CaptchaVerifier } from './captcha.js';
import type { InquiryService, SubmitInquiryInput } from './interface.js';

type InquiryDaos = DaoScope<'inquiries' | 'products' | 'services'>;

export class InquiryServiceImpl implements InquiryService {
  constructor(
    private readonly daos: InquiryDaos,
    private readonly captcha: CaptchaVerifier,
    private readonly recipient: string,
  ) {}

  async submit(input: SubmitInquiryInput): Promise<InquiryAcceptedView> {
    // Replay khong tieu them mot CAPTCHA token (token provider chi dung mot lan).
    const existing = await this.daos.inquiries.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return accepted(existing.id);

    const captcha = await this.captcha.verify(input.captcha_token, input.ipAddress);
    if (!captcha.success) {
      throw new DomainError('CAPTCHA_INVALID', 'CAPTCHA khong hop le hoac da het han');
    }
    const references = await this.resolveReferences(input);

    const fingerprint = fingerprintOf(input, references);
    const result = await this.daos.transaction(async (tx) => {
      const created = await tx.inquiries.createIdempotent({
        inquiryType: input.inquiry_type,
        fullName: input.full_name,
        ...(input.company_name !== undefined && { companyName: input.company_name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email?.toLowerCase() ?? null }),
        message: input.message,
        ...(references.productId !== null && { productId: references.productId }),
        ...(references.serviceId !== null && { serviceId: references.serviceId }),
        ...(input.source_url !== undefined && { sourceUrl: input.source_url }),
        locale: input.locale,
        ...(input.preferred_contact_method !== undefined && {
          preferredContactMethod: input.preferred_contact_method,
        }),
        ...(input.province !== undefined && { province: input.province }),
        privacyConsentAt: new Date(),
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: fingerprint,
        requestFingerprintVersion: 'v1',
        ...(input.ipAddress !== undefined && { ipAddress: input.ipAddress }),
        ...(input.userAgent !== undefined && {
          userAgent: input.userAgent?.slice(0, 2048) ?? null,
        }),
        ...(captcha.score !== undefined && { captchaScore: captcha.score }),
      });
      await tx.inquiries.enqueueEmail({ inquiryId: created.inquiry.id, recipient: this.recipient });
      return created;
    });
    return accepted(result.inquiry.id);
  }

  async list(
    filter: Parameters<InquiryService['list']>[0],
    pagination: { readonly page: number; readonly pageSize: number },
  ): Promise<Page<InquiryView>> {
    const result = await this.daos.inquiries.list(
      {
        ...(filter.type !== undefined && { inquiryType: filter.type }),
        ...(filter.status !== undefined && { emailStatus: filter.status }),
        ...(filter.handled !== undefined && { handled: filter.handled }),
      },
      pagination,
    );
    return page(result.data.map(toView), {
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      totalItems: result.meta.totalItems,
    });
  }

  async findById(id: string): Promise<InquiryView> {
    const inquiry = await this.daos.inquiries.findById(id);
    if (!inquiry) throw new NotFoundError('INQUIRY_NOT_FOUND', 'Khong tim thay yeu cau');
    return toView(inquiry);
  }

  async markHandled(id: string, byUserId: string): Promise<InquiryView> {
    if (!(await this.daos.inquiries.findById(id))) {
      throw new NotFoundError('INQUIRY_NOT_FOUND', 'Khong tim thay yeu cau');
    }
    await this.daos.inquiries.markHandled(id, new Date(), byUserId);
    return this.findById(id);
  }

  private async resolveReferences(input: SubmitInquiryInput): Promise<ResolvedReferences> {
    let productId = input.product_id ?? null;
    if (input.product_slug) {
      const product = await this.daos.products.findBySlug(input.product_slug);
      if (!product || product.status !== 'published') {
        throw new DomainError('INQUIRY_PRODUCT_INVALID', 'San pham duoc chon khong ton tai');
      }
      productId = product.id;
    } else if (productId) {
      const product = await this.daos.products.findById(productId);
      if (!product || product.status !== 'published') {
        throw new DomainError('INQUIRY_PRODUCT_INVALID', 'San pham duoc chon khong ton tai');
      }
    }

    let serviceId = input.service_id ?? null;
    if (input.service_slug) {
      const service = await this.daos.services.findBySlug(input.locale, input.service_slug);
      if (
        !service ||
        service.service.status !== 'published' ||
        service.translation.status !== 'published'
      ) {
        throw new DomainError('INQUIRY_SERVICE_INVALID', 'Dich vu duoc chon khong ton tai');
      }
      serviceId = service.service.id;
    } else if (serviceId) {
      const service = await this.daos.services.findById(serviceId);
      if (!service || service.status !== 'published') {
        throw new DomainError('INQUIRY_SERVICE_INVALID', 'Dich vu duoc chon khong ton tai');
      }
    }

    return { productId, serviceId };
  }
}

interface ResolvedReferences {
  readonly productId: string | null;
  readonly serviceId: string | null;
}

function accepted(id: string): InquiryAcceptedView {
  return { request_id: id, message: 'Yêu cầu đã được tiếp nhận.' };
}

function fingerprintOf(input: SubmitInquiryInput, references: ResolvedReferences): string {
  const canonical = {
    inquiry_type: input.inquiry_type,
    full_name: input.full_name,
    company_name: input.company_name ?? null,
    phone: input.phone ?? null,
    email: input.email?.toLowerCase() ?? null,
    message: input.message,
    product_id: references.productId,
    service_id: references.serviceId,
    source_url: input.source_url ?? null,
    preferred_contact_method: input.preferred_contact_method ?? null,
    province: input.province ?? null,
    locale: input.locale,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function toView(row: Inquiry): InquiryView {
  return {
    id: row.id,
    inquiry_type: row.inquiryType,
    full_name: row.fullName,
    company_name: row.companyName,
    phone: row.phone,
    email: row.email,
    message: row.message,
    product_id: row.productId,
    service_id: row.serviceId,
    source_url: row.sourceUrl,
    locale: row.locale,
    preferred_contact_method: row.preferredContactMethod,
    province: row.province,
    privacy_consent_at: row.privacyConsentAt.toISOString(),
    email_status: row.emailStatus,
    handled_at: row.handledAt?.toISOString() ?? null,
    handled_by: row.handledBy,
    created_at: row.createdAt.toISOString(),
    expires_at: row.expiresAt?.toISOString() ?? null,
  };
}
