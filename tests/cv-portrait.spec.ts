import { expect, test } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEioAAAAASUVORK5CYII=';
const password = process.env.CV_ADMIN_TEST_PASSWORD;
const sections = ['intro', 'projects', 'experience', 'skills', 'education', 'contact'];

test('keeps the shared portrait through reload, bilingual publication and template switching', async ({ page, browser, baseURL }) => {
  test.skip(!password, 'Set test credentials for the isolated Compose stack.');
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
  async function editHeader() {
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    const details = page.locator('.visual-extra');
    if (!await details.evaluate((node: HTMLDetailsElement) => node.open)) await details.locator('summary').click();
    await details.getByRole('button', { name: 'Sửa thông tin đầu trang' }).click();
    return page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
  }
  let header = await editHeader();
  const upload = header.getByLabel('Ảnh đại diện', { exact: true });
  await upload.setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(header.getByRole('alert')).toContainText('Không mở được tệp ảnh');
  await upload.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(header.getByRole('img', { name: 'Ảnh đại diện bản nháp' })).toBeVisible();
  await header.getByRole('button', { name: 'Xong' }).click();
  await toolbar.getByRole('button', { name: 'Lưu vào nháp' }).click();
  await expect(toolbar.getByRole('status')).toHaveText('Đã lưu bản nháp.');
  await page.reload();
  header = await editHeader();
  await expect(header.getByRole('img', { name: 'Ảnh đại diện bản nháp' })).toHaveAttribute('src', `data:image/png;base64,${png}`);
  await header.getByRole('button', { name: 'Hủy' }).click();

  const visitor = await browser.newPage({ baseURL });
  try {
    async function check(url: string, selector: string, present: boolean) {
      await visitor.goto(url);
      const image = visitor.locator(selector);
      await expect(image).toHaveCount(present ? 1 : 0);
      if (present) await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
    }
    await check('/', '.cv-portrait', false);
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await check('/', '.cv-portrait', true);
    await check('/?lang=en', '.cv-portrait', true);

    await page.getByRole('button', { name: 'Template', exact: true }).click();
    async function importTemplate(name: string, photo: string) {
      const buffer = Buffer.from(zipSync({
        'template.json': strToU8(JSON.stringify({ schemaVersion: 1, name })),
        'index.html': strToU8(`<main>${sections.map((section) => `<section data-cv-section="${section}">${section === 'intro' ? photo : ''}</section>`).join('')}</main>`),
        'styles.css': strToU8('main { padding: 1rem; }'),
      }));
      await page.locator('.admin-file-picker input[type=file]').setInputFiles({ name: 'portrait.zip', mimeType: 'application/zip', buffer });
      await page.getByRole('button', { name: 'Kiểm tra và nhập' }).click();
      const preview = page.getByRole('dialog', { name: `Xem trước · ${name}` });
      await expect(preview).toBeVisible();
      await preview.getByRole('button', { name: 'Đóng' }).click();
      return page.getByRole('button', { name: `Áp dụng ${name}`, exact: true });
    }
    const withPhoto = await importTemplate('Portrait fixture', '<img data-cv-portrait width="112" height="112">');
    const withoutPhoto = await importTemplate('Text fixture', '');
    await Promise.all([page.waitForResponse((response) => response.url().endsWith('/active') && response.ok()), withPhoto.click()]);
    await check('/', 'img[data-cv-portrait]', true);
    await Promise.all([page.waitForResponse((response) => response.url().endsWith('/active') && response.ok()), withoutPhoto.click()]);
    await check('/', 'img[data-cv-portrait]', false);
    await check('/?lang=en', 'img[data-cv-portrait]', false);
    await Promise.all([page.waitForResponse((response) => response.url().endsWith('/active') && response.ok()), withPhoto.click()]);
    for (const width of [390, 768, 1440]) {
      await visitor.setViewportSize({ width, height: 900 });
      await check('/', 'img[data-cv-portrait]', true);
      await check('/?lang=en', 'img[data-cv-portrait]', true);
      expect(await visitor.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.getByRole('button', { name: 'Áp dụng Mẫu hiện tại ban đầu' }).click();
    header = await editHeader();
    await header.getByRole('button', { name: 'Xóa ảnh' }).click();
    await header.getByRole('button', { name: 'Xong' }).click();
    await toolbar.getByRole('button', { name: 'Lưu vào nháp' }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã lưu bản nháp.');
    await check('/', '.cv-portrait', true);
    await page.getByLabel('Ngôn ngữ xem trước').selectOption('vi');
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await check('/', '.cv-portrait', false);
    await check('/?lang=en', '.cv-portrait', false);
  } finally { await visitor.close(); }
});
