import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError, type ErrorCode } from '../errors.js';
import { createLogger } from '../logging/logger.js';

/**
 * Error envelope chuan (doc/06 PHAN X / A24):
 *   { "error": { "code", "message", "details", "request_id" } }
 *
 * Dich loi DOMAIN sang ma HTTP. Tang domain khong biet HTTP; anh xa nam o day.
 */
const HTTP_BY_KIND: Record<ErrorCode, HttpStatus> = {
  VALIDATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  DEPENDENCY_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
};

const log = createLogger('info', { scope: 'http' });

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Da co loi xay ra.';
    let details: unknown = null;

    if (exception instanceof DomainError) {
      status = HTTP_BY_KIND[exception.kind];
      code = exception.code;
      message = exception.message;
      details = exception.details ?? null;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code =
        typeof body === 'object' && body && 'code' in body
          ? String((body as { code: unknown }).code)
          : httpCodeName(status);
      message = exception.message;
      if (typeof body === 'object' && body && 'message' in body) {
        details = (body as { message: unknown }).message;
      }
    } else {
      // Loi khong luong truoc: KHONG lo chi tiet noi bo ra ngoai.
      log.error('unhandled_exception', {
        request_id: requestId,
        path: req.path,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack?.split('\n').slice(0, 4) : undefined,
      });
    }

    res.status(status).json({ error: { code, message, details, request_id: requestId } });
  }
}

function httpCodeName(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_FAILED',
    429: 'RATE_LIMITED',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'INTERNAL_ERROR';
}
