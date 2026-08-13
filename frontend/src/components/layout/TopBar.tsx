import type { Locale } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopBar({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <div className="border-b border-white/10 bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 sm:text-sm">
        <p className="font-medium tracking-wide">{dictionary.layout.companyDescriptor}</p>
        <div className="flex items-center gap-4 sm:gap-6">
          <LanguageSwitcher locale={locale} dictionary={dictionary} />
        </div>
      </div>
    </div>
  );
}
