import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '3mb' });
  await app.listen(Number(process.env.PORT ?? 3001), process.env.CV_HOST ?? '127.0.0.1');
}

void bootstrap();
