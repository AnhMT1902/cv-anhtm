import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Injectable, NotFoundException, Param, Post, Put, Query, StreamableFile } from '@nestjs/common';
import { AdminAuth, sessionCookie } from './admin-auth';
import { Database } from './database';
import { selectLocale } from './public-cv';
import { CvContents } from './cv-content';
import type { RenderableCv } from './cv-content-model';
import { catalog, loadCatalogTemplate, previousSidebarId } from './template-catalog';
import { inspectTemplate, ZIP_LIMIT } from './template-package';
import { renderTemplate, templatePreview } from './template-render';
import { renderUpstreamSidebar, upstreamSidebar } from './sidebar-upstream';

@Injectable()
export class Templates {
  constructor(private readonly database: Database) {}

  async current(cv: RenderableCv) {
    if (!this.database.available) return undefined;
    const selected = await this.database.db.templateSelection.findUnique({
      where: { key: 'public' },
      include: { template: { select: { markup: true, css: true } } },
    });
    if (selected?.templateId === upstreamSidebar.id) return { document: await renderUpstreamSidebar(cv) };
    if (!selected?.template) return undefined;
    return { html: renderTemplate(selected.template.markup, cv), css: selected.template.css };
  }

  async get(id: string) {
    if (!uuid.test(id)) throw new NotFoundException('Không tìm thấy template.');
    const template = await this.database.db.template.findUnique({ where: { id } });
    if (template) return template;
    const shipped = catalog.find((item) => item.id === id);
    if (shipped) return loadCatalogTemplate(shipped);
    throw new NotFoundException('Không tìm thấy template.');
  }

  async activate(id: string) {
    const shipped = catalog.find((item) => item.id === id);
    const template = id === upstreamSidebar.id
      ? { ...upstreamSidebar, markup: '', css: '', archive: new Uint8Array() }
      : id === 'original' ? null : await this.get(id);
    const templateId = template?.id ?? null;
    await this.database.db.$transaction(async (database) => {
      if ((shipped || id === upstreamSidebar.id) && template) {
        const { name, markup, css, archive } = template;
        await database.template.upsert({
          where: { id }, create: { id, name, markup, css, archive }, update: {},
        });
      }
      await database.templateSelection.upsert({
        where: selection,
        create: { ...selection, templateId },
        update: { templateId },
      });
    });
    return { active: id };
  }
}

type Setup = { name: string; mapping: Record<string, string> };

function upload(body: { archive?: unknown; setup?: unknown } | undefined) {
  if (typeof body?.archive !== 'string' || body.archive.length > Math.ceil(ZIP_LIMIT / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(body.archive)) throw new BadRequestException('ZIP: cần tệp hợp lệ, tối đa 2 MiB.');
  let setup: Setup | undefined;
  if (body.setup !== undefined) {
    const value = body.setup as Partial<Setup> | null;
    if (!value || typeof value.name !== 'string' || !value.mapping || typeof value.mapping !== 'object' ||
        Array.isArray(value.mapping) || Object.keys(value.mapping).length > 6) throw new BadRequestException('Cấu hình gán mục không hợp lệ.');
    setup = { name: value.name, mapping: value.mapping };
  }
  return { archive: Buffer.from(body.archive, 'base64'), setup };
}

const selection = { key: 'public' };
const metadata = { id: true, name: true, createdAt: true } as const;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly database: Database,
    private readonly auth: AdminAuth,
    private readonly content: CvContents,
    private readonly templates: Templates,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { username?: unknown; password?: unknown }, @Headers('cookie') cookie: string | undefined) {
    const session = await this.auth.login(body);
    await this.auth.logout(cookie);
    return { session };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Headers('cookie') cookie: string | undefined) {
    await this.auth.logout(cookie);
    return { session: sessionCookie('', 0) };
  }

  @Get('templates')
  async list(@Headers('cookie') cookie: string | undefined) {
    await this.auth.require(cookie);
    const [templates, current] = await Promise.all([
      this.database.db.template.findMany({
        where: { id: { notIn: [upstreamSidebar.id, ...catalog.filter((item) => item.theme !== 'sidebar').map((item) => item.id)] } },
        select: metadata, orderBy: { createdAt: 'desc' },
      }),
      this.database.db.templateSelection.findUnique({ where: selection }),
    ]);
    return {
      templates: templates.map((item) => {
        if (item.id === previousSidebarId) return { ...item, name: 'Sidebar (bản trước)' };
        return item.id === catalog[0].id ? { ...item, name: 'Sidebar (bản dựng)' } : item;
      }),
      catalog: [upstreamSidebar, ...catalog.filter((item) => item.theme !== 'sidebar')],
      active: current?.templateId ?? 'original',
    };
  }

  @Get('templates/sample')
  async sample(@Headers('cookie') cookie: string | undefined) {
    await this.auth.require(cookie);
    const file = resolve(process.env.CV_TEMPLATE_SAMPLE ?? 'apps/backend/templates/start-bootstrap-resume.zip');
    return new StreamableFile(await readFile(file), { type: 'application/zip', disposition: 'attachment; filename="start-bootstrap-resume.zip"' });
  }

  @Post('templates/import')
  @HttpCode(200)
  async import(@Headers('cookie') cookie: string | undefined, @Body() body: { archive?: unknown; setup?: unknown; save?: unknown }) {
    await this.auth.require(cookie);
    const { archive, setup } = upload(body);
    let result;
    try {
      result = await inspectTemplate(archive, setup);
    } catch (error) {
      return { status: 'rejected', reason: error instanceof Error ? error.message : 'Không đọc được template.' };
    }
    if (result.status !== 'valid') return result;
    if (body.save !== true) return { status: 'valid', name: result.name };
    const template = await this.database.db.template.create({
      data: { id: randomUUID(), name: result.name, markup: result.markup, css: result.css, archive: new Uint8Array(result.archive) },
      select: metadata,
    });
    return { status: 'valid', template };
  }

  @Get('templates/:id/preview')
  async preview(@Headers('cookie') cookie: string | undefined, @Param('id') id: string, @Query('lang') lang: unknown) {
    await this.auth.require(cookie);
    const locale = selectLocale(lang);
    if (id === 'original') return { cv: await this.content.published(locale) };
    if (id === upstreamSidebar.id) return { document: await renderUpstreamSidebar(await this.content.published(locale)) };
    const template = await this.templates.get(id);
    return { document: templatePreview(template.name, template.css, template.markup, await this.content.published(locale)) };
  }

  @Get('templates/:id/export')
  async export(@Headers('cookie') cookie: string | undefined, @Param('id') id: string, @Query('lang') lang: unknown) {
    await this.auth.require(cookie);
    if (id === upstreamSidebar.id) {
      const locale = selectLocale(lang);
      const document = await renderUpstreamSidebar(await this.content.published(locale));
      return new StreamableFile(Buffer.from(document), {
        type: 'text/html; charset=utf-8', disposition: `attachment; filename="sidebar-${locale}.html"`,
      });
    }
    const template = await this.templates.get(id);
    return new StreamableFile(Buffer.from(template.archive), { type: 'application/zip', disposition: 'attachment; filename="cv-template.zip"' });
  }

  @Put('templates/:id/active')
  async activate(@Headers('cookie') cookie: string | undefined, @Param('id') id: string) {
    await this.auth.require(cookie);
    return this.templates.activate(id);
  }
}
