import type { Locale } from '@ltv/contracts';
import { en } from './en';
import { vi } from './vi';

export type Dictionary = typeof vi;

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'vi' ? vi : en;
}
