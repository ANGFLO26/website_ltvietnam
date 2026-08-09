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
import { page } from '../../shared/http/envelope.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import { ADMIN_SITE_SERVICE, type AdminSiteService } from '../../services/admin-site/interface.js';
import { adminDeleteQuerySchema } from '../dto/admin-taxonomy.dto.js';
import {
  bannerListSchema,
  bannerPatchSchema,
  bannerSchema,
  customerListSchema,
  customerPatchSchema,
  customerSchema,
  documentListSchema,
  documentPatchSchema,
  documentSchema,
  homepagePatchSchema,
  menuItemPatchSchema,
  menuItemSchema,
  menuPatchSchema,
  menuSchema,
  officeListSchema,
  officePatchSchema,
  officeSchema,
  reorderSchema,
} from '../dto/admin-site.dto.js';
import { toAdminView } from '../dto/admin-response.js';
import { parseDto } from '../dto/parse.js';

@Controller()
export class AdminSiteController {
  constructor(@Inject(ADMIN_SITE_SERVICE) private readonly site: AdminSiteService) {}

  @Get('admin/documents')
  async listDocuments(@Query() query: unknown) {
    const d = parseDto(documentListSchema, query);
    const r = await this.site.listDocuments(camelTop(withoutPage(d)), {
      page: d.page,
      pageSize: d.page_size,
    });
    return adminPage(r);
  }
  @Post('admin/documents')
  async createDocument(@Body() body: unknown) {
    return view(await this.site.createDocument(camelTop(parseDto(documentSchema, body)) as never));
  }
  @Get('admin/documents/:id')
  async findDocument(@Param('id', UuidPipe) id: string) {
    return view(await this.site.findDocument(id));
  }
  @Patch('admin/documents/:id')
  async updateDocument(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    return view(
      await this.site.updateDocument(id, camelTop(parseDto(documentPatchSchema, body)) as never),
    );
  }
  @Post('admin/documents/:id/publish')
  async publishDocument(@Param('id', UuidPipe) id: string) {
    return view(await this.site.publishDocument(id));
  }
  @Post('admin/documents/:id/hide')
  async hideDocument(@Param('id', UuidPipe) id: string) {
    return view(await this.site.hideDocument(id));
  }
  @Post('admin/documents/:id/restore')
  async restoreDocument(@Param('id', UuidPipe) id: string) {
    return view(await this.site.restoreDocument(id));
  }
  @Delete('admin/documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('id', UuidPipe) id: string, @Query() query: unknown) {
    await this.site.deleteDocument(id, parseDto(adminDeleteQuerySchema, query).hard);
  }

  @Get('admin/customers')
  async listCustomers(@Query() query: unknown) {
    const d = parseDto(customerListSchema, query);
    const filter = camelTop(withoutPage(d));
    if ('public' in filter) {
      filter.isPublic = filter.public;
      delete filter.public;
    }
    if ('featured' in filter) {
      filter.isFeatured = filter.featured;
      delete filter.featured;
    }
    return adminPage(
      await this.site.listCustomers(filter, { page: d.page, pageSize: d.page_size }),
    );
  }
  @Post('admin/customers') async createCustomer(@Body() b: unknown) {
    return view(await this.site.createCustomer(camelTop(parseDto(customerSchema, b)) as never));
  }
  @Get('admin/customers/:id') async findCustomer(@Param('id', UuidPipe) id: string) {
    return view(await this.site.findCustomer(id));
  }
  @Patch('admin/customers/:id') async updateCustomer(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
  ) {
    return view(
      await this.site.updateCustomer(id, camelTop(parseDto(customerPatchSchema, b)) as never),
    );
  }
  @Post('admin/customers/:id/publish') async publishCustomer(@Param('id', UuidPipe) id: string) {
    return view(await this.site.publishCustomer(id));
  }
  @Post('admin/customers/:id/hide') async hideCustomer(@Param('id', UuidPipe) id: string) {
    return view(await this.site.hideCustomer(id));
  }
  @Post('admin/customers/:id/restore') async restoreCustomer(@Param('id', UuidPipe) id: string) {
    return view(await this.site.restoreCustomer(id));
  }
  @Delete('admin/customers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(@Param('id', UuidPipe) id: string) {
    await this.site.deleteCustomer(id);
  }

