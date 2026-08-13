import { renderServicesList, servicesListMetadata } from '@/page-views/services';

export const metadata = servicesListMetadata('en');

export default function EnglishServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderServicesList('en', searchParams);
}
