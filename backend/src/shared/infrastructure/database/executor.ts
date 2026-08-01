import type { Kysely, Transaction } from 'kysely';
import type { Database } from '@ltv/db';
import type { Executor } from '../../application/executor.js';

/**
 * Cau noi giua kieu mo `Executor` cua tang ung dung va Kysely that.
 *
 * Day la NOI DUY NHAT ep kieu. Moi repository goi `toKysely(ex)` mot lan
 * o dau phuong thuc, sau do lam viec voi kieu day du.
 */
export type KyselyExecutor = Kysely<Database> | Transaction<Database>;

export const toKysely = (ex: Executor): KyselyExecutor => ex as unknown as KyselyExecutor;
export const toExecutor = (db: KyselyExecutor): Executor => db as unknown as Executor;
