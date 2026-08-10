import Link from 'next/link';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export function Breadcrumb({ items, label }: { items: readonly BreadcrumbItem[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {items.map((item, index) => (
          <li key={`${item.label}:${index}`} className="flex items-center gap-2">
            {index === 0 ? null : <span aria-hidden="true">/</span>}
            {item.href === undefined ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
