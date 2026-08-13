import { Body, Controller, Inject, Post } from '@nestjs/common';
import { adminPublishCheckRequestSchema, type AdminPublishCheckView } from '@ltv/contracts';
import { PUBLISH_SERVICE, type PublishService } from '../../services/shared/publish.interface.js';
import { parseDto } from '../dto/parse.js';

@Controller('admin/publish-check')
export class AdminPublishController {
  constructor(@Inject(PUBLISH_SERVICE) private readonly publisher: PublishService) {}

  @Post()
  async check(@Body() body: unknown): Promise<AdminPublishCheckView> {
    const target = parseDto(adminPublishCheckRequestSchema, body);
    const result = await this.publisher.check({
      entity: target.entity,
      id: target.id,
      ...(target.locale !== undefined && { locale: target.locale }),
    });
    return result.ok ? { ok: true, blockers: [] } : result;
  }
}
