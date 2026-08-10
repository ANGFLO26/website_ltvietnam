import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageDetailView } from '@ltv/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { getDictionary } from '@/lib/i18n';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';
import { renderSearchPage, searchMetadata } from '@/lib/w6/search';

const { getPageMock, searchSiteMock } = vi.hoisted(() => ({
  getPageMock: vi.fn(),
  searchSiteMock: vi.fn(),
}));

vi.mock('@/lib/api/content', () => ({ getPage: getPageMock }));
vi.mock('@/lib/api/site', () => ({ searchSite: searchSiteMock }));

const dictionary = getDictionary('en');

beforeEach(() => {
  getPageMock.mockReset();
  searchSiteMock.mockReset();
  window.localStorage.clear();
});

describe('W6 search', () => {
  it('does not call the API for a query shorter than two characters', async () => {
    render(await renderSearchPage('en', Promise.resolve({ q: 'a' })));

    expect(screen.getByRole('heading', { name: dictionary.search.shortTitle })).toBeInTheDocument();
    expect(searchSiteMock).not.toHaveBeenCalled();
  });

  it('renders product results and preserves the query in pagination', async () => {
    searchSiteMock.mockResolvedValue({
      data: [
        {
          type: 'product',
          slug: 'isl-optidist-2-automatic-distillation-analyzer',
          title: 'OptiDist 2',
          subtitle: 'Automatic distillation analyzer',
        },
      ],
      meta: { page: 1, page_size: 20, total_items: 21, total_pages: 2 },
    });

    render(await renderSearchPage('en', Promise.resolve({ q: ' OptiDist ' })));

    expect(searchSiteMock).toHaveBeenCalledWith({
      q: 'OptiDist',
      locale: 'en',
      page: 1,
      pageSize: 20,
    });
    expect(screen.getByRole('link', { name: /OptiDist 2/ })).toHaveAttribute(
      'href',
      '/products/isl-optidist-2-automatic-distillation-analyzer',
    );
    expect(screen.getByRole('link', { name: dictionary.common.nextPage })).toHaveAttribute(
      'href',
      '/search?q=OptiDist&page=2',
    );
  });

  it('provides catalogue and contact actions when no product matches', async () => {
    searchSiteMock.mockResolvedValue({
      data: [],
      meta: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
    });

    render(await renderSearchPage('vi', Promise.resolve({ q: 'khong-co' })));
    const viDictionary = getDictionary('vi');

    expect(
      screen.getByRole('heading', { name: viDictionary.search.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: viDictionary.search.browseProducts })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(screen.getByRole('link', { name: viDictionary.search.contactAction })).toHaveAttribute(
      'href',
      '/vi/contact',
    );
  });

  it('keeps both language variants of search out of the index', () => {
    expect(searchMetadata('en').robots).toMatchObject({ index: false, follow: true });
    expect(searchMetadata('vi').alternates?.canonical).toBe('http://localhost:3000/vi/search');
  });
});

describe('W6 policy and consent pages', () => {
  it('uses the published CMS policy and its SEO alternates', async () => {
    getPageMock.mockResolvedValue(policyPage);

    const metadata = await policyMetadata('privacy-policy', 'en');
    render(await renderPolicyPage('privacy-policy', 'en'));

    expect(getPageMock).toHaveBeenCalledWith('privacy-policy', 'en');
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/privacy-policy');
    expect(metadata.alternates?.languages).toEqual({
      en: 'http://localhost:3000/privacy-policy',
      vi: 'http://localhost:3000/vi/privacy-policy',
    });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Policy body')).toBeInTheDocument();
  });

  it('stores a consent choice and keeps the banner hidden after remount', async () => {
    const user = userEvent.setup();
    const firstRender = render(<CookieBanner locale="en" dictionary={dictionary} />);
    const dialog = await screen.findByRole('dialog', { name: dictionary.cookie.title });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: dictionary.cookie.accept }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    firstRender.unmount();

    render(<CookieBanner locale="en" dictionary={dictionary} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const policyPage: PageDetailView = {
  slug: 'privacy-policy',
  locale: 'en',
  title: 'Privacy Policy',
  page_type: 'privacy_policy',
  summary: 'How LT Vietnam handles personal data.',
  content: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'heading',
      level: 2,
      text: 'Privacy Policy',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      type: 'paragraph',
      spans: [{ text: 'Policy body' }],
    },
  ],
  seo_title: null,
  seo_description: null,
  canonical: '/privacy-policy',
  robots: 'index,follow',
  hreflang_alternates: [
    { locale: 'en', slug: 'privacy-policy', url: '/privacy-policy' },
    { locale: 'vi', slug: 'privacy-policy-vi', url: '/vi/privacy-policy' },
  ],
};
