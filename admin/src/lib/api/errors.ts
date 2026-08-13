export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(input: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly requestId?: string | null;
  }) {
    super(input.message);
    this.name = 'AdminApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId ?? null;
  }
}

export class AdminApiTimeoutError extends AdminApiError {
  constructor(timeoutMs: number) {
    super({ status: 504, code: 'API_TIMEOUT', message: `API không phản hồi sau ${timeoutMs} ms.` });
    this.name = 'AdminApiTimeoutError';
  }
}

export class AdminApiPayloadError extends AdminApiError {
  constructor(message: string) {
    super({ status: 502, code: 'API_PAYLOAD_INVALID', message });
    this.name = 'AdminApiPayloadError';
  }
}

export interface AdminFieldError {
  readonly field: string;
  readonly message: string;
}

export function fieldErrorsOf(error: unknown): readonly AdminFieldError[] {
  if (!(error instanceof AdminApiError) || !isRecord(error.details)) return [];
  const fields = error.details.fields;
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') {
      return [];
    }
    return [{ field: item.field, message: item.message }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
