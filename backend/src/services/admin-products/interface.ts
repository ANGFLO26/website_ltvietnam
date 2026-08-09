import type {
  ApplicationLink,
  CategoryLink,
  CreateProductInput,
  IndustryLink,
  Product,
  ProductDetail,
  ProductMediaLink,
  RelatedLink,
  Specification,
  StandardLink,
  UpdateProductInput,
} from '../../dao/products/object.js';

export const ADMIN_PRODUCT_SERVICE = Symbol('ADMIN_PRODUCT_SERVICE');

export interface AdminProductRelations {
  readonly categories?: readonly CategoryLink[] | undefined;
  readonly standards?: readonly StandardLink[] | undefined;
  readonly applications?: readonly ApplicationLink[] | undefined;
  readonly industries?: readonly IndustryLink[] | undefined;
  readonly media?: readonly ProductMediaLink[] | undefined;
  readonly relatedProducts?: readonly RelatedLink[] | undefined;
  readonly specifications?: readonly Specification[] | undefined;
}

export interface AdminProductWrite extends UpdateProductInput, AdminProductRelations {}

export interface AdminProductCreate extends CreateProductInput, AdminProductRelations {}

export interface AdminProductPage {
  readonly items: readonly Product[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

export interface AdminProductService {
  list(
    filter: {
      readonly status?: string | undefined;
      readonly brandId?: string | undefined;
      readonly search?: string | undefined;
      readonly includeDeleted?: boolean | undefined;
    },
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<AdminProductPage>;
  findById(id: string): Promise<ProductDetail>;
  create(input: AdminProductCreate, actorId: string): Promise<ProductDetail>;
  update(id: string, input: AdminProductWrite, actorId: string): Promise<ProductDetail>;
  publish(id: string): Promise<ProductDetail>;
  hide(id: string): Promise<ProductDetail>;
  delete(id: string, hard: boolean): Promise<void>;
  restore(id: string): Promise<ProductDetail>;
}
