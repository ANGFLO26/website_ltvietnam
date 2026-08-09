import { z } from 'zod';
import { DomainError } from '../../shared/errors.js';

/**
 * Query strings arrive as text. `z.coerce.boolean()` must not be used here:
 * JavaScript considers every non-empty string truthy, including `"false"`.
 * Keep the accepted wire values explicit so `?hard=false` can never become a
 * destructive hard-delete request.
 */
export const queryBooleanSchema = z.preprocess((value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}, z.boolean());

export function parseDto<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new DomainError('VALIDATION_FAILED', 'Du lieu gui len khong hop le', 'VALIDATION_FAILED', {
    fields: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}
