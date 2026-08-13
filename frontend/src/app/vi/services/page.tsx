import { renderServicesList, servicesListMetadata } from '@/page-views/services';

export const metadata = servicesListMetadata('vi');

export default function VietnameseServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderServicesList('vi', searchParams);
}
