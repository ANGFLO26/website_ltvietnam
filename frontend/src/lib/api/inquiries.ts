import type {
  InquiryAcceptedView,
  InquiryPreferredContact,
  InquiryType,
  Locale,
} from '@ltv/contracts';
import { apiPost, type BrowserRequestOptions } from './client.browser';

export interface InquiryInput {
  readonly inquiry_type: InquiryType;
  readonly full_name: string;
  readonly company_name?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly message: string;
  readonly product_id?: string | null;
  readonly product_slug?: string | null;
  readonly service_id?: string | null;
  readonly service_slug?: string | null;
  readonly source_url?: string | null;
  readonly preferred_contact_method?: InquiryPreferredContact | null;
  readonly province?: string | null;
  readonly privacy_consent: true;
  readonly locale: Locale;
  readonly captcha_token: string;
  readonly request_id: string;
}

export function submitInquiry(
  input: InquiryInput,
  options: Omit<BrowserRequestOptions, 'headers'> = {},
): Promise<InquiryAcceptedView> {
  return apiPost<InquiryInput, InquiryAcceptedView>('/inquiries', input, {
    ...options,
    headers: { 'idempotency-key': input.request_id },
  });
}
