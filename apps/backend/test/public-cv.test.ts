import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { publicCv, selectLocale } from '../src/public-cv';

test('selects Vietnamese by default and accepts only supported locale values', () => {
  assert.equal(selectLocale(undefined), 'vi');
  assert.equal(selectLocale('vi'), 'vi');
  assert.equal(selectLocale('en'), 'en');
  for (const value of ['', 'EN', 'fr', null, ['en', 'vi']]) {
    assert.throws(() => selectLocale(value), /lang must be vi or en/);
  }
});

test('localizes content while sharing contact and structured dates', () => {
  const vi = publicCv('vi');
  const en = publicCv('en');
  assert.notEqual(vi.intro, en.intro);
  assert.notEqual(vi.seo.title, en.seo.title);
  assert.deepEqual(vi.contact, en.contact);
  assert.equal(vi.experience[0].start, en.experience[0].start);
});

test('public HTTP endpoint serves a strict projection and rejects malformed locale input', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api/public/cv`;
    for (const [query, locale] of [['', 'vi'], ['?lang=vi', 'vi'], ['?lang=en', 'en']] as const) {
      const response = await fetch(base + query);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), publicCv(locale));
    }
    assert.deepEqual(Object.keys(publicCv('vi')).sort(), [
      'contact', 'education', 'experience', 'intro', 'locale', 'location',
      'name', 'projects', 'role', 'seo', 'skills',
    ]);
    for (const query of ['?lang=fr', '?lang=', '?lang=en&lang=vi']) {
      assert.equal((await fetch(base + query)).status, 400);
    }
  } finally {
    await app.close();
  }
});
