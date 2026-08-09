import { Body, Controller, Get, Inject, Param, Patch, Query, Req } from '@nestjs/common';
import type { InquiryView } from '@ltv/contracts';
import type { z } from 'zod';
import { DomainError } from '../../shared/errors.js';
import type { Page } from '../../shared/http/envelope.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import { INQUIRY_SERVICE, type InquiryService } from '../../services/inquiries/interface.js';
import { handledBodySchema, inquiryListQuerySchema } from '../dto/inquiry.dto.js';
import type { AuthedRequest } from './auth.guard.js';

@Controller('admin/inquiries')
export class AdminInquiryController {
  constructor(@Inject(INQUIRY_SERVICE) private readonly inquiries: InquiryService) {}

  @Get()
  list(@Query() query: unknown): Promise<Page<InquiryView>> {
    const dto = parse(inquiryListQuerySchema, query);
    return this.inquiries.list(
      {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.handled !== undefined && { handled: dto.handled }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
      { page: dto.page, pageSize: dto.page_size },
    );
  }

  @Get(':id')
  findById(@Param('id', UuidPipe) id: string): Promise<InquiryView> {
    return this.inquiries.findById(id);
  }

  @Patch(':id/handled')
  async markHandled(
    @Param('id', UuidPipe) id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ): Promise<InquiryView> {
    parse(handledBodySchema, body);
    return this.inquiries.markHandled(id, req.principal!.userId);
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
