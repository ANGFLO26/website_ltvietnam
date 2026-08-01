/**
 * Ranh gioi transaction giua cac service (doc/06).
 *
 * `Executor` la kieu MO — tang ung dung khong biet ben trong no la gi.
 * Khong import Kysely, khong import pg. Doi cong nghe truy cap du lieu thi
 * chu ky cua moi service GIU NGUYEN; chi adapter o tang ha tang phai sua.
 *
 * (Ban dau toi dinh nghia `Executor = Kysely<Database> | Transaction<Database>`.
 *  Test kien truc bat duoc ngay: tang ung dung khong duoc biet driver.)
 *
 * LUAT:
 *   1. Moi phuong thuc cua Repository va Service co the tham gia transaction
 *      nhan `Executor` lam THAM SO DAU TIEN.
 *   2. Chi service SO HUU use case moi duoc mo transaction.
 *   3. Cam long transaction.
 *   4. Cam giu transaction mo trong luc goi mang ra ngoai (D6).
 */
declare const executorBrand: unique symbol;

/** Tay cam transaction. Chi tang ha tang biet ben trong la gi. */
export interface Executor {
  readonly [executorBrand]: true;
}
