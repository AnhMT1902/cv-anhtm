import { expect, test } from '@playwright/test';

test('imported bilingual CV and social links work through admin and public pages', async ({ page, browser, baseURL }) => {
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  const errors: string[] = [];
  const visitor = await browser.newPage({ baseURL });
  visitor.on('pageerror', (error) => errors.push(error.message));
  visitor.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    for (const width of [390, 768, 1440]) {
      await visitor.setViewportSize({ width, height: 900 });
      for (const [url, heading] of [['/', 'Kinh nghiệm'], ['/?lang=en', 'WORK EXPERIENCE']]) {
        await visitor.goto(url);
        const content = visitor.frameLocator('iframe.resume-document');
        await expect(content.locator('h1')).toHaveText('Sample Candidate');
        await expect(content.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        await expect(content.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/example');
        await expect(content.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/example');
        expect(await visitor.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(await content.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(width);
        await visitor.reload();
        await expect(content.locator('h1')).toHaveText('Sample Candidate');
      }
    }
    await page.goto('/admin');
    await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    await page.locator('.visual-extra summary').click();
    await page.locator('.visual-extra').getByRole('button', { name: 'Sửa thông tin đầu trang' }).click();
    let dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
    await expect(dialog.getByLabel('GitHub cá nhân')).toHaveValue('https://github.com/example');
    await expect(dialog.getByLabel('Facebook')).toHaveValue('https://www.facebook.com/example');
    await dialog.getByLabel('Facebook').fill('https://www.facebook.com/new-example');
    await dialog.getByRole('button', { name: 'Xong' }).click();
    const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
    await toolbar.getByRole('button', { name: 'Lưu vào nháp' }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã lưu bản nháp.');
    await page.reload();
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    await page.locator('.visual-extra summary').click();
    await page.locator('.visual-extra').getByRole('button', { name: 'Sửa thông tin đầu trang' }).click();
    dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
    await expect(dialog.getByLabel('Facebook')).toHaveValue('https://www.facebook.com/new-example');
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await visitor.goto('/');
    await expect(visitor.frameLocator('iframe').getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/example');
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await visitor.reload();
    await expect(visitor.frameLocator('iframe').getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/new-example');
    await visitor.goto('/?lang=en');
    await expect(visitor.frameLocator('iframe').getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/new-example');
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
  }
});
