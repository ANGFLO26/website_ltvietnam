import Link from 'next/link';
import { CONTENT_RESOURCES, type ContentResource } from './config';

export function ContentResourceTabs({ active }: { readonly active: ContentResource }) {
  return (
    <nav className="resource-tabs" aria-label="Nhóm nội dung">
      {CONTENT_RESOURCES.map((item) => (
        <Link
          key={item.resource}
          href={`/content/${item.resource}`}
          aria-current={active === item.resource ? 'page' : undefined}
          className={active === item.resource ? 'is-active' : ''}
        >
          <strong>{item.label}</strong>
          <span>{item.description}</span>
        </Link>
      ))}
    </nav>
  );
}
