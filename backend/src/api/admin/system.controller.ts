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
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import {
  ADMIN_REDIRECT_SERVICE,
  type AdminRedirectService,
} from '../../services/admin-redirects/interface.js';
import { SETTING_SERVICE, type SettingService } from '../../services/settings/interface.js';
import { USER_SERVICE, type UserService } from '../../services/users/interface.js';
import { toAdminView } from '../dto/admin-response.js';
import {
  redirectCreateSchema,
  redirectListQuerySchema,
  redirectPatchSchema,
  settingGroupPatchSchema,
  userCreateSchema,
  userListQuerySchema,
  userPatchSchema,
} from '../dto/admin-system.dto.js';
import { parseDto } from '../dto/parse.js';
import type { AuthedRequest } from './auth.guard.js';
import { NotFoundError } from '../../shared/errors.js';

@Controller()
export class AdminSystemController {
  constructor(
    @Inject(SETTING_SERVICE) private readonly settings: SettingService,
    @Inject(ADMIN_REDIRECT_SERVICE) private readonly redirects: AdminRedirectService,
    @Inject(USER_SERVICE) private readonly users: UserService,
  ) {}

  @Get('admin/settings')
  async listSettings() {
    return toAdminView(await this.settings.listAll());
  }

  @Get('admin/settings/:group')
  async getSettingGroup(@Param('group', SlugPipe) group: string) {
    return toAdminView(await this.settings.listGroup(group));
  }

  @Patch('admin/settings/:group')
  async updateSettingGroup(@Param('group', SlugPipe) group: string, @Body() body: unknown) {
    const dto = parseDto(settingGroupPatchSchema, body);
    return toAdminView(await this.settings.updateGroup(group, dto));
  }

  @Get('admin/redirects')
  async listRedirects(@Query() query: unknown) {
    const dto = parseDto(redirectListQuerySchema, query);
    const result = await this.redirects.list(
      {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.q !== undefined && { search: dto.q }),
        ...(dto.never_hit !== undefined && { neverHit: dto.never_hit }),
      },
      { page: dto.page, pageSize: dto.page_size },
    );
    return page(result.items.map(toAdminView), {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Post('admin/redirects')
  async createRedirect(@Body() body: unknown) {
    const dto = parseDto(redirectCreateSchema, body);
    return toAdminView(
      await this.redirects.create({
        sourcePath: dto.source_path,
        targetPath: dto.target_path,
        ...(dto.redirect_type !== undefined && { redirectType: dto.redirect_type }),
      }),
    );
  }

  @Get('admin/redirects/:id')
  async findRedirect(@Param('id', UuidPipe) id: string) {
    return toAdminView(await this.redirects.findById(id));
  }

  @Patch('admin/redirects/:id')
  async updateRedirect(@Param('id', UuidPipe) id: string, @Body() body: unknown) {
    const dto = parseDto(redirectPatchSchema, body);
    return toAdminView(
      await this.redirects.update(id, {
        ...(dto.target_path !== undefined && { targetPath: dto.target_path }),
        ...(dto.redirect_type !== undefined && { redirectType: dto.redirect_type }),
        ...(dto.status !== undefined && { status: dto.status }),
      }),
    );
  }

  @Delete('admin/redirects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRedirect(@Param('id', UuidPipe) id: string): Promise<void> {
    await this.redirects.delete(id);
  }

  @Get('admin/users')
  async listUsers(@Query() query: unknown) {
    const dto = parseDto(userListQuerySchema, query);
    const result = await this.users.list(
      {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.q !== undefined && { search: dto.q }),
      },
      { page: dto.page, pageSize: dto.page_size },
    );
    return page(result.items.map(toAdminView), {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Post('admin/users')
  async createUser(@Body() body: unknown) {
    const dto = parseDto(userCreateSchema, body);
    return toAdminView(await this.users.create(dto));
  }

  @Get('admin/users/:id')
  async findUser(@Param('id', UuidPipe) id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('USER_NOT_FOUND', `Khong tim thay nguoi dung ${id}`);
    return toAdminView(user);
  }

  @Patch('admin/users/:id')
  async updateUser(
    @Param('id', UuidPipe) id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    const dto = parseDto(userPatchSchema, body);
    return toAdminView(await this.users.setStatus(id, dto.status, req.principal!.userId));
  }
}
