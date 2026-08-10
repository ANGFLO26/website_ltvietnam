import type {
  InquiryAcceptedView,
  InquiryEmailStatus,
  InquiryPreferredContact,
  InquiryType,
  InquiryView,
} from '@ltv/contracts';
import type { Page } from '../../shared/http/envelope.js';

export const INQUIRY_SERVICE = Symbol('INQUIRY_SERVICE');

export interface SubmitInquiryInput {
  readonly inquiry_type: InquiryType;
  readonly full_name: string;
  readonly company_name?: string | null | undefined;
  readonly phone?: string | null | undefined;
  readonly email?: string | null | undefined;
  readonly message: string;
  readonly product_id?: string | null | undefined;
  readonly product_slug?: string | null | undefined;
  readonly service_id?: string | null | undefined;
  readonly service_slug?: string | null | undefined;
  readonly source_url?: string | null | undefined;
  readonly preferred_contact_method?: InquiryPreferredContact | null | undefined;
  readonly province?: string | null | undefined;
  readonly privacy_consent: true;
  readonly locale: 'vi' | 'en';
  readonly captcha_token: string;
  readonly request_id?: string | undefined;
  readonly idempotencyKey: string;
  readonly ipAddress?: string | null | undefined;
  readonly userAgent?: string | null | undefined;
}

export interface InquiryService {
  submit(input: SubmitInquiryInput): Promise<InquiryAcceptedView>;
  list(
    filter: {
      readonly status?: InquiryEmailStatus;
      readonly handled?: boolean;
      readonly type?: InquiryType;
    },
    pagination: { readonly page: number; readonly pageSize: number },
  ): Promise<Page<InquiryView>>;
  findById(id: string): Promise<InquiryView>;
  markHandled(id: string, byUserId: string): Promise<InquiryView>;
}
