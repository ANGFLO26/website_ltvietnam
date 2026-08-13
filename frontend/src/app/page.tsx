import { homeMetadata, renderHome } from '@/page-views/home';

export const metadata = homeMetadata('vi');

export default function HomePage() {
  return renderHome('vi');
}
