import type { Metadata } from 'next';
import { aboutMetadata, renderAbout } from '@/page-views/about';

export function generateMetadata(): Promise<Metadata> {
  return aboutMetadata('vi');
}

export default function VietnameseAboutPage() {
  return renderAbout('vi');
}
