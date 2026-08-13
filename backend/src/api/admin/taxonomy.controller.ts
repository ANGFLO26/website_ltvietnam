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
} from '@nestjs/common';
import type { z } from 'zod';
import { page } from '../../shared/http/envelope.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import {
  ADMIN_TAXONOMY_SERVICE,
  type AdminTaxonomyFilter,
  type AdminTaxonomyKind,
  type AdminTaxonomyService,
  type AdminTaxonomyWrite,
} from '../../services/admin-taxonomy/interface.js';
import { toAdminView } from '../dto/admin-response.js';
import {
  adminDeleteQuerySchema,
  adminTaxonomyListQuerySchema,
  applicationCreateSchema,
  applicationPatchSchema,
  brandCreateSchema,
  brandPatchSchema,
  industryCreateSchema,
  industryPatchSchema,
  productCategoryCreateSchema,
  productCategoryPatchSchema,
  standardCreateSchema,
  standardPatchSchema,
} from '../dto/admin-taxonomy.dto.js';
import { parseDto } from '../dto/parse.js';

@Controller()
export class AdminTaxonomyController {
  constructor(@Inject(ADMIN_TAXONOMY_SERVICE) private readonly taxonomy: AdminTaxonomyService) {}

  @Get('admin/brands')
  listBrands(@Query() query: unknown) {
    return this.list('brand', query);
  }

  @Post('admin/brands')
  createBrand(@Body() body: unknown) {
    return this.create('brand', brandCreateSchema, body);
  }

  @Get('admin/brands/:id')
  findBrand(@Param('id', UuidPipe) id: string) {
    return this.find('brand', id);
  }

  @Patch('admin/brands/:id')
  updateBrand(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return this.update('brand', id, brandPatchSchema, body);
  }

  @Post('admin/brands/:id/publish')
  publishBrand(@Param('id', UuidPipe) id: string) {
    return this.publish('brand', id);
  }

  @Post('admin/brands/:id/hide')
  hideBrand(@Param('id', UuidPipe) id: string) {
    return this.hide('brand', id);
  }

  @Post('admin/brands/:id/restore')
  restoreBrand(@Param('id', UuidPipe) id: string) {
    return this.restore('brand', id);
  }

  @Delete('admin/brands/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBrand(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    return this.remove('brand', id, query);
  }

  @Get('admin/product-categories')
  listProductCategories(@Query() query: unknown) {
    return this.list('product_category', query);
  }

  @Post('admin/product-categories')
  createProductCategory(@Body() body: unknown) {
    return this.create('product_category', productCategoryCreateSchema, body);
  }

  @Get('admin/product-categories/:id')
  findProductCategory(@Param('id', UuidPipe) id: string) {
    return this.find('product_category', id);
  }

  @Patch('admin/product-categories/:id')
  updateProductCategory(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return this.update('product_category', id, productCategoryPatchSchema, body);
  }

  @Post('admin/product-categories/:id/publish')
  publishProductCategory(@Param('id', UuidPipe) id: string) {
    return this.publish('product_category', id);
  }

  @Post('admin/product-categories/:id/hide')
  hideProductCategory(@Param('id', UuidPipe) id: string) {
    return this.hide('product_category', id);
  }

  @Post('admin/product-categories/:id/restore')
  restoreProductCategory(@Param('id', UuidPipe) id: string) {
    return this.restore('product_category', id);
  }

  @Delete('admin/product-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProductCategory(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    return this.remove('product_category', id, query);
  }

  @Get('admin/standards')
  listStandards(@Query() query: unknown) {
    return this.list('standard', query);
  }

  @Post('admin/standards')
  createStandard(@Body() body: unknown) {
    return this.create('standard', standardCreateSchema, body);
  }

  @Get('admin/standards/:id')
  findStandard(@Param('id', UuidPipe) id: string) {
    return this.find('standard', id);
  }

  @Patch('admin/standards/:id')
  updateStandard(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return this.update('standard', id, standardPatchSchema, body);
  }

  @Post('admin/standards/:id/publish')
  publishStandard(@Param('id', UuidPipe) id: string) {
    return this.publish('standard', id);
  }

  @Post('admin/standards/:id/hide')
  hideStandard(@Param('id', UuidPipe) id: string) {
    return this.hide('standard', id);
  }

  @Post('admin/standards/:id/restore')
  restoreStandard(@Param('id', UuidPipe) id: string) {
    return this.restore('standard', id);
  }

