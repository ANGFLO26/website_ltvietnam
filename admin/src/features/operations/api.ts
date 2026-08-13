'use client';

import type {
  AdminBannerView,
  AdminBannerWriteRequest,
  AdminCustomerView,
  AdminCustomerWriteRequest,
  AdminHomepageSectionView,
  AdminHomepageSectionWriteRequest,
  AdminManagedUserCreateRequest,
  AdminManagedUserView,
  AdminMenuItemView,
  AdminMenuItemWriteRequest,
  AdminMenuView,
  AdminMenuWriteRequest,
  AdminOfficeView,
  AdminOfficeWriteRequest,
  AdminRedirectView,
  AdminRedirectWriteRequest,
  AdminSettingView,
  InquiryView,
} from '@ltv/contracts';
import { adminBrowserPage, adminBrowserRequest } from '@/lib/api/client.browser';

export const operationKeys = {
  inquiries: (query: string) => ['operations', 'inquiries', query] as const,
  inquiry: (id: string) => ['operations', 'inquiry', id] as const,
  customers: ['operations', 'customers'] as const,
  offices: ['operations', 'offices'] as const,
  banners: ['operations', 'banners'] as const,
  homepage: ['operations', 'homepage'] as const,
  menus: ['operations', 'menus'] as const,
  redirects: (query = '') => ['operations', 'redirects', query] as const,
  settings: ['operations', 'settings'] as const,
  users: (query = '') => ['operations', 'users', query] as const,
};

export const listInquiries = (query: string) =>
  adminBrowserPage<InquiryView>(`/admin/inquiries${query}`);
export const getInquiry = (id: string) =>
  adminBrowserRequest<InquiryView>(`/admin/inquiries/${id}`);
export const markInquiryHandled = (id: string) =>
  adminBrowserRequest<InquiryView>(`/admin/inquiries/${id}/handled`, {
    method: 'PATCH',
    body: { handled: true },
  });

export const listCustomers = () =>
  adminBrowserPage<AdminCustomerView>('/admin/customers?page_size=100');
export const createCustomer = (body: AdminCustomerWriteRequest) =>
  adminBrowserRequest<AdminCustomerView>('/admin/customers', { method: 'POST', body });
export const updateCustomer = (id: string, body: AdminCustomerWriteRequest) =>
  adminBrowserRequest<AdminCustomerView>(`/admin/customers/${id}`, { method: 'PATCH', body });
export const customerLifecycle = (id: string, action: 'publish' | 'hide') =>
  adminBrowserRequest<AdminCustomerView>(`/admin/customers/${id}/${action}`, { method: 'POST' });

export const listOffices = () => adminBrowserRequest<AdminOfficeView[]>('/admin/offices');
export const createOffice = (body: AdminOfficeWriteRequest) =>
  adminBrowserRequest<AdminOfficeView>('/admin/offices', { method: 'POST', body });
export const updateOffice = (id: string, body: AdminOfficeWriteRequest) =>
  adminBrowserRequest<AdminOfficeView>(`/admin/offices/${id}`, { method: 'PATCH', body });
export const officeLifecycle = (id: string, action: 'publish' | 'hide') =>
  adminBrowserRequest<AdminOfficeView>(`/admin/offices/${id}/${action}`, { method: 'POST' });

export const listBanners = () => adminBrowserRequest<AdminBannerView[]>('/admin/banners');
export const createBanner = (body: AdminBannerWriteRequest) =>
  adminBrowserRequest<AdminBannerView>('/admin/banners', { method: 'POST', body });
export const updateBanner = (id: string, body: AdminBannerWriteRequest) =>
  adminBrowserRequest<AdminBannerView>(`/admin/banners/${id}`, { method: 'PATCH', body });
export const bannerLifecycle = (id: string, action: 'publish' | 'hide') =>
  adminBrowserRequest<AdminBannerView>(`/admin/banners/${id}/${action}`, { method: 'POST' });

export const listHomepage = () =>
  adminBrowserRequest<AdminHomepageSectionView[]>('/admin/homepage');
export const updateHomepageSection = (type: string, body: AdminHomepageSectionWriteRequest) =>
  adminBrowserRequest<AdminHomepageSectionView>(`/admin/homepage/sections/${type}`, {
    method: 'PATCH',
    body,
  });

export const listMenus = () => adminBrowserRequest<AdminMenuView[]>('/admin/menus');
export const createMenu = (body: AdminMenuWriteRequest) =>
  adminBrowserRequest<AdminMenuView>('/admin/menus', { method: 'POST', body });
export const updateMenu = (id: string, body: AdminMenuWriteRequest) =>
  adminBrowserRequest<AdminMenuView>(`/admin/menus/${id}`, { method: 'PATCH', body });
export const addMenuItem = (menuId: string, body: AdminMenuItemWriteRequest) =>
  adminBrowserRequest<AdminMenuItemView>(`/admin/menus/${menuId}/items`, { method: 'POST', body });
export const updateMenuItem = (id: string, body: AdminMenuItemWriteRequest) =>
  adminBrowserRequest<AdminMenuItemView>(`/admin/menu-items/${id}`, { method: 'PATCH', body });
export const reorderMenu = (menuId: string, itemIds: readonly string[]) =>
  adminBrowserRequest<AdminMenuItemView[]>(`/admin/menus/${menuId}/reorder`, {
    method: 'POST',
    body: { item_ids: itemIds },
  });

export const listRedirects = (query: string) =>
  adminBrowserPage<AdminRedirectView>(`/admin/redirects${query}`);
export const createRedirect = (body: AdminRedirectWriteRequest) =>
  adminBrowserRequest<AdminRedirectView>('/admin/redirects', { method: 'POST', body });
export const updateRedirect = (id: string, body: AdminRedirectWriteRequest) =>
  adminBrowserRequest<AdminRedirectView>(`/admin/redirects/${id}`, { method: 'PATCH', body });
export const deleteRedirect = (id: string) =>
  adminBrowserRequest<void>(`/admin/redirects/${id}`, { method: 'DELETE' });

export const listSettings = () => adminBrowserRequest<AdminSettingView[]>('/admin/settings');
export const updateSettingGroup = (
  group: string,
  settings: Readonly<Record<string, string | null>>,
) =>
  adminBrowserRequest<AdminSettingView[]>(`/admin/settings/${group}`, {
    method: 'PATCH',
    body: settings,
  });

export const listUsers = (query: string) =>
  adminBrowserPage<AdminManagedUserView>(`/admin/users${query}`);
export const createUser = (body: AdminManagedUserCreateRequest) =>
  adminBrowserRequest<AdminManagedUserView>('/admin/users', { method: 'POST', body });
export const setUserStatus = (id: string, status: AdminManagedUserView['status']) =>
  adminBrowserRequest<AdminManagedUserView>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: { status },
  });
