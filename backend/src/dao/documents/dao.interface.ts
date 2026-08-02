import type { Page, Paged } from '../helpers.js';
import type {
  AppDocument,
  CreateDocumentInput,
  DocumentFilter,
  DocumentLinks,
  DownloadableDocument,
  UpdateDocumentInput,
} from './object.js';

export interface DocumentDao {
  findById(id: string): Promise<AppDocument | null>;
  findBySlug(slug: string): Promise<AppDocument | null>;

  /**
   * Chi tra ve tai lieu THUC SU tai cong khai duoc:
   * `status='published'` VA `visibility='public'` (`05` PHAN IV).
   *
   * Duong tai xuong cong khai PHAI di qua ham nay, khong duoc dung
   * `findBySlug` roi tu kiem — kieu tra ve la thu ep dieu do.
   */
  findDownloadableBySlug(slug: string): Promise<DownloadableDocument | null>;

  list(filter: DocumentFilter, page?: Partial<Page>): Promise<Paged<AppDocument>>;

  insert(input: CreateDocumentInput): Promise<AppDocument>;
  update(id: string, input: UpdateDocumentInput): Promise<AppDocument>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<AppDocument>;
  unpublish(id: string): Promise<AppDocument>;

  /** Tang bo dem tai xuong — tang tai cho, khong doc-roi-ghi. */
  recordDownload(id: string, at: Date): Promise<void>;

  replaceLinks(id: string, links: DocumentLinks): Promise<void>;
  findLinks(id: string): Promise<Required<DocumentLinks>>;
  /** Tai lieu cua mot san pham — dung o tab "Tai lieu" trang chi tiet. */
  findByProduct(productId: string): Promise<AppDocument[]>;

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  canHardDelete(id: string): Promise<boolean>;
}