  @Delete('admin/standards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStandard(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    return this.remove('standard', id, query);
  }

  @Get('admin/applications')
  listApplications(@Query() query: unknown) {
    return this.list('application', query);
  }

  @Post('admin/applications')
  createApplication(@Body() body: unknown) {
    return this.create('application', applicationCreateSchema, body);
  }

  @Get('admin/applications/:id')
  findApplication(@Param('id', UuidPipe) id: string) {
    return this.find('application', id);
  }

  @Patch('admin/applications/:id')
  updateApplication(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return this.update('application', id, applicationPatchSchema, body);
  }

  @Post('admin/applications/:id/publish')
  publishApplication(@Param('id', UuidPipe) id: string) {
    return this.publish('application', id);
  }

  @Post('admin/applications/:id/hide')
  hideApplication(@Param('id', UuidPipe) id: string) {
    return this.hide('application', id);
  }

  @Post('admin/applications/:id/restore')
  restoreApplication(@Param('id', UuidPipe) id: string) {
    return this.restore('application', id);
  }

  @Delete('admin/applications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteApplication(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    return this.remove('application', id, query);
  }

  @Get('admin/industries')
  listIndustries(@Query() query: unknown) {
    return this.list('industry', query);
  }

  @Post('admin/industries')
  createIndustry(@Body() body: unknown) {
    return this.create('industry', industryCreateSchema, body);
  }

  @Get('admin/industries/:id')
  findIndustry(@Param('id', UuidPipe) id: string) {
    return this.find('industry', id);
  }

  @Patch('admin/industries/:id')
  updateIndustry(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return this.update('industry', id, industryPatchSchema, body);
  }

  @Post('admin/industries/:id/publish')
  publishIndustry(@Param('id', UuidPipe) id: string) {
    return this.publish('industry', id);
  }

  @Post('admin/industries/:id/hide')
  hideIndustry(@Param('id', UuidPipe) id: string) {
    return this.hide('industry', id);
  }

  @Post('admin/industries/:id/restore')
  restoreIndustry(@Param('id', UuidPipe) id: string) {
    return this.restore('industry', id);
  }

  @Delete('admin/industries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteIndustry(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    return this.remove('industry', id, query);
  }

  private async list(kind: AdminTaxonomyKind, raw: unknown) {
    const dto = parseDto(adminTaxonomyListQuerySchema, raw);
    const filter: AdminTaxonomyFilter = {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.featured !== undefined && { isFeatured: dto.featured }),
      ...(dto.parent_id !== undefined && { parentId: dto.parent_id }),
      ...(dto.include_deleted && { includeDeleted: true }),
      ...(dto.organization !== undefined && { organization: dto.organization }),
      ...(dto.q !== undefined && { search: dto.q }),
    };
    const result = await this.taxonomy.list(kind, filter, {
      page: dto.page,
      pageSize: dto.page_size,
    });
    return page(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  private async create<S extends z.ZodTypeAny>(kind: AdminTaxonomyKind, schema: S, raw: unknown) {
    const dto = parseDto(schema, raw);
    return toAdminView(await this.taxonomy.create(kind, camelTop(dto)));
  }

  private async find(kind: AdminTaxonomyKind, id: string) {
    return toAdminView(await this.taxonomy.findById(kind, id));
  }

  private async update<S extends z.ZodTypeAny>(
    kind: AdminTaxonomyKind,
    id: string,
    schema: S,
    raw: unknown,
  ) {
    const dto = parseDto(schema, raw);
    return toAdminView(await this.taxonomy.update(kind, id, camelTop(dto)));
  }

  private async publish(kind: AdminTaxonomyKind, id: string) {
    return toAdminView(await this.taxonomy.publish(kind, id));
  }

  private async hide(kind: AdminTaxonomyKind, id: string) {
    return toAdminView(await this.taxonomy.hide(kind, id));
  }

  private async restore(kind: AdminTaxonomyKind, id: string) {
    return toAdminView(await this.taxonomy.restore(kind, id));
  }

  private async remove(kind: AdminTaxonomyKind, id: string, raw: unknown): Promise<void> {
    const dto = parseDto(adminDeleteQuerySchema, raw);
    await this.taxonomy.delete(kind, id, dto.hard);
  }
}

function camelTop(value: Record<string, unknown>): AdminTaxonomyWrite {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      item,
    ]),
  ) as AdminTaxonomyWrite;
}
