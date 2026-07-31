import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Moi request co X-Request-ID; tu sinh neu client khong gui (doc/06 PHAN XIII). */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
