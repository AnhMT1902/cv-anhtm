import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { initialDraft, snapshot, validateDraft } from '../src/cv-content-model';
import { CvContents } from '../src/cv-content';
import type { Database } from '../src/database';
import { renderTemplate } from '../src/template-render';
import { renderUpstreamSidebar } from '../src/sidebar-upstream';

test('social links survive legacy drafts and appear in all public renderers', async () => {
  const legacy = initialDraft();
  const next = validateDraft(legacy);
  assert.equal(next.shared.github, '');
  next.shared.github = 'https://github.com/example';
  next.shared.facebook = 'https://www.facebook.com/example';
  const cv = snapshot(validateDraft(next), 'vi', true);
  const html = renderTemplate('<section data-cv-section="contact"></section>', cv);
  const upstream = await renderUpstreamSidebar(cv);
  for (const link of [next.shared.github, next.shared.facebook]) {
    assert.ok(html.includes(link));
    assert.ok(upstream.includes(link));
  }
  next.shared.facebook = 'javascript:alert(1)';
  assert.throws(() => validateDraft(next), BadRequestException);
});

test('validates a shared portrait and captures it independently in each locale snapshot', () => {
  const draft = initialDraft();
  assert.equal(validateDraft(draft).shared.portrait, undefined);
  assert.equal(Object.hasOwn(snapshot(draft, 'vi'), 'portrait'), false);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEioAAAAASUVORK5CYII=';
  draft.shared.portrait = png;
  const vi = snapshot(validateDraft(draft), 'vi', true);
  const markup = '<main><section data-cv-section="intro"><img data-cv-portrait></section></main>';
  assert.ok(renderTemplate(markup, vi).includes(png));
  assert.ok(!renderTemplate('<main><section data-cv-section="intro"></section></main>', vi).includes(png));
  assert.ok(!renderTemplate(markup, snapshot(initialDraft(), 'en')).includes('<img'));

  delete draft.shared.portrait;
  const en = snapshot(validateDraft(draft), 'en', true);
  assert.equal(vi.portrait, png);
  assert.equal(en.portrait, undefined);

  const oversized = Buffer.alloc(512 * 1024 + 1);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(oversized);
  for (const portrait of [null, '', 'https://example.com/photo.png', png.replace('image/png', 'image/svg+xml'),
    png.replace('image/png', 'image/jpeg'), png + '=', `data:image/png;base64,${oversized.toString('base64')}`]) {
    assert.throws(() => validateDraft({ ...draft, shared: { ...draft.shared, portrait } }), (error) => {
      assert.ok(error instanceof BadRequestException);
      const response = error.getResponse() as { fieldErrors: Record<string, string> };
      return Boolean(response.fieldErrors['shared.portrait']);
    });
  }
});

test('old drafts gain optional sections while edited headings and fields render safely in ZIP templates', () => {
  const original = initialDraft();
  const { certifications, awards, activities, ...legacySections } = original.shared.sections;
  assert.deepEqual([certifications, awards, activities], [[], [], []]);
  const updated = validateDraft({ ...original, shared: { ...original.shared, sections: legacySections } });
  assert.equal(updated.shared.sections.certifications.length, 0);
  updated.localized.vi.headings = { projects: 'Dự án nổi bật' };
  updated.shared.sections.projects[0].github = 'https://github.com/example/project';
  updated.shared.sections.projects[0].technologies = 'TypeScript';
  updated.localized.vi.items['projects-0'].subtitle = 'Phụ trách giao diện';
  updated.shared.sections.certifications.push({ id: 'certifications-1', start: '', end: '', url: '' });
  updated.shared.sections.certifications.push({ id: 'certifications-2', start: '', end: '', url: '', hidden: true });
  updated.localized.vi.items['certifications-1'] = { title: '<Chứng nhận>', subtitle: 'Đơn vị cấp', details: '' };
  updated.localized.vi.items['certifications-2'] = { title: 'Chứng nhận ẩn', subtitle: '', details: '' };
  const vi = snapshot(validateDraft(updated), 'vi', true);
  const en = snapshot(updated, 'en', true);
  const html = renderTemplate('<nav><a href="#projects">Projects</a></nav><main><section data-cv-section="projects"></section></main>', vi);
  assert.match(html, /<a href="#projects">Dự án nổi bật<\/a>/);
  assert.match(html, /<h2>Dự án nổi bật<\/h2>/);
  assert.match(html, /Phụ trách giao diện/);
  assert.match(html, /https:\/\/github.com\/example\/project/);
  assert.match(html, /&lt;Chứng nhận&gt;/);
  assert.doesNotMatch(html, /Chứng nhận ẩn/);
  assert.deepEqual(en.extras.flatMap((group) => group.items), []);
});

