import { homeMetadata, renderHome } from '@/page-views/home';

export const metadata = homeMetadata('en');

export default function EnglishHomePage() {
  return renderHome('en');
}
