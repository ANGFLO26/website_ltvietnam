import type { Metadata } from 'next';
import { contactMetadata, renderContactPage } from '@/page-views/contact';

export const metadata: Metadata = contactMetadata('vi');

export default function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | readonly string[];
    service?: string | readonly string[];
  }>;
}) {
  return renderContactPage('vi', searchParams);
}
