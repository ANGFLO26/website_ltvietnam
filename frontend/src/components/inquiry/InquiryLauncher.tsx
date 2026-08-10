'use client';

import { useRef, useState } from 'react';
import type { InquiryType, Locale } from '@ltv/contracts';
import type { PublicCaptchaConfig } from '@/config';
import type { Dictionary } from '@/lib/i18n';
import { InquiryModal } from './InquiryModal';
import type { InquirySource } from './InquiryForm';

export function InquiryLauncher({
  locale,
  dictionary,
  captcha,
  label,
  className,
  ariaLabel,
  inquiryType = 'quotation',
  source,
}: {
  locale: Locale;
  dictionary: Dictionary;
  captcha: PublicCaptchaConfig;
  label: string;
  className?: string | undefined;
  ariaLabel?: string | undefined;
  inquiryType?: InquiryType;
  source?: InquirySource | undefined;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(): void {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={className}
        type="button"
        aria-label={ariaLabel}
        data-inquiry-trigger
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <InquiryModal
          locale={locale}
          dictionary={dictionary}
          captcha={captcha}
          inquiryType={inquiryType}
          source={source}
          onClose={close}
        />
      ) : null}
    </>
  );
}
