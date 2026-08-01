/**
 * Loi nghiep vu — tang DOMAIN.
 *
 * Tang nay KHONG duoc import bat cu gi tu application, infrastructure hay
 * presentation. No khong biet HTTP, khong biet SQL, khong biet Nest.
 * Exception filter o tang ha tang se dich sang ma HTTP.
 */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL';

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: ErrorCode = 'VALIDATION_FAILED',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 'NOT_FOUND');
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 'CONFLICT', details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code = 'AUTH_INVALID_CREDENTIALS', message = 'Thong tin dang nhap khong dung') {
    super(code, message, 'UNAUTHORIZED');
  }
}

export class DependencyUnavailableError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 'DEPENDENCY_UNAVAILABLE');
  }
}
