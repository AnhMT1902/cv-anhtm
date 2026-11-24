import { Controller, Get, Header, Module, Query } from '@nestjs/common';
import { selectLocale } from './public-cv';
import { AdminAuth } from './admin-auth';
import { Database } from './database';
import { AdminController, Templates } from './templates';
import { CvContents } from './cv-content';
import { CvContentController } from './cv-content-controller';

@Controller('api/public/cv')
class PublicCvController {
  constructor(private readonly templates: Templates, private readonly content: CvContents) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getCv(@Query() query: Record<string, unknown>) {
    const cv = await this.content.published(selectLocale(query.lang));
    const template = await this.templates.current(cv);
    return template ? { ...cv, template } : cv;
  }
}

@Module({ controllers: [PublicCvController, AdminController, CvContentController], providers: [Database, Templates, AdminAuth, CvContents] })
export class AppModule {}
