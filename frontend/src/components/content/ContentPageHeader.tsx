import type { HreflangAlternateView, Locale } from '@ltv/contracts';
import type { BreadcrumbItem } from '@/components/layout/Breadcrumb';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import type { Dictionary } from '@/lib/i18n';

export function ContentPageHeader({
  title,
  description,
  breadcrumbs,
  locale,
  alternates = [],
  fallbacks = {},
  dictionary,
}: {
  title: string;
  description?: string | null;
  breadcrumbs: readonly BreadcrumbItem[];
  locale: Locale;
  alternates?: readonly HreflangAlternateView[];
  fallbacks?: Readonly<Partial<Record<Locale, string>>>;
  dictionary: Dictionary;
}) {
  return (
    <header className="border-b border-slate-200 bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb items={breadcrumbs} label={dictionary.content.breadcrumb} />
          <LanguageSwitcher
            locale={locale}
            alternates={alternates}
            fallbacks={fallbacks}
            dictionary={dictionary}
          />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          {title}
        </h1>
        {description === undefined || description === null ? null : (
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">{description}</p>
        )}
      </div>
    </header>
  );
}
