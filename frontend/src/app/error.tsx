'use client';

import { getDictionary } from '@/lib/i18n';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dictionary = getDictionary('en');
  return (
    <section className="mx-auto max-w-3xl px-6 py-20" aria-labelledby="error-title">
      <h1 id="error-title" className="text-3xl font-bold">
        {dictionary.errors.unexpectedTitle}
      </h1>
      <p className="mt-4 text-slate-700">{dictionary.errors.unexpectedMessage}</p>
      <button
        className="mt-8 rounded bg-[var(--color-primary)] px-4 py-2 font-semibold text-white"
        type="button"
        onClick={reset}
      >
        {dictionary.common.retry}
      </button>
    </section>
  );
}
