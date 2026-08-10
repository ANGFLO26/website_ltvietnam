export function createInquiryRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('This browser cannot create a secure inquiry request identifier');
  }
  return globalThis.crypto.randomUUID();
}
