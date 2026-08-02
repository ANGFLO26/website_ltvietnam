import type { Page, Paged } from '../helpers.js';
import type {
  CreateRedirectInput,
  Redirect,
  RedirectFilter,
  UpdateRedirectInput,
} from './object.js';

export interface RedirectDao {
  /**
   * DUONG NONG. Middleware goi ham nay cho moi yeu cau khong khop route.
   * Chi tra ve ban ghi `active`; `disabled` coi nhu khong ton tai.
   */
  findActiveBySource(sourcePath: string): Promise<Redirect | null>;

  findById(id: string): Promise<Redirect | null>;

  list(filter: RedirectFilter, page?: Partial<Page>): Promise<Paged<Redirect>>;

  /**
   * Tao chuyen huong, GOP CHUOI trong cung mot thao tac.
   *
   * Khi doi slug lan hai (A -> B roi B -> C), neu chi them `B -> C` thi khach
   * di tu A phai qua HAI chang. Google tinh do la chuoi va giam gia tri
   * truyen qua; qua ba chang thi co the bo qua han. Ham nay tu viet lai moi
   * ban ghi dang tro toi `sourcePath` sang thang `targetPath`, nen chuoi
   * luon dai DUNG MOT chang.
   *
   * Nem `RedirectLoopError` neu source == target sau khi gop.
   */
  createCollapsingChain(input: CreateRedirectInput): Promise<Redirect>;

  /** Ghi de neu source da ton tai. Dung cho nhap hang loat tu website cu. */
  upsert(input: CreateRedirectInput): Promise<Redirect>;

  update(id: string, input: UpdateRedirectInput): Promise<Redirect>;

  delete(id: string): Promise<void>;

  /**
   * Tang bo dem. KHONG chan luong tra ve cho khach —
   * nguoi goi nen thuc thi ma khong `await`, hoac day sang hang doi.
   */
  recordHit(id: string, at: Date): Promise<void>;

  /** Nhap hang loat khi chuyen doi website cu. Bo qua source da co. */
  bulkInsert(rows: readonly CreateRedirectInput[]): Promise<number>;

  /**
   * Tim vong lap con sot trong toan bang — dung cho lenh kiem tra dinh ky.
   * Tra ve danh sach `sourcePath` nam trong mot vong.
   */
  findLoops(): Promise<string[]>;
}
