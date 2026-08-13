import type { Locale } from '@ltv/contracts';
import { en } from './en';
import { vi } from './vi';

export type Dictionary = typeof vi;

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'vi' ? vi : en;
}

/** Tra khoa cham (`nav.products`); du lieu DB van la fallback an toan. */
export function translateDictionaryKey(
  dictionary: Dictionary,
  key: string | null,
  fallback: string,
): string {
  if (key === null) return fallback;
  let current: unknown = dictionary;
  for (const segment of key.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return fallback;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' && current.trim() !== '' ? current : fallback;
}
