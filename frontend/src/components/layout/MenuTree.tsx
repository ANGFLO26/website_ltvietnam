import Link from 'next/link';
import type { MenuItemView } from '@ltv/contracts';
import { translateDictionaryKey, type Dictionary } from '@/lib/i18n';

export function menuItemLabel(item: MenuItemView, dictionary?: Dictionary): string {
  return dictionary === undefined
    ? item.label
    : translateDictionaryKey(dictionary, item.label_i18n_key, item.label);
}

export function MenuItemLink({
  item,
  className,
  dictionary,
}: {
  item: MenuItemView;
  className?: string;
  dictionary?: Dictionary | undefined;
}) {
  const label = menuItemLabel(item, dictionary);
  if (item.url === null) return <span className={className}>{label}</span>;
  if (item.open_new_tab || isExternal(item.url)) {
    return (
      <a
        className={className}
        href={item.url}
        {...(item.open_new_tab ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {label}
      </a>
    );
  }
  return (
    <Link className={className} href={item.url}>
      {label}
    </Link>
  );
}

export function MenuTree({
  items,
  className,
  dictionary,
}: {
  items: readonly MenuItemView[];
  className?: string;
  dictionary?: Dictionary | undefined;
}) {
  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={`${item.label}:${item.url ?? 'heading'}:${index}`}>
          <MenuItemLink item={item} dictionary={dictionary} />
          {item.children.length === 0 ? null : (
            <MenuTree
              className="ml-4 mt-2 space-y-2 border-l border-slate-200 pl-4"
              items={item.children}
              dictionary={dictionary}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
