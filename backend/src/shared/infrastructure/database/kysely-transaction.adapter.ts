import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@ltv/db';
import type { Executor } from '../../application/executor.js';
import type { TransactionPort } from '../../application/transaction.port.js';
import { KYSELY_DB } from '../tokens.js';
import { toExecutor, toKysely } from './executor.js';

/** Adapter Kysely cho TransactionPort. Noi DUY NHAT biet Kysely mo transaction the nao. */
@Injectable()
export class KyselyTransactionAdapter implements TransactionPort {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async run<T>(fn: (ex: Executor) => Promise<T>, ex?: Executor): Promise<T> {
    // Tai su dung transaction dang co — cam long nhau (luat 3).
    if (ex && toKysely(ex) !== this.db) return fn(ex);
    return this.db.transaction().execute((trx) => fn(toExecutor(trx)));
  }
}
