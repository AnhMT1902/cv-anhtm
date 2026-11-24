import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { initialDraft, publicationErrors, snapshot, validateDraft, type Draft, type RenderableCv, type CvSnapshot } from './cv-content-model';
import { Database } from './database';
import { publicCv, type Locale } from './public-cv';

const where = { key: 'main' };
type Published = { cv: CvSnapshot; at: string | null };

@Injectable()
export class CvContents {
  constructor(private readonly database: Database) {}

  private async row() {
    const row = await this.database.db.cvContent.findUnique({ where });
    if (row) return row;
    const draft = initialDraft();
    return this.database.db.cvContent.upsert({
      where, update: {},
      create: {
        ...where, draft,
        publishedVi: { cv: { ...snapshot(draft, 'vi'), sample: true }, at: null },
        publishedEn: { cv: { ...snapshot(draft, 'en'), sample: true }, at: null },
      },
    });
  }

  private async replace(revision: number, data: { draft?: Draft; publishedVi?: Published; publishedEn?: Published }) {
    const result = await this.database.db.cvContent.updateMany({
      where: { ...where, revision }, data: { ...data, revision: { increment: 1 } },
    });
    if (!result.count) throw new ConflictException('Nội dung đã đổi ở phiên khác. Tải lại bản nháp trước khi tiếp tục.');
  }

  async get() {
    const row = await this.row();
    return {
      draft: row.draft as Draft,
      revision: row.revision,
      published: { vi: (row.publishedVi as Published).at, en: (row.publishedEn as Published).at },
    };
  }

  async save(revision: unknown, draft: unknown) {
    const version = this.version(revision);
    const next = validateDraft(draft);
    await this.replace(version, { draft: next });
    return { draft: next, revision: version + 1 };
  }

  async preview(locale: Locale) {
    return snapshot((await this.get()).draft, locale);
  }

  async publish(locale: Locale, revision: unknown) {
    const version = this.version(revision);
    const state = await this.get();
    if (state.revision !== version) throw new ConflictException('Nội dung đã đổi ở phiên khác. Tải lại bản nháp trước khi tiếp tục.');
    const published = { cv: snapshot(state.draft, locale, true), at: new Date().toISOString() };
    await this.replace(version, locale === 'vi' ? { publishedVi: published } : { publishedEn: published });
    return { revision: version + 1, publishedAt: published.at };
  }

  async published(locale: Locale): Promise<RenderableCv> {
    if (!this.database.available) return publicCv(locale);
    const row = await this.row();
    return ((locale === 'vi' ? row.publishedVi : row.publishedEn) as Published).cv;
  }

  async publishBoth(revision: unknown, draft: unknown) {
    const version = this.version(revision);
    const next = validateDraft(draft);
    const fieldErrors = { ...publicationErrors(next, 'vi'), ...publicationErrors(next, 'en') };
    if (Object.keys(fieldErrors).length) {
      throw new BadRequestException({ message: 'Chưa đủ nội dung bắt buộc để xuất bản.', fieldErrors });
    }
    const at = new Date().toISOString();
    await this.replace(version, {
      draft: next,
      publishedVi: { cv: snapshot(next, 'vi'), at },
      publishedEn: { cv: snapshot(next, 'en'), at },
    });
    return { draft: next, revision: version + 1, published: { vi: at, en: at } };
  }

  private version(value: unknown) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value >= 2_147_483_647) {
      throw new BadRequestException('Phiên bản bản nháp không hợp lệ.');
    }
    return value;
  }
}
