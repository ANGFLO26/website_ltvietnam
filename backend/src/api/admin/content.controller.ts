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
import { z } from 'zod';
import { page } from '../../shared/http/envelope.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { UuidPipe } from '../../shared/http/uuid.pipe.js';
import {
  ADMIN_CONTENT_SERVICE,
  type AdminContentKind,
  type AdminContentService,
} from '../../services/admin-content/interface.js';
import { adminDeleteQuerySchema } from '../dto/admin-taxonomy.dto.js';
import {
  contentListSchema,
  pageCreateSchema,
  pagePatchSchema,
  pageTranslationSchema,
  postCategoryCreateSchema,
  postCategoryPatchSchema,
  postCreateSchema,
  postPatchSchema,
  postTranslationSchema,
  projectCreateSchema,
  projectPatchSchema,
  projectTranslationSchema,
  serviceCreateSchema,
  servicePatchSchema,
  serviceTranslationSchema,
} from '../dto/admin-content.dto.js';
import { toAdminView } from '../dto/admin-response.js';
import { parseDto } from '../dto/parse.js';
import type { AuthedRequest } from './auth.guard.js';

@Controller()
export class AdminContentController {
  constructor(@Inject(ADMIN_CONTENT_SERVICE) private readonly content: AdminContentService) {}

  @Get('admin/services') listServices(@Query() q: unknown) {
    return this.list('service', q);
  }
  @Post('admin/services') createService(@Body() b: unknown, @Req() r: AuthedRequest) {
    return this.create('service', serviceCreateSchema, b, r);
  }
  @Get('admin/services/:id') findService(@Param('id', UuidPipe) id: string) {
    return this.find('service', id);
  }
  @Patch('admin/services/:id') updateService(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
    @Req() r: AuthedRequest,
  ) {
    return this.update('service', id, servicePatchSchema, b, r);
  }
  @Patch('admin/services/:id/translations/:locale') translationService(
    @Param('id', UuidPipe) id: string,
    @Param('locale', SlugPipe) l: string,
    @Body() b: unknown,
  ) {
    return this.translation('service', id, l, serviceTranslationSchema, b);
  }
  @Post('admin/services/:id/restore') restoreService(@Param('id', UuidPipe) id: string) {
    return this.restore('service', id);
  }
  @Delete('admin/services/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteService(
    @Param('id', UuidPipe) id: string,
    @Query() q: unknown,
  ) {
    return this.remove('service', id, q);
  }

  @Get('admin/projects') listProjects(@Query() q: unknown) {
    return this.list('project', q);
  }
  @Post('admin/projects') createProject(@Body() b: unknown, @Req() r: AuthedRequest) {
    return this.create('project', projectCreateSchema, b, r);
  }
  @Get('admin/projects/:id') findProject(@Param('id', UuidPipe) id: string) {
    return this.find('project', id);
  }
  @Patch('admin/projects/:id') updateProject(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
    @Req() r: AuthedRequest,
  ) {
    return this.update('project', id, projectPatchSchema, b, r);
  }
  @Patch('admin/projects/:id/translations/:locale') translationProject(
    @Param('id', UuidPipe) id: string,
    @Param('locale', SlugPipe) l: string,
    @Body() b: unknown,
  ) {
    return this.translation('project', id, l, projectTranslationSchema, b);
  }
  @Post('admin/projects/:id/restore') restoreProject(@Param('id', UuidPipe) id: string) {
    return this.restore('project', id);
  }
  @Delete('admin/projects/:id') @HttpCode(HttpStatus.NO_CONTENT) deleteProject(
    @Param('id', UuidPipe) id: string,
    @Query() q: unknown,
  ) {
    return this.remove('project', id, q);
  }

  @Get('admin/posts') listPosts(@Query() q: unknown) {
    return this.list('post', q);
  }
  @Post('admin/posts') createPost(@Body() b: unknown, @Req() r: AuthedRequest) {
    return this.create('post', postCreateSchema, b, r);
  }
  @Get('admin/posts/:id') findPost(@Param('id', UuidPipe) id: string) {
    return this.find('post', id);
  }
  @Patch('admin/posts/:id') updatePost(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
    @Req() r: AuthedRequest,
  ) {
    return this.update('post', id, postPatchSchema, b, r);
  }
  @Patch('admin/posts/:id/translations/:locale') translationPost(
    @Param('id', UuidPipe) id: string,
    @Param('locale', SlugPipe) l: string,
    @Body() b: unknown,
  ) {
    return this.translation('post', id, l, postTranslationSchema, b);
  }
  @Post('admin/posts/:id/restore') restorePost(@Param('id', UuidPipe) id: string) {
    return this.restore('post', id);
  }
  @Delete('admin/posts/:id') @HttpCode(HttpStatus.NO_CONTENT) deletePost(
    @Param('id', UuidPipe) id: string,
    @Query() q: unknown,
  ) {
    return this.remove('post', id, q);
  }

