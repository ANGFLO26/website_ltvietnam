'use client';

import Link from 'next/link';
import type { Locale } from '@ltv/contracts';
import { useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

const CONSENT_KEY = 'ltv-cookie-consent:v1';

type Consent = 'accepted' | 'declined';

export function CookieBanner({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = window.localStorage.getItem(CONSENT_KEY);
      setVisible(consent !== 'accepted' && consent !== 'declined');
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(consent: Consent) {
    try {
      window.localStorage.setItem(CONSENT_KEY, consent);
    } catch {
      // The preference still applies for this page view when storage is unavailable.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-labelledby="cookie-banner-title"
      aria-modal="false"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white p-5 shadow-2xl sm:p-6"
      role="dialog"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="cookie-banner-title" className="text-lg font-bold text-slate-950">
            {dictionary.cookie.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            {dictionary.cookie.message}{' '}
            <Link
              className="font-semibold text-blue-800"
              href={routePath('cookie-policy', { locale })}
            >
              {dictionary.cookie.policyLink}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold text-slate-800"
            onClick={() => choose('declined')}
            type="button"
          >
            {dictionary.cookie.decline}
          </button>
          <button
            className="min-h-11 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900"
            onClick={() => choose('accepted')}
            type="button"
          >
            {dictionary.cookie.accept}
          </button>
        </div>
      </div>
    </aside>
  );
}
