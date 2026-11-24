import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { strToU8, zipSync } from 'fflate';

const password = process.env.CV_ADMIN_TEST_PASSWORD;
const username = process.env.CV_ADMIN_TEST_USERNAME ?? 'admin';
const sections = ['intro', 'projects', 'experience', 'skills', 'education', 'contact'];

test.skip(!password, 'Set CV_ADMIN_TEST_PASSWORD to exercise the local admin.');

test('validates, imports, previews, activates and exports templates from the admin', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  expect((await page.request.get('/api/admin/templates')).status()).toBe(401);
  await page.getByLabel('Tên tài khoản').fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('link', { name: 'Xem mẫu trên JSON Resume' })).toHaveAttribute('href', 'https://jsonresume.org/themes');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Tải ZIP tương thích' }).click();
  const sample = await download;
  expect(sample.suggestedFilename()).toBe('start-bootstrap-resume.zip');
  const picker = page.locator('.admin-file-picker');
  const file = picker.locator('input[type=file]');
  const submit = page.getByRole('button', { name: 'Kiểm tra và nhập' });
  await expect(submit).toBeDisabled();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await picker.screenshot({ path: test.info().outputPath(`zip-empty-${width}.png`) });
  }
  await file.focus();
  const chooser = page.waitForEvent('filechooser');
  await file.press('Enter');
  await (await chooser).setFiles({ name: 'invalid.zip', mimeType: 'application/zip', buffer: Buffer.from('not a ZIP') });
  await expect(picker.getByText('invalid.zip')).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Bị từ chối');
  const change = page.waitForEvent('filechooser');
  await picker.getByText('Đổi tệp', { exact: true }).locator('..').click();
  const longName = 'start-bootstrap-resume-template-portfolio-technical-bilingual-example.zip';
  await (await change).setFiles({
    name: longName, mimeType: 'application/zip', buffer: await readFile(await sample.path()),
  });
  await expect(picker.getByText(longName)).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await picker.screenshot({ path: test.info().outputPath(`zip-selected-${width}.png`) });
  }
  await submit.click();
  const templateDialog = page.getByRole('dialog', { name: 'Xem trước · Start Bootstrap – Resume' });
  await expect(templateDialog).toBeVisible();
  const preview = page.frameLocator('iframe[title="Bản xem trước template"]');
  await expect(preview.getByRole('heading', { name: 'Dự án', exact: true })).toBeVisible();
  await page.getByLabel('Ngôn ngữ').selectOption('en');
  await expect(preview.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await page.getByLabel('Kích thước').selectOption('phone');
  await expect(templateDialog.locator('iframe')).toHaveClass('admin-phone');
  await templateDialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('status')).toContainText('Hợp lệ');
  const publicPage = await page.context().newPage();
  await publicPage.goto('/');
  await expect(publicPage.locator('.imported-template')).toHaveCount(0);
  await page.getByRole('listitem').filter({ hasText: 'Start Bootstrap – Resume' }).first()
    .getByRole('button', { name: 'Áp dụng Start Bootstrap – Resume' }).click();
  await expect(page.getByRole('status')).toContainText('Đã áp dụng');
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await publicPage.setViewportSize(viewport);
    for (const [url, label] of [['/', 'Dự án'], ['/?lang=en', 'Projects']]) {
      await publicPage.goto(url);
      await expect(publicPage.locator('.resume').getByRole('heading', { name: label, exact: true })).toBeVisible();
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      if (url === '/') await publicPage.screenshot({ path: test.info().outputPath(`resume-${viewport.width}.png`), fullPage: true });
    }
  }
  const second = Buffer.from(zipSync({
    'index.html': strToU8(`<main class="mapped">${sections.map((section) => `<article id="block-${section}"></article>`).join('')}</main>`),
    'styles.css': strToU8('.mapped { padding: 1rem; background: #eadfc8; }'),
  }));
  await file.setInputFiles({ name: 'other.zip', mimeType: 'application/zip', buffer: second });
  await page.getByRole('button', { name: 'Kiểm tra và nhập' }).click();
  await expect(page.getByRole('status')).toContainText('Cần cấu hình');
  await page.getByLabel('Tên mẫu').fill('Mẫu kiểm thử');
  const names = ['Giới thiệu', 'Dự án', 'Kinh nghiệm', 'Kỹ năng', 'Học vấn', 'Liên hệ'];
  for (const [index, name] of names.entries()) {
    await page.getByRole('combobox', { name, exact: true }).selectOption(`block-${sections[index]}`);
  }
  await page.getByRole('button', { name: 'Lưu template' }).click();
  await expect(page.getByRole('dialog', { name: 'Xem trước · Mẫu kiểm thử' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Xem trước · Mẫu kiểm thử' }).getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('status')).toContainText('Đã nhập Mẫu kiểm thử');
  const exportEvent = page.waitForEvent('download');
  const otherRow = page.getByRole('listitem').filter({ hasText: 'Mẫu kiểm thử' }).first();
  await otherRow.getByRole('link', { name: 'Xuất ZIP' }).click();
  expect((await exportEvent).suggestedFilename()).toBe('cv-template.zip');
  await otherRow.getByRole('button', { name: 'Áp dụng Mẫu kiểm thử' }).click();
  await expect(page.getByRole('status')).toContainText('Đã áp dụng');
  await publicPage.goto('/');
  await expect(publicPage.locator('.mapped h1')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: 'Mẫu kiểm thử' }).first()).toContainText('Đang áp dụng');
  if (process.env.CV_ADMIN_KEEP_TEST_TEMPLATE !== '1') {
    await page.getByRole('button', { name: 'Áp dụng Mẫu hiện tại ban đầu' }).click();
    await expect(page.getByRole('status')).toContainText('Đã áp dụng');
    await publicPage.reload();
    await expect(publicPage.locator('.imported-template')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  expect((await page.request.get('/api/admin/templates')).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('persists the selected template after Compose recreation and restores the original', async ({ page }) => {
  test.skip(process.env.CV_ADMIN_VERIFY_PERSISTENCE !== '1', 'Run after recreating the verification stack.');
  await page.goto('/');
  await expect(page.locator('.mapped h1')).toBeVisible();
  await page.goto('/?lang=en');
  await expect(page.locator('.mapped').getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Mẫu kiểm thử' }).first()).toContainText('Đang áp dụng');
  await page.getByRole('button', { name: 'Áp dụng Mẫu hiện tại ban đầu' }).click();
  await expect(page.getByRole('status')).toContainText('Đã áp dụng');
  await page.goto('/');
  await expect(page.locator('.imported-template')).toHaveCount(0);
});
