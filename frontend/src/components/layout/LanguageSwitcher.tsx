import type { HreflangAlternateView, Locale } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';

export function LanguageSwitcher({
  locale,
  alternates = [],
  fallbacks = {},
  dictionary,
}: {
  locale: Locale;
  alternates?: readonly HreflangAlternateView[];
  fallbacks?: Readonly<Partial<Record<Locale, string>>>;
  dictionary: Dictionary;
}) {
  const labels: Readonly<Record<Locale, string>> = {
    en: dictionary.layout.english,
    vi: dictionary.layout.vietnamese,
  };
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label={dictionary.layout.language}>
      {(['en', 'vi'] as const).map((candidate) => {
        if (candidate === locale) {
          return (
            <span key={candidate} className="font-bold" aria-current="page">
              {labels[candidate]}
            </span>
          );
        }
        const alternate = alternates.find((item) => item.locale === candidate);
        const href = alternate?.url ?? fallbacks[candidate];
        return href === undefined ? (
          <span
            key={candidate}
            className="cursor-not-allowed text-slate-400"
            aria-disabled="true"
            title={dictionary.layout.unavailableLanguage}
          >
            {labels[candidate]}
          </span>
        ) : (
          <a key={candidate} href={href} hrefLang={candidate}>
            {labels[candidate]}
          </a>
        );
      })}
    </nav>
  );
}
