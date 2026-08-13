import type { PageMetaView } from '@ltv/contracts';
import { AdminApiError, AdminApiPayloadError } from './errors';

export interface AdminPage<T> {
  readonly data: readonly T[];
  readonly meta: PageMetaView;
}

export function decodeData<T>(payload: unknown): T {
  if (!isRecord(payload) || !Object.hasOwn(payload, 'data')) {
    throw new AdminApiPayloadError('Phản hồi API thiếu data envelope.');
  }
  return payload.data as T;
}

export function decodePage<T>(payload: unknown): AdminPage<T> {
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isPageMeta(payload.meta)) {
    throw new AdminApiPayloadError('Phản hồi phân trang không hợp lệ.');
  }
  return { data: payload.data as readonly T[], meta: payload.meta };
}

export function errorFromPayload(status: number, payload: unknown): AdminApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const error = payload.error;
    return new AdminApiError({
      status,
      code: typeof error.code === 'string' ? error.code : 'API_REQUEST_FAILED',
      message: typeof error.message === 'string' ? error.message : `Yêu cầu thất bại (${status}).`,
      details: error.details,
      requestId: typeof error.request_id === 'string' ? error.request_id : null,
    });
  }
  return new AdminApiError({
    status,
    code: 'API_REQUEST_FAILED',
    message: `Yêu cầu thất bại (${status}).`,
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageMeta(value: unknown): value is PageMetaView {
  if (!isRecord(value)) return false;
  return ['page', 'page_size', 'total_items', 'total_pages'].every(
    (key) => typeof value[key] === 'number' && Number.isInteger(value[key]) && value[key] >= 0,
  );
}
