import type { Page, Paged } from '../helpers.js';
import type {
  CreateCustomerInput,
  Customer,
  CustomerFilter,
  PublicCustomer,
  UpdateCustomerInput,
} from './object.js';

export interface CustomerDao {
  findById(id: string): Promise<Customer | null>;
  list(filter: CustomerFilter, page?: Partial<Page>): Promise<Paged<Customer>>;

  /**
   * Logo duoc phep hien tren trang chu.
   *
   * BA dieu kien: `status='published'` VA `is_public=TRUE` VA co logo chua xoa.
   * Duong cong khai phai di qua ham nay — `list()` khong dam bao dieu do.
   */
  findPublicWithLogo(limit: number): Promise<PublicCustomer[]>;

  insert(input: CreateCustomerInput): Promise<Customer>;
  update(id: string, input: UpdateCustomerInput): Promise<Customer>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Customer>;

  /** So du an dang tro toi — de giao dien noi ly do khi khong xoa duoc. */
  countProjects(id: string): Promise<number>;
}
