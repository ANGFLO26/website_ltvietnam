import { render, screen } from '@testing-library/react';
import type { Faq, OfficeView, PostDetailView } from '@ltv/contracts';
import { describe, expect, it } from 'vitest';
import { FaqSection } from '@/components/content/FaqSection';
import { selectSocialImage } from '@/lib/seo';
import {
  buildArticleStructuredData,
  buildFaqStructuredData,
  buildSiteStructuredData,
} from '@/lib/structured-data';

describe('W7 structured data', () => {
  it('emits one Organization and a LocalBusiness for every published office', () => {
    const data = buildSiteStructuredData({
      siteUrl: 'https://example.test',
      name: 'LT Vietnam',
      description: 'Industrial equipment and services',
      offices: [office],
      logoUrl: '/media/logo.webp',
    });
    const graph = data['@graph'] as readonly Record<string, unknown>[];

    expect(graph.map((item) => item['@type'])).toEqual(['Organization', 'LocalBusiness']);
    expect(graph[0]).toMatchObject({
      '@id': 'https://example.test/#organization',
      logo: 'https://example.test/media/logo.webp',
    });
    expect(graph[1]).toMatchObject({
      telephone: '028 1234 5678',
      geo: { '@type': 'GeoCoordinates', latitude: 10.77, longitude: 106.7 },
    });
  });

  it('emits a NewsArticle tied to the site organization', () => {
    const data = buildArticleStructuredData(post, '/media/news.webp');
    expect(data).toMatchObject({
      '@type': 'NewsArticle',
      headline: post.title,
      datePublished: post.published_at,
      inLanguage: 'vi-VN',
      publisher: { '@id': 'https://example.test/#organization' },
      image: 'https://example.test/media/news.webp',
    });
  });

  it('renders and describes FAQ from the exact same structured source', () => {
    render(<FaqSection title="Frequently asked questions" faq={faq} />);
    const data = buildFaqStructuredData(faq, 'https://example.test/services/calibration');

    expect(screen.getByText('How long does calibration take?')).toBeInTheDocument();
    expect(screen.getByText('Usually three working days.')).toBeInTheDocument();
    expect(data).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How long does calibration take?',
          acceptedAnswer: { '@type': 'Answer', text: 'Usually three working days.' },
        },
      ],
    });
    expect(buildFaqStructuredData({ version: 1, items: [] }, post.canonical)).toBeNull();
    expect(buildFaqStructuredData(undefined, post.canonical)).toBeNull();
  });
});

describe('W7 social image fallback', () => {
  it('uses featured, cover, site cover, logo and default in that order', () => {
    const candidates = {
      featured: '/featured.webp',
      cover: '/cover.webp',
      siteCover: '/site-cover.webp',
      logo: '/logo.webp',
      fallback: '/default.webp',
    };
    expect(selectSocialImage(candidates)).toBe('/featured.webp');
    expect(selectSocialImage({ ...candidates, featured: null })).toBe('/cover.webp');
    expect(selectSocialImage({ ...candidates, featured: null, cover: null })).toBe(
      '/site-cover.webp',
    );
    expect(selectSocialImage({ ...candidates, featured: null, cover: null, siteCover: null })).toBe(
      '/logo.webp',
    );
    expect(
      selectSocialImage({
        ...candidates,
        featured: null,
        cover: null,
        siteCover: null,
        logo: null,
      }),
    ).toBe('/default.webp');
  });
});

const faq: Faq = {
  version: 1,
  items: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      question: 'How long does calibration take?',
      answer_spans: [{ text: 'Usually three working days.' }],
    },
  ],
};

const office: OfficeView = {
  office_type: 'head_office',
  name: 'Ho Chi Minh City Office',
  address: 'District 1, Ho Chi Minh City',
  working_hours: 'Monday-Friday 08:00-17:00',
  phone: '028 1234 5678',
  fax: null,
  email: 'hello@example.test',
  map_url: null,
  latitude: 10.77,
  longitude: 106.7,
};

const post: PostDetailView = {
  slug: 'tin-ky-thuat',
  locale: 'vi',
  title: 'Tin kỹ thuật',
  excerpt: 'Mô tả bài viết',
  content: [],
  featured_image_id: null,
  category: { slug: 'technical', name: 'Technical' },
  published_at: '2026-08-10T00:00:00.000Z',
  seo_title: null,
  seo_description: null,
  canonical: 'https://example.test/vi/news/tin-ky-thuat',
  robots: 'index,follow',
  hreflang_alternates: [],
};
