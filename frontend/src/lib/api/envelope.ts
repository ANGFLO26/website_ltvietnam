import type { PageMetaView } from '@ltv/contracts';
import { ApiError, ApiPayloadError } from './errors';

export interface PagedData<T> {
  readonly data: readonly T[];
  readonly meta: PageMetaView;
}

/**
 * Bien kieu DUY NHAT cua API. Ta kiem hinh dang vo o runtime; contract dung
 * chung chiu trach nhiem cho hinh dang `data` ben trong.
 */
export function decodeDataEnvelope<T>(payload: unknown): T {
  if (!isRecord(payload) || !Object.hasOwn(payload, 'data')) {
    throw new ApiPayloadError('API response is missing the data envelope');
  }
  return payload.data as T;
}

export function decodePageEnvelope<T>(payload: unknown): PagedData<T> {
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isPageMeta(payload.meta)) {
    throw new ApiPayloadError('API response has an invalid pagination envelope');
  }
  return { data: payload.data as readonly T[], meta: payload.meta };
}

export function apiErrorFromPayload(status: number, payload: unknown): ApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const error = payload.error;
    return new ApiError({
      status,
      code: typeof error.code === 'string' ? error.code : 'API_REQUEST_FAILED',
      message: typeof error.message === 'string' ? error.message : `API request failed (${status})`,
      details: error.details,
      requestId: typeof error.request_id === 'string' ? error.request_id : null,
    });
  }
  return new ApiError({
    status,
    code: 'API_REQUEST_FAILED',
    message: `API request failed (${status})`,
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageMeta(value: unknown): value is PageMetaView {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.page) &&
    isNonNegativeInteger(value.page_size) &&
    isNonNegativeInteger(value.total_items) &&
    isNonNegativeInteger(value.total_pages)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