  @Get('admin/offices') async listOffices(@Query() q: unknown) {
    return view(await this.site.listOffices(camelTop(parseDto(officeListSchema, q))));
  }
  @Post('admin/offices') async createOffice(@Body() b: unknown) {
    return view(await this.site.createOffice(camelTop(parseDto(officeSchema, b)) as never));
  }
  @Get('admin/offices/:id') async findOffice(@Param('id', UuidPipe) id: string) {
    return view(await this.site.findOffice(id));
  }
  @Patch('admin/offices/:id') async updateOffice(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
  ) {
    return view(
      await this.site.updateOffice(id, camelTop(parseDto(officePatchSchema, b)) as never),
    );
  }
  @Post('admin/offices/:id/publish') async publishOffice(@Param('id', UuidPipe) id: string) {
    return view(await this.site.publishOffice(id));
  }
  @Post('admin/offices/:id/hide') async hideOffice(@Param('id', UuidPipe) id: string) {
    return view(await this.site.hideOffice(id));
  }
  @Delete('admin/offices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOffice(@Param('id', UuidPipe) id: string) {
    await this.site.deleteOffice(id);
  }

  @Get('admin/banners') async listBanners(@Query() q: unknown) {
    return view(await this.site.listBanners(camelTop(parseDto(bannerListSchema, q))));
  }
  @Post('admin/banners') async createBanner(@Body() b: unknown) {
    return view(await this.site.createBanner(camelTop(parseDto(bannerSchema, b)) as never));
  }
  @Get('admin/banners/:id') async findBanner(@Param('id', UuidPipe) id: string) {
    return view(await this.site.findBanner(id));
  }
  @Patch('admin/banners/:id') async updateBanner(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
  ) {
    return view(
      await this.site.updateBanner(id, camelTop(parseDto(bannerPatchSchema, b)) as never),
    );
  }
  @Post('admin/banners/:id/publish') async publishBanner(@Param('id', UuidPipe) id: string) {
    return view(await this.site.publishBanner(id));
  }
  @Post('admin/banners/:id/hide') async hideBanner(@Param('id', UuidPipe) id: string) {
    return view(await this.site.hideBanner(id));
  }
  @Delete('admin/banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(@Param('id', UuidPipe) id: string) {
    await this.site.deleteBanner(id);
  }

  @Get('admin/homepage') async homepage() {
    return view(await this.site.homepage());
  }
  @Patch('admin/homepage/sections/:section_type')
  async updateHomepage(@Param('section_type', SlugPipe) sectionType: string, @Body() b: unknown) {
    return view(
      await this.site.updateHomepage({
        sectionType,
        ...camelTop(parseDto(homepagePatchSchema, b)),
      } as never),
    );
  }

  @Get('admin/menus') async listMenus() {
    return view(await this.site.listMenus());
  }
  @Post('admin/menus') async createMenu(@Body() b: unknown) {
    return view(await this.site.createMenu(parseDto(menuSchema, b)));
  }
  @Patch('admin/menus/:id') async updateMenu(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
  ) {
    return view(await this.site.updateMenu(id, parseDto(menuPatchSchema, b) as never));
  }
  @Delete('admin/menus/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMenu(@Param('id', UuidPipe) id: string) {
    await this.site.deleteMenu(id);
  }
  @Post('admin/menus/:menu_id/items')
  async addMenuItem(@Param('menu_id', UuidPipe) id: string, @Body() b: unknown) {
    return view(await this.site.addMenuItem(id, camelTop(parseDto(menuItemSchema, b)) as never));
  }
  @Patch('admin/menu-items/:id')
  async updateMenuItem(@Param('id', UuidPipe) id: string, @Body() b: unknown) {
    return view(
      await this.site.updateMenuItem(id, camelTop(parseDto(menuItemPatchSchema, b)) as never),
    );
  }
  @Delete('admin/menu-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMenuItem(@Param('id', UuidPipe) id: string) {
    await this.site.deleteMenuItem(id);
  }
  @Post('admin/menus/:menu_id/reorder')
  async reorderMenu(@Param('menu_id', UuidPipe) id: string, @Body() b: unknown) {
    return view(await this.site.reorderMenu(id, parseDto(reorderSchema, b).item_ids));
  }
}

function view(value: unknown) {
  return toAdminView(value);
}
function camelTop(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase()),
      v,
    ]),
  );
}
function withoutPage(value: Record<string, unknown>) {
  const rest = { ...value };
  delete rest.page;
  delete rest.page_size;
  return rest;
}
function adminPage<T>(r: {
  items: readonly T[];
  page: number;
  pageSize: number;
  totalItems: number;
}) {
  return page(r.items.map(toAdminView), {
    page: r.page,
    pageSize: r.pageSize,
    totalItems: r.totalItems,
  });
}
