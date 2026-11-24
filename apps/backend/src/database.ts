import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

@Injectable()
export class Database implements OnModuleDestroy {
  private readonly client = process.env.DATABASE_URL
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
    : undefined;

  get available() {
    return this.client !== undefined;
  }

  get db() {
    if (!this.client) throw new ServiceUnavailableException('PostgreSQL chưa được cấu hình.');
    return this.client;
  }

  async onModuleDestroy() {
    await this.client?.$disconnect();
  }
}
