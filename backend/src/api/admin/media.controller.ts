import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from '../../shared/errors.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import { MEDIA_SERVICE, type MediaService } from '../../services/media/interface.js';
import {
  mediaListQuerySchema,
  mediaPatchBodySchema,
  mediaUploadBodySchema,
} from '../dto/media.dto.js';
import type { AuthedRequest } from './auth.guard.js';
import { MediaUploadInterceptor } from './media-upload.interceptor.js';

@Controller('admin/media')
export class AdminMediaController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(MediaUploadInterceptor)
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    if (!file) throw new DomainError('MEDIA_FILE_REQUIRED', 'Can gui truong file');
    const dto = parse(mediaUploadBodySchema, body);
    return this.media.upload(
      {
        originalName: file.originalname,
        claimedMimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.alt_text !== undefined && { altText: dto.alt_text }),
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.credit !== undefined && { credit: dto.credit }),
      },
      req.principal!.userId,
    );
  }

  @Get()
  list(@Query() query: unknown) {
    const dto = parse(mediaListQuerySchema, query);
    return this.media.list({
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.mime_type !== undefined && { mimeType: dto.mime_type }),
      ...(dto.q !== undefined && { search: dto.q }),
      page: dto.page,
      pageSize: dto.page_size,
    });
  }

  @Get(':id')
  findById(@Param('id', UuidPipe) id: string) {
    return this.media.findById(id);
  }

  @Patch(':id')
  update(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    const dto = parse(mediaPatchBodySchema, body);
    return this.media.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.alt_text !== undefined && { altText: dto.alt_text }),
      ...(dto.caption !== undefined && { caption: dto.caption }),
      ...(dto.credit !== undefined && { credit: dto.credit }),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', UuidPipe) id: string, @Req() req: AuthedRequest): Promise<void> {
    return this.media.delete(id, req.principal!.userId);
  }
}

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new DomainError('VALIDATION_FAILED', 'Du lieu gui len khong hop le', 'VALIDATION_FAILED', {
    fields: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}
