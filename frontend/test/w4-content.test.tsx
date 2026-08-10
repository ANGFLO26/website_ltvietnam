import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '@ltv/contracts';
import { ContentDetailSection } from '@/components/content/ContentDetailSection';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { getDictionary } from '@/lib/i18n';
import {
  detailLanguageFallbacks,
  documentDownloadPath,
  localeFromPath,
  localizedRouteAlternates,
} from '@/lib/localized-content';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

describe('W4 locale routing', () => {
  it('detects Vietnamese only at the dedicated path prefix', () => {
    expect(localeFromPath('/vi/news')).toBe('vi');
    expect(localeFromPath('/vi')).toBe('vi');
    expect(localeFromPath('/news/vi-example')).toBe('en');
  });

  it('builds list and category alternates from the route manifest', () => {
    expect(localizedRouteAlternates('services.list').map((item) => item.url)).toEqual([
      '/services',
      '/vi/services',
    ]);
    expect(localizedRouteAlternates('news.category', { slug: 'technical-articles' })[1]?.url).toBe(
      '/vi/news/category/technical-articles',
    );
  });

  it('uses a published detail alternate and falls back to the other locale list', () => {
    const { rerender } = render(
      <LanguageSwitcher
        locale="en"
        alternates={[
          {
            locale: 'vi',
            slug: 'bai-viet-vi',
            url: '/vi/news/bai-viet-vi',
          },
        ]}
        fallbacks={detailLanguageFallbacks('news.list', 'en')}
        dictionary={dictionary}
      />,
    );
    expect(screen.getByRole('link', { name: 'VI' })).toHaveAttribute(
      'href',
      '/vi/news/bai-viet-vi',
    );

    rerender(
      <LanguageSwitcher
        locale="en"
        fallbacks={detailLanguageFallbacks('news.list', 'en')}
        dictionary={dictionary}
      />,
    );
    expect(screen.getByRole('link', { name: 'VI' })).toHaveAttribute('href', '/vi/news');
  });

  it('turns relative hreflang routes into absolute metadata URLs', () => {
    const metadata = buildMetadata('services.list', {
      title: 'Services',
      hreflangAlternates: localizedRouteAlternates('services.list'),
    });
    expect(metadata.alternates?.languages).toEqual({
      en: 'http://localhost:3000/services',
      vi: 'http://localhost:3000/vi/services',
    });
  });
});

describe('W4 content rendering', () => {
  it('keeps project fields as three separate editorial sections', () => {
    const block = (id: string, text: string): ContentBlock => ({
      id,
      type: 'paragraph',
      spans: [{ text }],
    });
    render(
      <>
        <ContentDetailSection
          title="Scope of work"
          blocks={[block('00000000-0000-4000-8000-000000000001', 'Scope content')]}
        />
        <ContentDetailSection
          title="Implementation"
          blocks={[block('00000000-0000-4000-8000-000000000002', 'Implementation content')]}
        />
        <ContentDetailSection
          title="Result"
          blocks={[block('00000000-0000-4000-8000-000000000003', 'Result content')]}
        />
      </>,
    );
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    expect(screen.getByText('Scope content')).toBeInTheDocument();
    expect(screen.getByText('Implementation content')).toBeInTheDocument();
    expect(screen.getByText('Result content')).toBeInTheDocument();
  });

  it('builds document downloads from the public slug', () => {
    expect(documentDownloadPath('optidist datasheet')).toBe(
      '/api/v1/documents/optidist%20datasheet/download',
    );
  });
});
