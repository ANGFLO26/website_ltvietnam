import type { HomeView, Locale, OfficeView } from '@ltv/contracts';
import { getHome, getOffices } from './api/site';

export interface HomePageData {
  readonly home: HomeView;
  readonly offices: readonly OfficeView[];
}

export async function loadHomePage(locale: Locale = 'en'): Promise<HomePageData> {
  const [home, offices] = await Promise.all([getHome(locale), getOffices()]);
  return { home, offices };
}
