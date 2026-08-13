'use client';

import type { AdminLocale, AdminTranslationStatus } from '@ltv/contracts';

export function LanguageTabs({
  active,
  onChange,
  states,
  dirty,
}: {
  readonly active: AdminLocale;
  readonly onChange: (locale: AdminLocale) => void;
  readonly states: Readonly<Partial<Record<AdminLocale, AdminTranslationStatus>>>;
  readonly dirty?: Readonly<Partial<Record<AdminLocale, boolean>>>;
}) {
  return (
    <div className="language-tabs" role="tablist" aria-label="Ngôn ngữ nội dung">
      {(['vi', 'en'] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          role="tab"
          aria-selected={active === locale}
          className={active === locale ? 'is-active' : ''}
          onClick={() => onChange(locale)}
        >
          <strong>{locale.toUpperCase()}</strong>
          <span>{label(states[locale])}</span>
          {dirty?.[locale] ? <i aria-label="Có thay đổi chưa lưu" /> : null}
        </button>
      ))}
    </div>
  );
}

function label(status?: AdminTranslationStatus): string {
  if (!status) return 'Chưa tạo';
  if (status === 'published') return 'Đã xuất bản';
  if (status === 'hidden') return 'Đã ẩn';
  return 'Bản nháp';
}