test('snapshots preserve the previous language and omit optional content with no translation', () => {
  const draft = initialDraft();
  const vi = snapshot(draft, 'vi', true);
  draft.shared.phone = '+123456789';
  draft.localized.en.items['projects-0'].details = '';
  const en = snapshot(validateDraft(draft), 'en', true);
  assert.equal(vi.projects.length, 2);
  assert.equal(en.projects.length, 1);
  assert.notEqual(vi.contact.phone, en.contact.phone);
  assert.equal(en.contact.phone, '+123456789');
  assert.equal(Object.hasOwn(en, 'localized'), false);
});

test('rejects invalid shared fields and identifies missing publication fields by locale', () => {
  const draft = initialDraft();
  draft.shared.website = 'ftp://example.com/';
  draft.shared.sections.experience[0].end = '2000-01';
  assert.throws(() => validateDraft(draft), (error: unknown) => {
    assert.ok(error instanceof BadRequestException);
    const result = error.getResponse() as { fieldErrors: Record<string, string> };
    assert.ok(result.fieldErrors['shared.website']);
    assert.ok(result.fieldErrors['shared.sections.experience.0.end']);
    return true;
  });
  draft.localized.en.role = '';
  assert.doesNotThrow(() => snapshot(draft, 'vi', true));
  assert.throws(() => snapshot(draft, 'en', true), (error: unknown) => {
    assert.ok(error instanceof BadRequestException);
    const result = error.getResponse() as { fieldErrors: Record<string, string> };
    assert.ok(result.fieldErrors['localized.en.role']);
    return true;
  });
});

test('publishes both locales in one revision and leaves storage untouched on invalid input', async () => {
  const draft = initialDraft();
  draft.shared.name = 'Bilingual Candidate';
  draft.localized.vi.role = 'Kỹ sư';
  draft.localized.en.role = '';
  let writes = 0;
  let revision = 12;
  const db = { cvContent: { updateMany: async (input: {
    where: { revision: number };
    data: { publishedVi: { cv: { name: string; role: string } }; publishedEn: { cv: { name: string; role: string } } };
  }) => {
    if (input.where.revision !== revision) return { count: 0 };
    writes++;
    revision++;
    assert.equal(input.data.publishedVi.cv.name, 'Bilingual Candidate');
    assert.equal(input.data.publishedEn.cv.name, 'Bilingual Candidate');
    assert.equal(input.data.publishedVi.cv.role, 'Kỹ sư');
    assert.equal(input.data.publishedEn.cv.role, 'Engineer');
    return { count: 1 };
  } } };
  const content = new CvContents({ db } as unknown as Database);
  await assert.rejects(content.publishBoth(12, draft), (error: unknown) => {
    assert.ok(error instanceof BadRequestException);
    const response = error.getResponse() as { fieldErrors: Record<string, string> };
    assert.ok(response.fieldErrors['localized.en.role']);
    return true;
  });
  assert.equal(writes, 0);
  draft.localized.en.role = 'Engineer';
  const result = await content.publishBoth(12, draft);
  assert.equal(result.revision, 13);
  assert.equal(result.published.vi, result.published.en);
  await assert.rejects(content.publishBoth(12, draft), ConflictException);
  assert.equal(writes, 1);
});

test('admin content, preview and publication endpoints require authentication', async (context) => {
  const app = await NestFactory.create(AppModule, { logger: false });
  context.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const root = await app.getUrl();
  for (const [method, path] of [['GET', ''], ['PUT', ''], ['GET', '/en/preview'], ['POST', '/en/preview'], ['POST', '/en/publish'], ['POST', '/publish']]) {
    assert.equal((await fetch(`${root}/api/admin/content${path}`, { method })).status, 401);
  }
});
