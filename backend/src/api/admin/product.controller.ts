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
} from '@nestjs/common';
import { page } from '../../shared/http/envelope.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import {
  ADMIN_PRODUCT_SERVICE,
  type AdminProductCreate,
  type AdminProductService,
  type AdminProductWrite,
} from '../../services/admin-products/interface.js';
import { adminDeleteQuerySchema } from '../dto/admin-taxonomy.dto.js';
import {
  adminProductCreateSchema,
  adminProductListQuerySchema,
  adminProductPatchSchema,
} from '../dto/admin-product.dto.js';
import { toAdminView } from '../dto/admin-response.js';
import { parseDto } from '../dto/parse.js';
import type { AuthedRequest } from './auth.guard.js';

@Controller('admin/products')
export class AdminProductController {
  constructor(@Inject(ADMIN_PRODUCT_SERVICE) private readonly products: AdminProductService) {}

  @Get()
  async list(@Query() query: unknown) {
    const dto = parseDto(adminProductListQuerySchema, query);
    const result = await this.products.list(
      {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.brand_id !== undefined && { brandId: dto.brand_id }),
        ...(dto.category_id !== undefined && { categoryId: dto.category_id }),
        ...(dto.q !== undefined && { search: dto.q }),
        ...(dto.include_deleted && { includeDeleted: true }),
      },
      { page: dto.page, pageSize: dto.page_size },
    );
    return page(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: AuthedRequest) {
    const dto = parseDto(adminProductCreateSchema, body);
    return toAdminView(
      await this.products.create(productWrite(dto) as AdminProductCreate, req.principal!.userId),
    );
  }

  @Get(':id')
  async findById(@Param('id', UuidPipe) id: string) {
    return toAdminView(await this.products.findById(id));
  }

  @Patch(':id')
  async update(
    @Param('id', UuidPipe) id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    const dto = parseDto(adminProductPatchSchema, body);
    return toAdminView(await this.products.update(id, productWrite(dto), req.principal!.userId));
  }

  @Post(':id/publish')
  async publish(@Param('id', UuidPipe) id: string) {
    return toAdminView(await this.products.publish(id));
  }

  @Post(':id/hide')
  async hide(@Param('id', UuidPipe) id: string) {
    return toAdminView(await this.products.hide(id));
  }

  @Post(':id/restore')
  async restore(@Param('id', UuidPipe) id: string) {
    return toAdminView(await this.products.restore(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', UuidPipe) id: string, @Query() query: unknown): Promise<void> {
    const dto = parseDto(adminDeleteQuerySchema, query);
    await this.products.delete(id, dto.hard);
  }
}

const RELATION_FIELDS = new Set([
  'categories',
  'standards',
  'applications',
  'industries',
  'media',
  'related_products',
  'specifications',
]);

function productWrite(value: Record<string, unknown>): AdminProductWrite {
  const entries = Object.entries(value).map(([key, item]) => {
    const camelKey = camel(key);
    if (RELATION_FIELDS.has(key) && Array.isArray(item)) {
      return [camelKey, item.map((row) => camelTop(row as Record<string, unknown>))];
    }
    return [camelKey, item];
  });
  return Object.fromEntries(entries) as AdminProductWrite;
}

function camelTop(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [camel(key), item]));
}

function camel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
