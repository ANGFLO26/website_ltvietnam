'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { InquiryPreferredContact, InquiryType, Locale } from '@ltv/contracts';
import type { PublicCaptchaConfig } from '@/config';
import { submitInquiry } from '@/lib/api/inquiries';
import { ApiError } from '@/lib/api/errors';
import { createInquiryRequestId } from '@/lib/idempotency';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { CaptchaChallenge } from './CaptchaChallenge';

export interface InquirySource {
  readonly kind: 'product' | 'service';
  readonly slug: string;
  readonly label: string;
  readonly sourceUrl: string;
}

type FieldName =
  'full_name' | 'company_name' | 'contact' | 'email' | 'message' | 'privacy' | 'captcha';
type FieldErrors = Partial<Record<FieldName, string>>;

export function InquiryForm({
  locale,
  dictionary,
  captcha,
  inquiryType = 'quotation',
  allowTypeSelection = false,
  source,
}: {
  locale: Locale;
  dictionary: Dictionary;
  captcha: PublicCaptchaConfig;
  inquiryType?: InquiryType;
  allowTypeSelection?: boolean;
  source?: InquirySource | undefined;
}) {
  const router = useRouter();
  const [requestId] = useState(createInquiryRequestId);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validate(data, dictionary);
    if (captchaToken === null) nextErrors.captcha = dictionary.inquiry.captchaError;
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0 || captchaToken === null) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const selectedType = allowTypeSelection
        ? (text(data, 'inquiry_type') as InquiryType)
        : inquiryType;
      const preferred = text(data, 'preferred_contact_method') as InquiryPreferredContact;
      await submitInquiry({
        inquiry_type: selectedType,
        full_name: text(data, 'full_name'),
        company_name: text(data, 'company_name'),
        phone: nullableText(data, 'phone'),
        email: nullableText(data, 'email'),
        message: text(data, 'message'),
        ...(source?.kind === 'product' && { product_slug: source.slug }),
        ...(source?.kind === 'service' && { service_slug: source.slug }),
        source_url: source?.sourceUrl ?? currentInternalPath(),
        preferred_contact_method: preferred,
        province: nullableText(data, 'province'),
        privacy_consent: true,
        locale,
        captcha_token: captchaToken,
        request_id: requestId,
      });
      setAccepted(true);
      router.push(routePath('request-success', { locale }));
    } catch (error) {
      setSubmitError(
        error instanceof ApiError && error.code === 'CAPTCHA_INVALID'
          ? dictionary.inquiry.captchaError
          : dictionary.inquiry.submitError,
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950';
  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {source === undefined ? null : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-950">
            {source.kind === 'product'
              ? dictionary.inquiry.sourceProduct
              : dictionary.inquiry.sourceService}
          </p>
          <p className="mt-1 text-blue-900">{source.label}</p>
        </div>
      )}

      {allowTypeSelection ? (
        <label className="block font-medium">
          {dictionary.inquiry.inquiryType}
          <select className={fieldClass} defaultValue={inquiryType} name="inquiry_type">
            <option value="general_contact">{dictionary.inquiry.typeGeneralContact}</option>
            <option value="quotation">{dictionary.inquiry.typeQuotation}</option>
            <option value="product_consultation">
              {dictionary.inquiry.typeProductConsultation}
            </option>
            <option value="technical_support">{dictionary.inquiry.typeTechnicalSupport}</option>
            <option value="maintenance_repair">{dictionary.inquiry.typeMaintenanceRepair}</option>
            <option value="partnership">{dictionary.inquiry.typePartnership}</option>
          </select>
        </label>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="full_name"
          label={dictionary.inquiry.fullName}
          error={errors.full_name}
          required
        />
        <TextField
          name="company_name"
          label={dictionary.inquiry.companyName}
          error={errors.company_name}
          required
        />
        <TextField
          name="phone"
          label={dictionary.inquiry.phone}
          error={errors.contact}
          type="tel"
        />
        <TextField
          name="email"
          label={dictionary.inquiry.email}
          error={errors.email ?? errors.contact}
          type="email"
        />
      </div>

      <label className="block font-medium">
        {dictionary.inquiry.message} <RequiredMark />
        <textarea
          className={`${fieldClass} min-h-36 resize-y`}
          name="message"
          aria-invalid={errors.message !== undefined}
          aria-describedby={errors.message === undefined ? undefined : 'message-error'}
        />
        <FieldError id="message-error" message={errors.message} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="province"
          label={`${dictionary.inquiry.province} (${dictionary.inquiry.optional})`}
        />
        <label className="block font-medium">
          {dictionary.inquiry.preferredContact}
          <select className={fieldClass} defaultValue="any" name="preferred_contact_method">
            <option value="any">{dictionary.inquiry.contactAny}</option>
            <option value="phone">{dictionary.inquiry.contactPhone}</option>
            <option value="email">{dictionary.inquiry.contactEmail}</option>
            <option value="zalo">{dictionary.inquiry.contactZalo}</option>
          </select>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-slate-100 p-4">
        <input
          className="mt-1 h-4 w-4"
          name="privacy_consent"
          type="checkbox"
          aria-invalid={errors.privacy !== undefined}
          aria-describedby={errors.privacy === undefined ? undefined : 'privacy-error'}
        />
        <span>
          {dictionary.inquiry.privacyConsent} <RequiredMark />
          <FieldError id="privacy-error" message={errors.privacy} />
        </span>
      </label>

      <CaptchaChallenge config={captcha} dictionary={dictionary} onToken={setCaptchaToken} />
      <FieldError id="captcha-error" message={errors.captcha} />

      {Object.keys(errors).length === 0 ? null : (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
          {dictionary.inquiry.validationSummary}
        </p>
      )}
      {submitError === null ? null : (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
          {submitError}
        </p>
      )}
      {accepted ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-900"
          role="status"
        >
          {dictionary.inquiry.accepted}
        </p>
      ) : null}

      <button
        className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        type="submit"
        disabled={submitting || captchaToken === null}
      >
        {submitting ? dictionary.inquiry.submitting : dictionary.inquiry.submit}
      </button>
    </form>
  );
}

function TextField({
  name,
  label,
  type = 'text',
  error,
  required = false,
}: {
  name: string;
  label: string;
  type?: 'text' | 'tel' | 'email';
  error?: string | undefined;
  required?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block font-medium">
      {label} {required ? <RequiredMark /> : null}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
        name={name}
        type={type}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function RequiredMark() {
  return <span aria-hidden="true">*</span>;
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  return message === undefined ? null : (
    <span className="mt-1 block text-sm font-medium text-red-700" id={id}>
      {message}
    </span>
  );
}

function validate(data: FormData, dictionary: Dictionary): FieldErrors {
  const errors: FieldErrors = {};
  if (text(data, 'full_name').length === 0) errors.full_name = dictionary.inquiry.requiredError;
  if (text(data, 'company_name').length === 0)
    errors.company_name = dictionary.inquiry.requiredError;
  const phone = text(data, 'phone');
  const email = text(data, 'email');
  if (phone.length === 0 && email.length === 0)
    errors.contact = dictionary.inquiry.contactMethodError;
  if (email.length > 0 && !/^\S+@\S+\.\S+$/.test(email))
    errors.email = dictionary.inquiry.emailError;
  if (text(data, 'message').length === 0) errors.message = dictionary.inquiry.requiredError;
  if (data.get('privacy_consent') !== 'on') errors.privacy = dictionary.inquiry.privacyError;
  return errors;
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(data: FormData, name: string): string | null {
  const value = text(data, name);
  return value.length === 0 ? null : value;
}

function currentInternalPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}
