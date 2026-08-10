import type { Metadata } from 'next';
import { aboutMetadata, renderAbout } from '@/lib/w4/about';

export function generateMetadata(): Promise<Metadata> {
  return aboutMetadata('en');
}

export default function AboutPage() {
  return renderAbout('en');
}
