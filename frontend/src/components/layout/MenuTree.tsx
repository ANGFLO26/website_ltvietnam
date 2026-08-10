import Link from 'next/link';
import type { MenuItemView } from '@ltv/contracts';

export function MenuItemLink({ item, className }: { item: MenuItemView; className?: string }) {
  if (item.url === null) return <span className={className}>{item.label}</span>;
  if (item.open_new_tab || isExternal(item.url)) {
    return (
      <a
        className={className}
        href={item.url}
        {...(item.open_new_tab ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link className={className} href={item.url}>
      {item.label}
    </Link>
  );
}

export function MenuTree({
  items,
  className,
}: {
  items: readonly MenuItemView[];
  className?: string;
}) {
  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={`${item.label}:${item.url ?? 'heading'}:${index}`}>
          <MenuItemLink item={item} />
          {item.children.length === 0 ? null : (
            <MenuTree
              className="ml-4 mt-2 space-y-2 border-l border-slate-200 pl-4"
              items={item.children}
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
