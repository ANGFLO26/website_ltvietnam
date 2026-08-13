import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function FilterBar({ children }: { readonly children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Tìm kiếm…',
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}) {
  return (
    <label className="search-field">
      <span className="sr-only">Tìm kiếm</span>
      <Search size={17} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
