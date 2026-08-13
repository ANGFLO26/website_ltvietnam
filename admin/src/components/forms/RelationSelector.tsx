'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface RelationOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export function RelationSelector({
  label,
  options,
  selected,
  onChange,
  primaryId,
  onPrimaryChange,
  max,
}: {
  readonly label: string;
  readonly options: readonly RelationOption[];
  readonly selected: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
  readonly primaryId?: string | null;
  readonly onPrimaryChange?: (id: string | null) => void;
  readonly max?: number;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return needle
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('vi').includes(needle),
        )
      : options;
  }, [options, search]);
  function toggle(id: string): void {
    if (selected.includes(id)) {
      const next = selected.filter((item) => item !== id);
      onChange(next);
      if (primaryId === id) onPrimaryChange?.(null);
      return;
    }
    if (max !== undefined && selected.length >= max) return;
    onChange([...selected, id]);
  }
  return (
    <fieldset className="relation-selector">
      <legend>{label}</legend>
      <label className="relation-selector__search">
        <Search size={16} />
        <span className="sr-only">Tìm {label.toLowerCase()}</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm trong danh sách…"
        />
      </label>
      <div className="relation-selector__options">
        {visible.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <div key={option.id} className={`relation-option${checked ? ' is-selected' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && max !== undefined && selected.length >= max}
                  onChange={() => toggle(option.id)}
                />
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
              </label>
              {checked && onPrimaryChange ? (
                <label className="relation-option__primary">
                  <input
                    type="radio"
                    name={`${label}-primary`}
                    checked={primaryId === option.id}
                    onChange={() => onPrimaryChange(option.id)}
                  />{' '}
                  Chính
                </label>
              ) : null}
            </div>
          );
        })}
        {visible.length === 0 ? <p>Không có lựa chọn phù hợp.</p> : null}
      </div>
    </fieldset>
  );
}
