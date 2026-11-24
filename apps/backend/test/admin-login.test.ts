import 'reflect-metadata';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

test('login validates fields and applies the same rate limit to incorrect credentials', async (context) => {
  const username = process.env.CV_ADMIN_USERNAME;
  const passwordHash = process.env.CV_ADMIN_PASSWORD_HASH;
  context.after(() => {
    if (username === undefined) delete process.env.CV_ADMIN_USERNAME;
    else process.env.CV_ADMIN_USERNAME = username;
    if (passwordHash === undefined) delete process.env.CV_ADMIN_PASSWORD_HASH;
    else process.env.CV_ADMIN_PASSWORD_HASH = passwordHash;
  });

  const salt = Buffer.alloc(16, 3);
  const password = 'test-only-admin-password';
  process.env.CV_ADMIN_USERNAME = 'cv.owner';
  process.env.CV_ADMIN_PASSWORD_HASH = salt.toString('hex') + ':' + scryptSync(password, salt, 64).toString('hex');
  const app = await NestFactory.create(AppModule, { logger: false });
  context.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/api/admin/login`;
  const login = (payload: object) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const missing = await login({});
  assert.equal(missing.status, 400);
  assert.deepEqual((await missing.json()).fieldErrors, {
    username: 'Vui lòng nhập tên tài khoản.',
    password: 'Vui lòng nhập mật khẩu.',
  });
  const malformed = await login({ username: '!!', password: 'a'.repeat(513) });
  assert.equal(malformed.status, 400);
  assert.deepEqual(Object.keys((await malformed.json()).fieldErrors), ['username', 'password']);
  const wrongUser = await login({ username: 'different', password });
  const wrongPassword = await login({ username: 'cv.owner', password: 'bad-password' });
  assert.equal(wrongUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await wrongUser.json(), await wrongPassword.json());
  for (let attempt = 0; attempt < 6; attempt++) {
    assert.equal((await login({ username: 'cv.owner', password: 'bad-password' })).status, 401);
  }
  const limited = await login({ username: 'cv.owner', password });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).message, 'Thử lại sau một phút.');
});
