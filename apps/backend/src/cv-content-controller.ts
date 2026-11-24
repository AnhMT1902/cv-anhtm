import { Body, Controller, Get, Headers, HttpCode, Param, Post, Put } from '@nestjs/common';
import { AdminAuth } from './admin-auth';
import { CvContents } from './cv-content';
import { snapshot, validateDraft } from './cv-content-model';
import { selectLocale } from './public-cv';
import { Templates } from './templates';

@Controller('api/admin/content')
export class CvContentController {
  constructor(private readonly auth: AdminAuth, private readonly content: CvContents, private readonly templates: Templates) {}

  @Get()
  async get(@Headers('cookie') cookie: string | undefined) {
    await this.auth.require(cookie);
    return this.content.get();
  }

  @Put()
  async save(@Headers('cookie') cookie: string | undefined, @Body() body: { draft?: unknown; revision?: unknown }) {
    await this.auth.require(cookie);
    return this.content.save(body?.revision, body?.draft);
  }

  @Get(':locale/preview')
  async preview(@Headers('cookie') cookie: string | undefined, @Param('locale') locale: string) {
    await this.auth.require(cookie);
    const cv = await this.content.preview(selectLocale(locale));
    const template = await this.templates.current(cv);
    return template ? { ...cv, template } : cv;
  }

  @Post(':locale/preview')
  @HttpCode(200)
  async previewUnsaved(@Headers('cookie') cookie: string | undefined, @Param('locale') locale: string, @Body() body: { draft?: unknown }) {
    await this.auth.require(cookie);
    const cv = snapshot(validateDraft(body?.draft), selectLocale(locale));
    const template = await this.templates.current(cv);
    return template ? { ...cv, template } : cv;
  }

  @Post(':locale/publish')
  @HttpCode(200)
  async publish(@Headers('cookie') cookie: string | undefined, @Param('locale') locale: string, @Body() body: { revision?: unknown }) {
    await this.auth.require(cookie);
    return this.content.publish(selectLocale(locale), body?.revision);
  }

  @Post('publish')
  @HttpCode(200)
  async publishBoth(@Headers('cookie') cookie: string | undefined, @Body() body: { draft?: unknown; revision?: unknown }) {
    await this.auth.require(cookie);
    return this.content.publishBoth(body?.revision, body?.draft);
  }
}
