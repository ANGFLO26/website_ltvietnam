import type { Metadata } from 'next';
import { renderSearchPage, searchMetadata } from '@/lib/w6/search';

export const metadata: Metadata = searchMetadata('en');

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | readonly string[]; page?: string | readonly string[] }>;
}) {
  return renderSearchPage('en', searchParams);
}
