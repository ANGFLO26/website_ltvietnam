'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { InquiryType, Locale } from '@ltv/contracts';
import type { PublicCaptchaConfig } from '@/config';
import type { Dictionary } from '@/lib/i18n';
import { InquiryForm, type InquirySource } from './InquiryForm';

export function InquiryModal({
  locale,
  dictionary,
  captcha,
  inquiryType,
  source,
  onClose,
}: {
  locale: Locale;
  dictionary: Dictionary;
  captcha: PublicCaptchaConfig;
  inquiryType: InquiryType;
  source?: InquirySource | undefined;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  function close(): void {
    dialogRef.current?.close();
  }

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== 'Tab') return;
    const focusable = focusableElements(event.currentTarget);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[90vh] w-[min(94vw,46rem)] overflow-y-auto rounded-xl bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/70"
      aria-labelledby="inquiry-modal-title"
      aria-modal="true"
      onClose={onClose}
      onKeyDown={trapFocus}
    >
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold" id="inquiry-modal-title">
            {inquiryType === 'technical_support'
              ? dictionary.inquiry.typeTechnicalSupport
              : dictionary.inquiry.quotationTitle}
          </h2>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 font-semibold"
            type="button"
            onClick={close}
          >
            {dictionary.inquiry.close}
          </button>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <InquiryForm
          locale={locale}
          dictionary={dictionary}
          captcha={captcha}
          inquiryType={inquiryType}
          source={source}
        />
      </div>
    </dialog>
  );
}

function focusableElements(dialog: HTMLDialogElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return [...dialog.querySelectorAll<HTMLElement>(selector)].filter(
    (element) => !element.hasAttribute('hidden'),
  );
}
