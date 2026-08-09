export type InquiryType =
  | 'quotation'
  | 'product_consultation'
  | 'technical_support'
  | 'maintenance_repair'
  | 'partnership'
  | 'general_contact';

export type InquiryEmailStatus = 'email_pending' | 'email_sent' | 'email_failed';
export type InquiryPreferredContact = 'phone' | 'email' | 'zalo' | 'any';

/** Phan hoi cong khai co y khong tiet lo trang thai email noi bo. */
export interface InquiryAcceptedView {
  readonly request_id: string;
  readonly message: string;
}

/** Ban ghi chi doc cho man hinh quan tri F5; day khong phai mot CRM. */
export interface InquiryView {
  readonly id: string;
  readonly inquiry_type: InquiryType;
  readonly full_name: string;
  readonly company_name: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly message: string;
  readonly product_id: string | null;
  readonly service_id: string | null;
  readonly source_url: string | null;
  readonly locale: 'vi' | 'en';
  readonly preferred_contact_method: InquiryPreferredContact | null;
  readonly province: string | null;
  readonly privacy_consent_at: string;
  readonly email_status: InquiryEmailStatus;
  readonly handled_at: string | null;
  readonly handled_by: string | null;
  readonly created_at: string;
  readonly expires_at: string | null;
}
