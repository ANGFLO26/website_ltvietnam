import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HomeView, MenuItemView, NavigationView, OfficeView } from '@ltv/contracts';
import { HomeSections } from '@/components/home/HomeSections';
import { Header } from '@/components/layout/Header';
import { MenuItemLink } from '@/components/layout/MenuTree';
import { loadHomePage } from '@/lib/home';
import { getDictionary } from '@/lib/i18n';
import { loadSiteShell, loadSiteShellSafe } from '@/lib/site-shell';

const dictionary = getDictionary('en');

afterEach(() => vi.unstubAllGlobals());

describe('W1 navigation', () => {
  it('renders menu labels from API data and keeps null URL as text', () => {
    const heading: MenuItemView = {
      label: 'Database-only heading',
      label_i18n_key: null,
      url: null,
      open_new_tab: false,
      children: [],
    };
    const { rerender } = render(<MenuItemLink item={heading} />);
    expect(screen.getByText(heading.label)).toBeInTheDocument();
    expect(screen.getByText(heading.label).closest('a')).toBeNull();

    const header = navigation('header', [
      heading,
      {
        label: 'Dynamic DB link',
        label_i18n_key: null,
        url: '/dynamic-from-db',
        open_new_tab: false,
        children: [],
      },
    ]);
    rerender(<Header header={header} mobile={navigation('mobile')} dictionary={dictionary} />);
    expect(screen.getByRole('link', { name: 'Dynamic DB link' })).toHaveAttribute(
      'href',
      '/dynamic-from-db',
    );
  });

  it('falls back to API header items when the mobile menu seed is empty', async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo) => {
      const url = new URL(String(input));
      const location = url.pathname.split('/').at(-1);
      if (location === 'header') {
        return Promise.resolve(
          jsonResponse({
            data: navigation('header', [
              {
                label: 'Header API fallback',
                label_i18n_key: null,
                url: '/from-header',
                open_new_tab: false,
                children: [],
              },
            ]),
          }),
        );
      }
      if (location === 'mobile' || location === 'footer') {
        return Promise.resolve(jsonResponse({ data: navigation(location) }));
      }
      return Promise.resolve(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const shell = await loadSiteShell('en');
    expect(shell.mobile.menus[0]?.items[0]?.label).toBe('Header API fallback');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses label_i18n_key for Vietnamese and falls back to the database label', () => {
    const translated: MenuItemView = {
      label: 'Products',
      label_i18n_key: 'nav.products',
      url: '/products',
      open_new_tab: false,
      children: [],
    };
    const { rerender } = render(
      <MenuItemLink item={translated} dictionary={getDictionary('vi')} />,
    );
    expect(screen.getByRole('link', { name: 'Sản phẩm' })).toBeInTheDocument();

    rerender(
      <MenuItemLink
        item={{ ...translated, label_i18n_key: 'nav.unknown' }}
        dictionary={getDictionary('vi')}
      />,
    );
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument();
  });
});

describe('W1 homepage sections', () => {
  it('uses the API order and omits sections absent from homepage_sections', () => {
    const home = homeData([
      { section_type: 'customers', display_order: 10, settings: {} },
      { section_type: 'company_intro', display_order: 1, settings: {} },
      { section_type: 'contact_call_to_action', display_order: 11, settings: {} },
    ]);
    const { container } = render(<HomeSections home={home} offices={[]} dictionary={dictionary} />);
    const sections = [...container.querySelectorAll<HTMLElement>('[data-section]')].map(
      (element) => element.dataset.section,
    );
    expect(sections).toEqual(['customers', 'company_intro', 'contact_call_to_action']);
    expect(container.querySelector('[data-section="featured_products"]')).toBeNull();
  });

  it('renders the first active banner as the managed homepage hero', () => {
    const home: HomeView = {
      ...homeData([{ section_type: 'hero', display_order: 0, settings: {} }]),
      banners: [
        {
          title: 'Managed hero title',
          subtitle: 'Managed hero subtitle',
          image_id: '11111111-1111-4111-8111-111111111111',
          mobile_image_id: null,
          image_url: '/media/public-media/hero.webp',
          mobile_image_url: null,
          image_alt: 'Factory equipment',
          button_label: 'Explore now',
          url: '/products',
          open_new_tab: false,
        },
      ],
    };
    const { container } = render(<HomeSections home={home} offices={[]} dictionary={dictionary} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Managed hero title' })).toBeVisible();
    expect(screen.getByText('Managed hero subtitle')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Explore now' })).toHaveAttribute('href', '/products');
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('hero.webp'),
    );
  });
});

describe('W1 request budget', () => {
  it('uses exactly five API requests regardless of returned collection sizes', async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo) => responseFor(String(input)));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([loadSiteShell('en'), loadHomePage('en')]);
    expect(fetchMock).toHaveBeenCalledTimes(5);

    fetchMock.mockClear();
    await Promise.all([loadSiteShell('en'), loadHomePage('en')]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('returns an empty shell when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('backend offline')));
    await expect(loadSiteShellSafe('en')).resolves.toMatchObject({
      header: { menus: [] },
      mobile: { menus: [] },
      footer: { menus: [] },
    });
  });
});

function navigation(
  location: NavigationView['location'],
  items: readonly MenuItemView[] = [],
): NavigationView {
  return {
    location,
    menus: [{ code: location, name: location, location, items }],
    product_mega_menu: location === 'footer' ? null : { categories: [], brands: [] },
  };
}

function homeData(sections: HomeView['sections'] = []): HomeView {
  return {
    locale: 'en',
    sections,
    banners: [],
    featured_categories: [],
    featured_brands: [],
    featured_applications: [],
    featured_products: [],
    featured_services: [],
    featured_projects: [],
    latest_posts: [],
    customers: [],
  };
}

function responseFor(url: string): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith('/home')) return Promise.resolve(jsonResponse({ data: homeData() }));
  if (parsed.pathname.endsWith('/offices')) {
    const offices: readonly OfficeView[] = [];
    return Promise.resolve(jsonResponse({ data: offices }));
  }
  const location = parsed.pathname.split('/').at(-1);
  if (location === 'header' || location === 'mobile' || location === 'footer') {
    return Promise.resolve(jsonResponse({ data: navigation(location) }));
  }
  return Promise.resolve(jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
