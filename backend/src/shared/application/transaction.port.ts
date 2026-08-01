import type { Executor } from './executor.js';

export const TRANSACTION_PORT = Symbol('TRANSACTION_PORT');

/**
 * Cong ra cho viec mo transaction.
 *
 * Tang ung dung phu thuoc interface nay, khong phu thuoc Kysely.
 */
export interface TransactionPort {
  /**
   * Chay `fn` trong mot transaction.
   *
   * Neu `ex` da la transaction thi TAI SU DUNG, khong mo long — dam bao luat 3.
   */
  run<T>(fn: (ex: Executor) => Promise<T>, ex?: Executor): Promise<T>;
}
