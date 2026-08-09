export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

export interface NotificationService {
  enqueuePasswordReset(recipient: string, token: string): Promise<void>;
}
