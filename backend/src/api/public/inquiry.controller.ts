import { Body, Controller, Headers, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { InquiryAcceptedView } from '@ltv/contracts';
import type { Request } from 'express';
import type { z } from 'zod';
import { inquiryBodySchema } from '../dto/inquiry.dto.js';
import { DomainError } from '../../shared/errors.js';
import { INQUIRY_SERVICE, type InquiryService } from '../../services/inquiries/interface.js';
import { Public } from '../admin/auth.guard.js';
import { RateLimit } from '../admin/rate-limit.guard.js';

@Public()
@Controller()
export class InquiryController {
  constructor(@Inject(INQUIRY_SERVICE) private readonly inquiries: InquiryService) {}

  @RateLimit({ limit: 5, windowMs: 10 * 60_000, byIp: true })
  @Post('inquiries')
  @HttpCode(202)
  submit(
    @Body() body: unknown,
    @Headers('idempotency-key') headerKey: string | undefined,
    @Req() req: Request,
  ): Promise<InquiryAcceptedView> {
    const dto = parse(inquiryBodySchema, body);
    const fromHeader = headerKey?.trim();
    if (fromHeader && dto.request_id && fromHeader !== dto.request_id) {
      throw new DomainError(
        'IDEMPOTENCY_KEY_MISMATCH',
        'Idempotency-Key va request_id phai giong nhau',
      );
    }
    const idempotencyKey = fromHeader ?? dto.request_id;
    if (!idempotencyKey || !uuidPattern.test(idempotencyKey)) {
      throw new DomainError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'Can Idempotency-Key hop le hoac request_id trong body',
      );
    }
    return this.inquiries.submit({
      ...dto,
      idempotencyKey,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parse<S extends z.ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw new DomainError('VALIDATION_FAILED', 'Du lieu gui len khong hop le', 'VALIDATION_FAILED', {
    fields: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}
