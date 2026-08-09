import { Injectable, type PipeTransform } from '@nestjs/common';
import { NotFoundError } from '../errors.js';

/** Kiem wildcard cua `/media/*`; chi cho duong tuong doi khong traversal. */
@Injectable()
export class MediaPathPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') throw notFound();
    const clean = value.replace(/^\/+/, '');
    if (
      !clean ||
      clean.includes('\\') ||
      clean.includes('\0') ||
      clean.split('/').some((part) => !part || part === '.' || part === '..')
    )
      throw notFound();
    return clean;
  }
}

function notFound(): NotFoundError {
  return new NotFoundError('MEDIA_NOT_FOUND', 'Khong tim thay tep media');
}
