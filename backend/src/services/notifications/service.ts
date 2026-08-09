import type { DaoScope } from '../../dao/dao-scope.js';
import type { NotificationService } from './interface.js';

type NotificationDaos = DaoScope<'inquiries'>;

export class NotificationServiceImpl implements NotificationService {
  constructor(private readonly daos: NotificationDaos) {}

  async enqueuePasswordReset(recipient: string, token: string): Promise<void> {
    await this.daos.inquiries.enqueuePasswordReset({ recipient, token });
  }
}
