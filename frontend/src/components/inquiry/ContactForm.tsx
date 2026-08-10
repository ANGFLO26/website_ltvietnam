import type { Locale } from '@ltv/contracts';
import type { PublicCaptchaConfig } from '@/config';
import type { Dictionary } from '@/lib/i18n';
import { InquiryForm, type InquirySource } from './InquiryForm';

export function ContactForm({
  locale,
  dictionary,
  captcha,
  source,
}: {
  locale: Locale;
  dictionary: Dictionary;
  captcha: PublicCaptchaConfig;
  source?: InquirySource | undefined;
}) {
  return (
    <InquiryForm
      locale={locale}
      dictionary={dictionary}
      captcha={captcha}
      inquiryType={
        source?.kind === 'service'
          ? 'technical_support'
          : source?.kind === 'product'
            ? 'quotation'
            : 'general_contact'
      }
      allowTypeSelection={source === undefined}
      source={source}
    />
  );
}
