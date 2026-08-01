/**
 * SINH TU DONG — DUNG SUA TAY.
 *
 * Nguon: PostgreSQL schema `ltv`, sinh boi scripts/generate-types.ts.
 * Chay lai sau moi migration:  pnpm --filter @ltv/db gen:types
 */
import type { ColumnType, Generated } from 'kysely';

// Cot dung ColumnType san. Ban `*Gen` cho cot CO DEFAULT: kieu insert them
// `undefined` de khong phai truyen. KHONG boc `Generated<ColumnType<..>>` —
// boc hai lan lam hong kieu doc.
type Timestamp = ColumnType<Date, Date | string, Date | string>;
type TimestampGen = ColumnType<Date, Date | string | undefined, Date | string>;
type DateOnly = ColumnType<Date, Date | string, Date | string>;
type DateOnlyGen = ColumnType<Date, Date | string | undefined, Date | string>;
type Json = unknown;
type JsonGen = ColumnType<unknown, unknown | undefined, unknown>;

export interface ApplicationsTable {
  id: Generated<string>;
  parent_id: string | null;
  ancestor_ids: Generated<string[]>;
  depth: Generated<number>;
  name: string;
  slug: string;
  description: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  icon_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface BannersTable {
  id: Generated<string>;
  image_id: string;
  mobile_image_id: string | null;
  title: string;
  subtitle: string | null;
  button_label: string | null;
  image_alt: string | null;
  link_type: Generated<string>;
  link_target_id: string | null;
  custom_url: string | null;
  open_new_tab: Generated<boolean>;
  status: Generated<string>;
  display_order: Generated<number>;
  start_at: Timestamp | null;
  end_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface BrandsTable {
  id: Generated<string>;
  parent_id: string | null;
  ancestor_ids: Generated<string[]>;
  depth: Generated<number>;
  brand_type: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  code: string | null;
  country_code: string | null;
  website_url: string | null;
  logo_id: string | null;
  cover_image_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface ContentMediaRefsTable {
  id: Generated<string>;
  media_id: string;
  entity_type: string;
  entity_id: string;
  locale: string | null;
  field_name: string;
  created_at: TimestampGen;
}

export interface CustomersTable {
  id: Generated<string>;
  name: string;
  short_description: string | null;
  logo_id: string | null;
  industry_id: string | null;
  website_url: string | null;
  is_public: Generated<boolean>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  status: Generated<string>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface DocumentBrandsTable {
  document_id: string;
  brand_id: string;
}

export interface DocumentPostsTable {
  document_id: string;
  post_id: string;
}

export interface DocumentProductsTable {
  document_id: string;
  product_id: string;
  display_order: Generated<number>;
}

export interface DocumentServicesTable {
  document_id: string;
  service_id: string;
}

export interface DocumentsTable {
  id: Generated<string>;
  document_type: string;
  file_id: string;
  title: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  language: Generated<string>;
  version: string | null;
  publication_date: DateOnly | null;
  status: Generated<string>;
  visibility: Generated<string>;
  download_count: Generated<string>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface HomepageSectionsTable {
  id: Generated<string>;
  section_type: string;
  is_enabled: Generated<boolean>;
  display_order: Generated<number>;
  settings: JsonGen;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface IndustriesTable {
  id: Generated<string>;
  name: string;
  slug: string;
  description: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  featured_image_id: string | null;
  icon_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface InquiriesTable {
  id: Generated<string>;
  inquiry_type: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  message: string;
  product_id: string | null;
  service_id: string | null;
  source_url: string | null;
  locale: Generated<string>;
  preferred_contact_method: string | null;
  province: string | null;
  privacy_consent_at: Timestamp;
  email_status: Generated<string>;
  idempotency_key: string;
  request_fingerprint: string | null;
  request_fingerprint_version: string | null;
  handled_at: Timestamp | null;
  handled_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  captcha_score: string | null;
  created_at: TimestampGen;
  expires_at: Timestamp | null;
}

export interface InquiryOutboxTable {
  id: Generated<string>;
  inquiry_id: string;
  channel: Generated<string>;
  recipient: string;
  status: Generated<string>;
  attempts: Generated<number>;
  last_attempt_at: Timestamp | null;
  next_attempt_at: TimestampGen;
  locked_at: Timestamp | null;
  locked_by: string | null;
  last_error: string | null;
  sent_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface MediaTable {
  id: Generated<string>;
  file_name: string;
  original_name: string;
  storage_disk: Generated<string>;
  storage_class: Generated<string>;
  storage_path: string;
  public_url: string | null;
  variants: JsonGen;
  mime_type: string;
  file_extension: string;
  file_size: string;
  width: number | null;
  height: number | null;
  checksum: string | null;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
  uploaded_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
  purged_at: Timestamp | null;
}

export interface MenuItemsTable {
  id: Generated<string>;
  menu_id: string;
  parent_id: string | null;
  label: string;
  label_i18n_key: string | null;
  title_attribute: string | null;
  link_type: string;
  link_target_id: string | null;
  custom_url: string | null;
  icon_id: string | null;
  open_new_tab: Generated<boolean>;
  display_order: Generated<number>;
  status: Generated<string>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface MenusTable {
  id: Generated<string>;
  code: string;
  name: string;
  location: string;
  status: Generated<string>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface OfficesTable {
  id: Generated<string>;
  office_type: string;
  name: string;
  address: string;
  working_hours: string | null;
  description: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  map_url: string | null;
  latitude: string | null;
  longitude: string | null;
  featured_image_id: string | null;
  status: Generated<string>;
  display_order: Generated<number>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface PageTranslationsTable {
  id: Generated<string>;
  page_id: string;
  locale: string;
  title: string;
  slug: string;
  summary: string | null;
  content: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface PagesTable {
  id: Generated<string>;
  page_type: string;
  featured_image_id: string | null;
  status: Generated<string>;
  is_system_page: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface PostBrandsTable {
  post_id: string;
  brand_id: string;
}

export interface PostCategoriesTable {
  id: Generated<string>;
  parent_id: string | null;
  ancestor_ids: Generated<string[]>;
  depth: Generated<number>;
  name: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface PostMediaTable {
  post_id: string;
  media_id: string;
  display_order: Generated<number>;
}

export interface PostProductsTable {
  post_id: string;
  product_id: string;
}

export interface PostProjectsTable {
  post_id: string;
  project_id: string;
}

export interface PostServicesTable {
  post_id: string;
  service_id: string;
}

export interface PostTranslationsTable {
  id: Generated<string>;
  post_id: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface PostsTable {
  id: Generated<string>;
  category_id: string;
  featured_image_id: string | null;
  author_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface ProductApplicationsTable {
  product_id: string;
  application_id: string;
  is_primary: Generated<boolean>;
}

export interface ProductCategoriesTable {
  id: Generated<string>;
  parent_id: string | null;
  ancestor_ids: Generated<string[]>;
  depth: Generated<number>;
  name: string;
  slug: string;
  short_description: string | null;
  description: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  code: string | null;
  featured_image_id: string | null;
  icon_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface ProductCategoryLinksTable {
  product_id: string;
  category_id: string;
  is_primary: Generated<boolean>;
}

export interface ProductIndustriesTable {
  product_id: string;
  industry_id: string;
}

export interface ProductMediaTable {
  product_id: string;
  media_id: string;
  media_role: Generated<string>;
  display_order: Generated<number>;
}

export interface ProductSpecificationsTable {
  id: Generated<string>;
  product_id: string;
  group_key: string | null;
  label: string;
  value: string | null;
  unit: string | null;
  display_order: Generated<number>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface ProductStandardsTable {
  product_id: string;
  standard_id: string;
  compliance_type: Generated<string>;
  note: string | null;
  display_order: Generated<number>;
}

export interface ProductsTable {
  id: Generated<string>;
  brand_id: string;
  featured_image_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  overview: JsonGen;
  features: JsonGen;
  applications_text: JsonGen;
  principle: JsonGen;
  sample_types: JsonGen;
  operating_conditions: JsonGen;
  accessories_options: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  model: string | null;
  internal_code: string | null;
  sku: string | null;
  product_type: Generated<string>;
  price_visibility: Generated<string>;
  sale_mode: Generated<string>;
  requires_configuration: Generated<boolean>;
  warranty_months: number | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  discontinued_at: Timestamp | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface ProjectBrandsTable {
  project_id: string;
  brand_id: string;
}

export interface ProjectMediaTable {
  project_id: string;
  media_id: string;
  caption: string | null;
  display_order: Generated<number>;
}

export interface ProjectProductsTable {
  project_id: string;
  product_id: string;
  note: string | null;
  display_order: Generated<number>;
}

export interface ProjectServicesTable {
  project_id: string;
  service_id: string;
}

export interface ProjectTranslationsTable {
  id: Generated<string>;
  project_id: string;
  locale: string;
  title: string;
  slug: string;
  short_description: string | null;
  scope_of_work: JsonGen;
  implementation: JsonGen;
  result: JsonGen;
  customer_display_name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface ProjectsTable {
  id: Generated<string>;
  customer_id: string | null;
  project_type: string;
  customer_visibility: Generated<string>;
  location_text: string | null;
  country_code: string | null;
  started_at: DateOnly | null;
  completed_at: DateOnly | null;
  featured_image_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  published_at: Timestamp | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface RedirectsTable {
  id: Generated<string>;
  source_path: string;
  target_path: string;
  redirect_type: Generated<number>;
  status: Generated<string>;
  hit_count: Generated<string>;
  last_hit_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface RelatedProductsTable {
  product_id: string;
  related_product_id: string;
  relation_type: string;
  display_order: Generated<number>;
}

export interface ServiceBrandsTable {
  service_id: string;
  brand_id: string;
}

export interface ServiceIndustriesTable {
  service_id: string;
  industry_id: string;
}

export interface ServiceProductsTable {
  service_id: string;
  product_id: string;
  display_order: Generated<number>;
}

export interface ServiceTranslationsTable {
  id: Generated<string>;
  service_id: string;
  locale: string;
  name: string;
  slug: string;
  short_description: string | null;
  overview: JsonGen;
  customer_problems: JsonGen;
  scope_of_work: JsonGen;
  process: JsonGen;
  benefits: JsonGen;
  faq: JsonGen;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface ServicesTable {
  id: Generated<string>;
  parent_id: string | null;
  ancestor_ids: Generated<string[]>;
  depth: Generated<number>;
  service_type: string | null;
  featured_image_id: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface SettingsTable {
  id: Generated<string>;
  group_name: string;
  setting_key: string;
  value: string | null;
  value_type: Generated<string>;
  is_public: Generated<boolean>;
  is_encrypted: Generated<boolean>;
  created_at: TimestampGen;
  updated_at: TimestampGen;
}

export interface StandardsTable {
  id: Generated<string>;
  organization: string;
  code: string;
  name: string | null;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: Generated<string>;
  is_featured: Generated<boolean>;
  display_order: Generated<number>;
  published_at: Timestamp | null;
  first_published_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface UsersTable {
  id: Generated<string>;
  name: string;
  email: string;
  password_hash: string;
  role: Generated<string>;
  status: Generated<string>;
  last_login_at: Timestamp | null;
  password_changed_at: Timestamp | null;
  created_at: TimestampGen;
  updated_at: TimestampGen;
  deleted_at: Timestamp | null;
}

export interface Database {
  applications: ApplicationsTable;
  banners: BannersTable;
  brands: BrandsTable;
  content_media_refs: ContentMediaRefsTable;
  customers: CustomersTable;
  document_brands: DocumentBrandsTable;
  document_posts: DocumentPostsTable;
  document_products: DocumentProductsTable;
  document_services: DocumentServicesTable;
  documents: DocumentsTable;
  homepage_sections: HomepageSectionsTable;
  industries: IndustriesTable;
  inquiries: InquiriesTable;
  inquiry_outbox: InquiryOutboxTable;
  media: MediaTable;
  menu_items: MenuItemsTable;
  menus: MenusTable;
  offices: OfficesTable;
  page_translations: PageTranslationsTable;
  pages: PagesTable;
  post_brands: PostBrandsTable;
  post_categories: PostCategoriesTable;
  post_media: PostMediaTable;
  post_products: PostProductsTable;
  post_projects: PostProjectsTable;
  post_services: PostServicesTable;
  post_translations: PostTranslationsTable;
  posts: PostsTable;
  product_applications: ProductApplicationsTable;
  product_categories: ProductCategoriesTable;
  product_category_links: ProductCategoryLinksTable;
  product_industries: ProductIndustriesTable;
  product_media: ProductMediaTable;
  product_specifications: ProductSpecificationsTable;
  product_standards: ProductStandardsTable;
  products: ProductsTable;
  project_brands: ProjectBrandsTable;
  project_media: ProjectMediaTable;
  project_products: ProjectProductsTable;
  project_services: ProjectServicesTable;
  project_translations: ProjectTranslationsTable;
  projects: ProjectsTable;
  redirects: RedirectsTable;
  related_products: RelatedProductsTable;
  service_brands: ServiceBrandsTable;
  service_industries: ServiceIndustriesTable;
  service_products: ServiceProductsTable;
  service_translations: ServiceTranslationsTable;
  services: ServicesTable;
  settings: SettingsTable;
  standards: StandardsTable;
  users: UsersTable;
}
