import type { Metadata } from 'next';
import { contactMetadata, renderContactPage } from '@/lib/w5/contact';

export const metadata: Metadata = contactMetadata('en');

export default function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | readonly string[];
    service?: string | readonly string[];
  }>;
}) {
  return renderContactPage('en', searchParams);
}
