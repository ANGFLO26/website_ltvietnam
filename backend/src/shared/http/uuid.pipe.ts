import { Injectable, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../errors.js';

const uuid = z.string().uuid();

@Injectable()
export class UuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (uuid.safeParse(value).success) return value;
    throw new DomainError('INVALID_PATH_PARAM', 'ID khong dung dinh dang UUID');
  }
}