  @Get('admin/pages') listPages(@Query() q: unknown) {
    return this.list('page', q);
  }
  @Post('admin/pages') createPage(@Body() b: unknown, @Req() r: AuthedRequest) {
    return this.create('page', pageCreateSchema, b, r);
  }
  @Get('admin/pages/:id') findPage(@Param('id', UuidPipe) id: string) {
    return this.find('page', id);
  }
  @Patch('admin/pages/:id') updatePage(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
    @Req() r: AuthedRequest,
  ) {
    return this.update('page', id, pagePatchSchema, b, r);
  }
  @Patch('admin/pages/:id/translations/:locale') translationPage(
    @Param('id', UuidPipe) id: string,
    @Param('locale', SlugPipe) l: string,
    @Body() b: unknown,
  ) {
    return this.translation('page', id, l, pageTranslationSchema, b);
  }
  @Post('admin/pages/:id/restore') restorePage(@Param('id', UuidPipe) id: string) {
    return this.restore('page', id);
  }
  @Delete('admin/pages/:id') @HttpCode(HttpStatus.NO_CONTENT) deletePage(
    @Param('id', UuidPipe) id: string,
    @Query() q: unknown,
  ) {
    return this.remove('page', id, q);
  }

  @Get('admin/post-categories') async listPostCategories(@Query() q: unknown) {
    const d = parseDto(contentListSchema, q);
    return adminPage(
      await this.content.listPostCategories(filter(d), { page: d.page, pageSize: d.page_size }),
    );
  }
  @Post('admin/post-categories') async createPostCategory(@Body() b: unknown) {
    return view(
      await this.content.createPostCategory(write(parseDto(postCategoryCreateSchema, b))),
    );
  }
  @Get('admin/post-categories/:id') async findPostCategory(@Param('id', UuidPipe) id: string) {
    return view(await this.content.findPostCategory(id));
  }
  @Patch('admin/post-categories/:id') async updatePostCategory(
    @Param('id', UuidPipe) id: string,
    @Body() b: unknown,
  ) {
    return view(
      await this.content.updatePostCategory(id, write(parseDto(postCategoryPatchSchema, b))),
    );
  }
  @Post('admin/post-categories/:id/publish') async publishPostCategory(
    @Param('id', UuidPipe) id: string,
  ) {
    return view(await this.content.publishPostCategory(id));
  }
  @Post('admin/post-categories/:id/hide') async hidePostCategory(
    @Param('id', UuidPipe) id: string,
  ) {
    return view(await this.content.hidePostCategory(id));
  }
  @Post('admin/post-categories/:id/restore') async restorePostCategory(
    @Param('id', UuidPipe) id: string,
  ) {
    return view(await this.content.restorePostCategory(id));
  }
  @Delete('admin/post-categories/:id') @HttpCode(HttpStatus.NO_CONTENT) async deletePostCategory(
    @Param('id', UuidPipe) id: string,
    @Query() q: unknown,
  ) {
    await this.content.deletePostCategory(id, parseDto(adminDeleteQuerySchema, q).hard);
  }

  private async list(k: AdminContentKind, q: unknown) {
    const d = parseDto(contentListSchema, q);
    return adminPage(
      await this.content.list(k, filter(d), { page: d.page, pageSize: d.page_size }),
    );
  }
  private async create(k: AdminContentKind, s: z.ZodTypeAny, b: unknown, r: AuthedRequest) {
    return view(await this.content.create(k, write(parseDto(s, b)), r.principal!.userId));
  }
  private async find(k: AdminContentKind, id: string) {
    return view(await this.content.findById(k, id));
  }
  private async update(
    k: AdminContentKind,
    id: string,
    s: z.ZodTypeAny,
    b: unknown,
    r: AuthedRequest,
  ) {
    return view(await this.content.update(k, id, write(parseDto(s, b)), r.principal!.userId));
  }
  private async translation(
    k: AdminContentKind,
    id: string,
    l: string,
    s: z.ZodTypeAny,
    b: unknown,
  ) {
    const locale = parseDto(z.enum(['vi', 'en']), l);
    return view(await this.content.upsertTranslation(k, id, locale, write(parseDto(s, b))));
  }
  private async restore(k: AdminContentKind, id: string) {
    return view(await this.content.restore(k, id));
  }
  private async remove(k: AdminContentKind, id: string, q: unknown) {
    await this.content.delete(k, id, parseDto(adminDeleteQuerySchema, q).hard);
  }
}
function write(v: Record<string, unknown>) {
  const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [camel(k), x]));
  if (Array.isArray(o.media))
    o.media = o.media.map((x) =>
      typeof x === 'object' && x
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [camel(k), v]))
        : x,
    );
  return o;
}
function camel(k: string) {
  return k.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase());
}
function filter(d: Record<string, unknown>) {
  const r = { ...d };
  const featured = r.featured;
  delete r.page;
  delete r.page_size;
  delete r.featured;
  return { ...write(r), ...(featured !== undefined && { isFeatured: featured }) };
}
function view(v: unknown) {
  return toAdminView(v);
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
