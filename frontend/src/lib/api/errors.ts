export interface ApiErrorDetails {
  readonly [key: string]: unknown;
}

export class ApiError extends Error {
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
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId ?? null;
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(timeoutMs: number) {
    super({
      status: 504,
      code: 'API_TIMEOUT',
      message: `API request exceeded ${timeoutMs}ms`,
    });
    this.name = 'ApiTimeoutError';
  }
}

export class ApiPayloadError extends ApiError {
  constructor(message: string) {
    super({ status: 502, code: 'API_PAYLOAD_INVALID', message });
    this.name = 'ApiPayloadError';
  }
}

export function isApiNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}
