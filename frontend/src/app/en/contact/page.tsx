import type { Metadata } from 'next';
import { contactMetadata, renderContactPage } from '@/page-views/contact';

export const metadata: Metadata = contactMetadata('en');

export default function EnglishContactPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | readonly string[];
    service?: string | readonly string[];
  }>;
}) {
  return renderContactPage('en', searchParams);
}
