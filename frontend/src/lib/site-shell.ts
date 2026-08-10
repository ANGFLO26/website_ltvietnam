import type { Locale, NavigationView } from '@ltv/contracts';
import { getNavigation } from './api/site';

export interface SiteShellData {
  readonly header: NavigationView;
  readonly mobile: NavigationView;
  readonly footer: NavigationView;
}

export async function loadSiteShell(locale: Locale = 'en'): Promise<SiteShellData> {
  const [header, mobile, footer] = await Promise.all([
    getNavigation('header', locale),
    getNavigation('mobile', locale),
    getNavigation('footer', locale),
  ]);
  const mobileHasItems = mobile.menus.some((menu) => menu.items.length > 0);
  return {
    header,
    mobile: mobileHasItems ? mobile : { ...mobile, menus: header.menus },
    footer,
  };
}

/** 404 va error page van phai doc duoc khi backend tat han. */
export async function loadSiteShellSafe(locale: Locale = 'en'): Promise<SiteShellData> {
  try {
    return await loadSiteShell(locale);
  } catch {
    return emptySiteShell();
  }
}

function emptySiteShell(): SiteShellData {
  return {
    header: emptyNavigation('header'),
    mobile: emptyNavigation('mobile'),
    footer: emptyNavigation('footer'),
  };
}

function emptyNavigation(location: NavigationView['location']): NavigationView {
  return { location, menus: [], product_mega_menu: null };
}
