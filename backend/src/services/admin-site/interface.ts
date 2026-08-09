import type { Banner, CreateBannerInput, UpdateBannerInput } from '../../dao/banners/object.js';
import type {
  CreateCustomerInput,
  Customer,
  UpdateCustomerInput,
} from '../../dao/customers/object.js';
import type {
  AppDocument,
  CreateDocumentInput,
  DocumentLinks,
  UpdateDocumentInput,
} from '../../dao/documents/object.js';
import type {
  HomepageSection,
  UpsertHomepageSectionInput,
} from '../../dao/homepage-sections/object.js';
import type {
  CreateMenuInput,
  Menu,
  MenuItem,
  UpdateMenuInput,
  UpsertMenuItemInput,
} from '../../dao/menus/object.js';
import type { CreateOfficeInput, Office, UpdateOfficeInput } from '../../dao/offices/object.js';

export const ADMIN_SITE_SERVICE = Symbol('ADMIN_SITE_SERVICE');

export interface AdminSitePage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

export interface AdminSiteService {
  listDocuments(
    filter: Record<string, unknown>,
    page: { page: number; pageSize: number },
  ): Promise<AdminSitePage<AppDocument>>;
  findDocument(id: string): Promise<{ document: AppDocument; links: Required<DocumentLinks> }>;
  createDocument(input: CreateDocumentInput & DocumentLinks): Promise<AppDocument>;
  updateDocument(id: string, input: UpdateDocumentInput & DocumentLinks): Promise<AppDocument>;
  publishDocument(id: string): Promise<AppDocument>;
  hideDocument(id: string): Promise<AppDocument>;
  deleteDocument(id: string, hard: boolean): Promise<void>;
  restoreDocument(id: string): Promise<AppDocument>;

  listCustomers(
    filter: Record<string, unknown>,
    page: { page: number; pageSize: number },
  ): Promise<AdminSitePage<Customer>>;
  findCustomer(id: string): Promise<Customer>;
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer>;
  publishCustomer(id: string): Promise<Customer>;
  hideCustomer(id: string): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  restoreCustomer(id: string): Promise<Customer>;

  listOffices(filter: Record<string, unknown>): Promise<readonly Office[]>;
  findOffice(id: string): Promise<Office>;
  createOffice(input: CreateOfficeInput): Promise<Office>;
  updateOffice(id: string, input: UpdateOfficeInput): Promise<Office>;
  publishOffice(id: string): Promise<Office>;
  hideOffice(id: string): Promise<Office>;
  deleteOffice(id: string): Promise<void>;

  listBanners(filter: Record<string, unknown>): Promise<readonly Banner[]>;
  findBanner(id: string): Promise<Banner>;
  createBanner(input: CreateBannerInput): Promise<Banner>;
  updateBanner(id: string, input: UpdateBannerInput): Promise<Banner>;
  publishBanner(id: string): Promise<Banner>;
  hideBanner(id: string): Promise<Banner>;
  deleteBanner(id: string): Promise<void>;

  homepage(): Promise<readonly HomepageSection[]>;
  updateHomepage(input: UpsertHomepageSectionInput): Promise<HomepageSection>;

  listMenus(): Promise<readonly (Menu & { items: readonly MenuItem[] })[]>;
  createMenu(input: CreateMenuInput): Promise<Menu>;
  updateMenu(id: string, input: UpdateMenuInput): Promise<Menu>;
  deleteMenu(id: string): Promise<void>;
  addMenuItem(menuId: string, input: UpsertMenuItemInput): Promise<MenuItem>;
  updateMenuItem(id: string, input: Partial<UpsertMenuItemInput>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  reorderMenu(menuId: string, itemIds: readonly string[]): Promise<readonly MenuItem[]>;
}
