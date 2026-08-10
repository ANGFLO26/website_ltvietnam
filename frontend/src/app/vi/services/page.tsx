import { renderServicesList, servicesListMetadata } from '@/lib/w4/services';

export const metadata = servicesListMetadata('vi');

export default function VietnameseServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderServicesList('vi', searchParams);
}
