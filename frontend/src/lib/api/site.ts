import type {
  CustomerView,
  HomeView,
  Locale,
  NavLocation,
  NavigationView,
  OfficeView,
  SearchHitView,
} from '@ltv/contracts';
import { apiGet, apiGetPage } from './client.server';

export function getHome(locale: Locale = 'en'): Promise<HomeView> {
  return apiGet<HomeView>('/home', { query: { locale }, revalidate: 30, tags: ['home'] });
}

export function getNavigation(
  location: NavLocation,
  locale: Locale = 'en',
): Promise<NavigationView> {
  return apiGet<NavigationView>(`/navigation/${location}`, {
    query: { locale },
    revalidate: 60,
    tags: ['navigation'],
  });
}

export function getCustomers(limit?: number): Promise<readonly CustomerView[]> {
  return apiGet<readonly CustomerView[]>('/customers', {
    query: { limit },
    revalidate: 60,
    tags: ['customers'],
  });
}

export function getOffices(): Promise<readonly OfficeView[]> {
  return apiGet<readonly OfficeView[]>('/offices', {
    revalidate: 60,
    tags: ['offices'],
  });
}

export function searchSite(input: {
  readonly q: string;
  readonly locale?: Locale;
  readonly page?: number;
  readonly pageSize?: number;
}) {
  return apiGetPage<SearchHitView>('/search', {
    query: {
      q: input.q,
      locale: input.locale ?? 'en',
      page: input.page,
      page_size: input.pageSize,
    },
    revalidate: false,
  });
}
