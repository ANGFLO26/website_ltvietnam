import { renderServicesList, servicesListMetadata } from '@/lib/w4/services';

export const metadata = servicesListMetadata('en');

export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderServicesList('en', searchParams);
}
