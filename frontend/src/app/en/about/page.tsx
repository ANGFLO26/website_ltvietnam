import type { Metadata } from 'next';
import { aboutMetadata, renderAbout } from '@/page-views/about';

export function generateMetadata(): Promise<Metadata> {
  return aboutMetadata('en');
}

export default function EnglishAboutPage() {
  return renderAbout('en');
}
