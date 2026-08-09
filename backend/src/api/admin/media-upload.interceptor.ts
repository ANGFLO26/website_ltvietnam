import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { AppConfig } from '@ltv/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { APP_CONFIG } from '../../shared/tokens.js';

/** Multer chan kich thuoc ngay khi doc multipart, truoc khi buffer day vao RAM. */
@Injectable()
export class MediaUploadInterceptor implements NestInterceptor {
  private readonly delegate: NestInterceptor;

  constructor(@Inject(APP_CONFIG) cfg: AppConfig) {
    const Interceptor = FileInterceptor('file', {
      limits: {
        fileSize: cfg.MEDIA_MAX_UPLOAD_BYTES,
        files: 1,
        fields: 5,
        parts: 6,
        fieldNameSize: 100,
        fieldSize: 4_096,
      },
    });
    this.delegate = new Interceptor();
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    return this.delegate.intercept(context, next);
  }
}
