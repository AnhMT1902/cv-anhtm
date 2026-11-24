import { expect, test } from '@playwright/test';
import { initialDraft, snapshot } from '../apps/backend/src/cv-content-model';
import { toSidebarResume } from '../apps/backend/src/sidebar-upstream';

const password = process.env.CV_ADMIN_TEST_PASSWORD;

test('previews, applies and restores locally bundled JSON Resume layouts', async ({ page, browser, baseURL }, info) => {
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  expect((await page.request.get('/api/admin/templates')).status()).toBe(401);
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const catalog = page.getByRole('region', { name: 'Mẫu JSON Resume' });
  await expect(catalog.getByRole('listitem')).toHaveCount(4);
  const language = page.getByRole('combobox', { name: 'Ngôn ngữ', exact: true });
  const visitor = await browser.newPage({ baseURL });
  const reference = await browser.newPage();
  visitor.on('pageerror', (error) => errors.push(error.message));
  visitor.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    for (const [name, style] of [['Sidebar', ''], ['Elegant', 'elegant'], ['Kendall', 'kendall'], ['Jake Technical', 'jake']]) {
      await catalog.getByRole('button', { name: `Xem trước ${name}`, exact: true }).click();
      const frame = page.frameLocator('iframe[title="Bản xem trước template"]');
      await language.selectOption('vi');
      if (style) await expect(frame.locator(`.jr-${style}`)).toBeVisible();
      await expect(frame.getByRole('heading', { name: /^Kinh nghiệm$/i })).toBeVisible();
      await language.selectOption('en');
      await expect(frame.getByRole('heading', { name: /^(Work )?Experience$/i })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();
      await visitor.goto('/');
      await expect(visitor.locator('.imported-template')).toHaveCount(0);
    }
    const sidebar = catalog.getByRole('listitem').filter({ hasText: 'Sidebar' });
    const download = page.waitForEvent('download');
    await sidebar.getByRole('link', { name: 'Xuất HTML' }).click();
    expect((await download).suggestedFilename()).toBe('sidebar-en.html');
    await sidebar.getByRole('button', { name: 'Áp dụng Sidebar', exact: true }).click();
    await expect(sidebar).toContainText('Đang áp dụng');
    await page.reload();
    await expect(sidebar).toContainText('Đang áp dụng');
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEioAAAAASUVORK5CYII=', 'base64');
    await page.locator('.visual-extra summary').click();
    await page.locator('.visual-extra').getByRole('button', { name: 'Sửa thông tin đầu trang' }).click();
    let dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
    await dialog.getByLabel('Ảnh đại diện', { exact: true }).setInputFiles({
      name: 'fixture.png', mimeType: 'image/png',
      buffer: png,
    });
    const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
    await expect(dialog.getByRole('img', { name: 'Ảnh đại diện bản nháp' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Xong' }).click();
    await expect(page.frameLocator('iframe[title="CV để chỉnh sửa"]').locator('aside img')).toBeVisible();
    await visitor.goto('/');
    await expect(visitor.frameLocator('iframe').locator('aside img')).toHaveCount(0);
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    const draft = initialDraft();
    draft.shared.portrait = `data:image/png;base64,${png.toString('base64')}`;
    const { render } = await import('jsonresume-theme-sidebar');
    const typography = (element: Element) => {
      const css = getComputedStyle(element);
      return [css.fontFamily, css.fontWeight, css.fontSize, css.lineHeight, css.letterSpacing, css.color];
    };
    for (const width of [390, 768, 1440]) {
      await visitor.setViewportSize({ width, height: 900 });
      for (const [locale, path, label] of [['vi', '/', 'Kinh nghiệm'], ['en', '/?lang=en', 'WORK EXPERIENCE']] as const) {
        expect((await visitor.goto(path))?.ok()).toBe(true);
        expect(await visitor.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const iframe = visitor.locator('iframe');
        const frame = visitor.frameLocator('iframe');
        const left = frame.locator('aside');
        const main = frame.locator('main');
        await expect(left.locator('#education')).toBeVisible();
        const contact = left.locator('a[href^="mailto:"]').first();
        await expect(contact).toBeVisible();
        await expect(contact).toHaveCSS('color', 'rgb(255, 255, 255)');
        await expect(left.locator('img').locator('..')).toHaveCSS('border-top-width', '8px');
        await expect(main.locator('h1')).toBeVisible();
        await expect(main.locator('#intro h2')).toHaveText(locale === 'en' ? 'PROFILE' : 'Giới thiệu');
        await expect(main.locator('#experience h2')).toHaveText(label);
        expect(await frame.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(width);
        await expect(visitor.locator('.imported-site-header')).toHaveCSS('background-color', 'rgb(245, 242, 237)');
        const [asideBox, mainBox] = await Promise.all([left.boundingBox(), main.boundingBox()]);
        expect(asideBox).toBeTruthy();
        expect(mainBox).toBeTruthy();
        if (width >= 768) {
          expect(asideBox?.y).toEqual(mainBox?.y);
          expect(mainBox?.x).toBeGreaterThan(asideBox?.x ?? 0);
        } else {
          expect(mainBox?.y).toBeGreaterThan(asideBox?.y ?? 0);
        }
        const bounds = await iframe.boundingBox();
        await reference.setViewportSize({ width, height: Math.round(bounds?.height ?? 840) });
        const cv = snapshot(draft, locale, true);
        const raw = render(toSidebarResume(cv), { locale, title: cv.seo.title });
        await reference.goto(`data:text/html;charset=utf-8,${encodeURIComponent(raw)}`);
        for (const selector of ['main h1', 'main h2', 'aside h2']) {
          expect(await frame.locator(selector).first().evaluate(typography))
            .toEqual(await reference.locator(selector).first().evaluate(typography));
        }
        if (locale === 'en' && width >= 768) {
          const expected = await reference.locator('main h1').boundingBox();
          const actual = await main.locator('h1').boundingBox();
          expect(actual?.x).toEqual(expected?.x);
          expect(actual?.width).toEqual(expected?.width);
        }
        await reference.screenshot({ path: info.outputPath(`sidebar-original-${width}-${locale}.png`) });
        await iframe.screenshot({ path: info.outputPath(`sidebar-integrated-${width}-${locale}.png`) });
        await visitor.goto(`${path}#experience`);
        await expect.poll(() => frame.locator('html').evaluate((html) => html.scrollTop)).toBeGreaterThan(0);
      }
    }
    await page.locator('.visual-extra').getByRole('button', { name: 'Sửa thông tin đầu trang' }).click();
    dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
    await dialog.getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xong' }).click();
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await page.getByRole('button', { name: 'Template', exact: true }).click();
    await page.getByRole('button', { name: 'Áp dụng Mẫu hiện tại ban đầu' }).click();
    await expect(page.locator('.admin-status')).toContainText('Đã áp dụng');
    await visitor.reload();
    await expect(visitor.locator('.imported-template')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
    await reference.close();
  }
});
