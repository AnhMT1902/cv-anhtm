import { expect, test, type Locator } from '@playwright/test';

async function expectActionSpacing(group: Locator) {
  const rows = await group.evaluate((element) => {
    const rows: { top: number; bottom: number; buttons: { left: number; right: number }[] }[] = [];
    for (const control of element.children) {
      const { top, bottom, left, right } = control.getBoundingClientRect();
      const row = rows.find((candidate) => top < candidate.bottom && bottom > candidate.top);
      if (row) {
        row.top = Math.min(row.top, top);
        row.bottom = Math.max(row.bottom, bottom);
        row.buttons.push({ left, right });
      }
      else rows.push({ top, bottom, buttons: [{ left, right }] });
    }
    return rows;
  });
  for (const [index, row] of rows.entries()) {
    for (let item = 1; item < row.buttons.length; item++) {
      expect(row.buttons[item].left - row.buttons[item - 1].right).toBeCloseTo(8, 0);
    }
    if (index > 0) {
      expect(row.top - rows[index - 1].bottom).toBeCloseTo(8, 0);
      expect(row.buttons[0].left).toBeCloseTo(rows[0].buttons[0].left, 0);
    }
  }
  return rows.length;
}

test('admin action groups keep equal gaps when buttons wrap', async ({ page }, info) => {
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const catalogActions = page.getByRole('region', { name: 'Mẫu JSON Resume' }).locator('.admin-actions').first();
  await expect(catalogActions.getByRole('button')).toHaveCount(2);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectActionSpacing(catalogActions);
  }

  await page.route('**/api/admin/content', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const state = await response.json();
    for (const [index, title] of ['TypeScript', 'Next.js', 'React', 'NestJS', 'Playwright', 'Thiết kế và kiểm thử API cho ứng dụng nội bộ'].entries()) {
      const id = `skills-spacing-${index}`;
      state.draft.shared.sections.skills.push({ id, hidden: true, start: '', end: '', url: '' });
      state.draft.localized.vi.items[id] = { title, subtitle: '', details: '' };
      state.draft.localized.en.items[id] = { title, subtitle: '', details: '' };
    }
    await route.fulfill({ response, json: state });
  });
  await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
  await expect(page.locator('.visual-canvas h1').or(page.locator('.visual-canvas iframe'))).toBeVisible();
  const panel = page.locator('.visual-extra');
  await panel.locator('summary').click();
  const commonActions = panel.locator('.visual-extra-body > .visual-extra-actions');
  const skillActions = panel.locator('.visual-extra-row').filter({ hasText: 'Kỹ năng' }).locator('.visual-extra-actions');
  await expect(skillActions.getByRole('button', { name: 'Sửa Next.js' })).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectActionSpacing(page.getByRole('navigation', { name: 'Khu vực quản trị' }));
    await expectActionSpacing(page.getByRole('group', { name: 'Thao tác nội dung CV' }).locator('.cv-editor-actions'));
    await expectActionSpacing(commonActions);
    const skillRows = await expectActionSpacing(skillActions);
    if (width < 1000) expect(skillRows).toBeGreaterThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await panel.screenshot({ path: info.outputPath(`hidden-items-${width}.png`) });
  }
  await commonActions.getByRole('button', { name: 'Sửa Giới thiệu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sửa Giới thiệu' });
  await expect(dialog).toBeVisible();
  await expectActionSpacing(dialog.getByRole('group', { name: 'Ngôn ngữ chỉnh sửa' }));
  await expectActionSpacing(dialog.locator('.admin-actions'));
  await dialog.screenshot({ path: info.outputPath('intro-dialog.png') });
});

test('template gallery and visual bilingual editor preserve draft publication boundaries', async ({ page, browser, baseURL }, info) => {
  test.setTimeout(120000);
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const catalog = page.getByRole('region', { name: 'Mẫu JSON Resume' });
  await expect(catalog.getByRole('heading', { name: 'Mẫu JSON Resume' })).toBeVisible();
  const beforePreview = await (await page.request.get('/api/admin/content')).json();
  const invalidPreview = await page.request.post('/api/admin/content/vi/preview', {
    headers: { origin: new URL(baseURL ?? 'http://127.0.0.1').origin }, data: { draft: {} },
  });
  expect(invalidPreview.status()).toBe(400);
  const afterPreview = await (await page.request.get('/api/admin/content')).json();
  expect(afterPreview.revision).toBe(beforePreview.revision);
  await expect(catalog.locator('.admin-thumbnail')).toHaveCount(4);
  await expect(catalog.locator('.admin-thumbnail iframe').first()).toBeAttached();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`gallery-${width}.png`) });
  }
  const previewButton = catalog.getByRole('button', { name: 'Xem trước Sidebar' });
  await previewButton.click();
  const galleryDialog = page.getByRole('dialog', { name: 'Xem trước · Sidebar' });
  await expect(galleryDialog).toBeVisible();
  await galleryDialog.screenshot({ path: info.outputPath('preview-dialog.png') });
  await expect(galleryDialog.frameLocator('iframe').getByRole('heading', { name: 'Kinh nghiệm' })).toBeVisible();
  await galleryDialog.getByLabel('Ngôn ngữ').selectOption('en');
  await expect(galleryDialog.frameLocator('iframe').getByRole('heading', { name: 'WORK EXPERIENCE' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(galleryDialog).toBeHidden();
  await expect(previewButton).toBeFocused();

  await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
  const canvas = page.locator('.visual-canvas');
  const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
  await expect(canvas.getByRole('heading', { name: 'Nguyễn Minh An' })).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`visual-admin-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const visitor = await browser.newPage({ baseURL });
  try {
    await visitor.goto('/');
    const editHeader = canvas.getByRole('button', { name: 'Sửa Giới thiệu' });
    await editHeader.focus();
    await editHeader.click();
    const dialog = page.getByRole('dialog', { name: 'Sửa Giới thiệu' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Giới thiệu').fill('Nội dung tiếng Việt đã sửa.');
    await dialog.getByRole('button', { name: 'English' }).click();
    await dialog.getByLabel('Giới thiệu').fill('Updated English introduction.');
    await dialog.getByRole('button', { name: 'Xong' }).click();
    await expect(canvas.getByText('Nội dung tiếng Việt đã sửa.')).toBeVisible();
    await page.getByRole('button', { name: 'Lưu vào nháp' }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã lưu bản nháp.');
    await visitor.reload();
    await expect(visitor.getByText('Nội dung tiếng Việt đã sửa.')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    await expect(canvas.getByText('Nội dung tiếng Việt đã sửa.')).toBeVisible();

    const project = canvas.locator('#projects article').first();
    await project.hover();
    await project.getByRole('button', { name: 'Thao tác khác' }).click();
    await project.getByRole('button', { name: 'Nhân bản Dự án' }).click();
    const editProject = page.getByRole('dialog', { name: 'Chỉnh sửa Dự án' });
    await editProject.getByLabel('Tên dự án').fill('Dự án nhân bản');
    await editProject.getByRole('button', { name: 'Xong' }).click();
    await expect(canvas.getByRole('heading', { name: 'Dự án nhân bản' })).toBeVisible();
    const clone = canvas.locator('#projects article').filter({ hasText: 'Dự án nhân bản' });
    await clone.hover();
    await clone.getByRole('button', { name: 'Thao tác khác' }).click();
    await clone.getByRole('button', { name: 'Thêm phía dưới Dự án' }).click();
    await editProject.getByLabel('Tên dự án').fill('Mục đã hủy');
    await editProject.getByRole('button', { name: 'Hủy' }).click();
    await expect(canvas.getByRole('heading', { name: 'Mục đã hủy' })).toHaveCount(0);
    await clone.hover();
    await clone.getByRole('button', { name: 'Thao tác khác' }).click();
    await clone.getByRole('button', { name: 'Thêm phía trên Dự án' }).click();
    await editProject.getByLabel('Tên dự án').fill('Dự án mới');
    await editProject.getByLabel('Mô tả').fill('Mô tả kiểm thử');
    await editProject.getByRole('button', { name: 'Xong' }).click();
    await expect(canvas.getByRole('heading', { name: 'Dự án mới' })).toBeVisible();
    await clone.hover();
    await clone.getByRole('button', { name: 'Thao tác khác' }).click();
    page.once('dialog', (confirmation) => confirmation.accept());
    await clone.getByRole('button', { name: 'Xóa Dự án' }).click();
    await expect(canvas.getByRole('heading', { name: 'Dự án nhân bản' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await visitor.reload();
    await expect(visitor.getByText('Nội dung tiếng Việt đã sửa.')).toBeVisible();
    await expect(visitor.getByRole('heading', { name: 'Dự án mới' })).toBeVisible();
    await visitor.goto('/?lang=en');
    await expect(visitor.getByText('Updated English introduction.')).toBeVisible();
    expect(failures).toEqual([]);
  } finally { await visitor.close(); }
});

test('a concurrent change reports conflict and retains published content', async ({ page, baseURL }) => {
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
  const canvas = page.locator('.visual-canvas');
  const header = canvas.getByRole('button', { name: 'Sửa thông tin đầu trang' });
  await header.focus();
  await header.click();
  const dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
  await dialog.getByLabel('Giới thiệu').fill('Thay đổi chưa lưu');
  await dialog.getByRole('button', { name: 'Xong' }).click();
  const state = await (await page.request.get('/api/admin/content')).json();
  state.draft.localized.vi.intro = 'Một phiên khác đã thay đổi';
  const saved = await page.request.put('/api/admin/content', {
    headers: { origin: new URL(baseURL ?? 'http://127.0.0.1').origin },
    data: { draft: state.draft, revision: state.revision },
  });
  expect(saved.status()).toBe(200);
  const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
  await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(toolbar.getByRole('alert')).toContainText('đã đổi ở phiên khác');
  await expect(toolbar.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  await toolbar.getByRole('button', { name: 'Tải lại bản nháp đã lưu' }).click();
  await expect(canvas.getByText('Một phiên khác đã thay đổi')).toBeVisible();
});

test('visual controls target the correct items in Sidebar and ZIP templates', async ({ page }, info) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(8000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  for (const name of ['Sidebar', 'Jake Technical']) {
    await page.getByRole('button', { name: 'Template', exact: true }).click();
    const apply = page.getByRole('button', { name: `Áp dụng ${name}`, exact: true });
    await expect(apply).toBeVisible();
    if (await apply.isEnabled()) {
      await apply.click();
      await expect(page.locator('.admin-status')).toContainText('Đã áp dụng');
    }
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    const preview = page.frameLocator('iframe[title="CV để chỉnh sửa"]');
    if (name === 'Jake Technical') {
      await expect(preview.locator('.jr-jake')).toBeVisible();
    }
    const header = preview.getByRole('button', { name: 'Sửa thông tin đầu trang' });
    await header.focus();
    await header.click();
    const dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(dialog).toHaveCount(0);
    const introEdit = preview.getByRole('button', { name: 'Sửa Giới thiệu', exact: true });
    const introduction = page.getByRole('dialog', { name: 'Sửa Giới thiệu' });
    await introEdit.focus();
    await introEdit.click();
    await expect(introduction.getByRole('textbox')).toHaveCount(1);
    await expect(introduction.getByLabel('Giới thiệu')).not.toHaveValue('');
    if (name === 'Sidebar') {
      await page.screenshot({ path: info.outputPath('sidebar-intro-vi.png') });
      await introduction.getByRole('button', { name: 'English' }).click();
      await introduction.getByLabel('Giới thiệu').fill('An introduction edited directly in Sidebar.');
      await page.screenshot({ path: info.outputPath('sidebar-intro-en.png') });
      await introduction.getByRole('button', { name: 'Xong' }).click();
      await page.getByLabel('Ngôn ngữ xem trước').selectOption('en');
      const updatedIntro = preview.getByText('An introduction edited directly in Sidebar.');
      await expect(updatedIntro).toBeVisible();
      await updatedIntro.scrollIntoViewIfNeeded();
      await expect(updatedIntro).toBeInViewport();
      await page.screenshot({ path: info.outputPath('sidebar-updated.png') });
      await page.getByLabel('Ngôn ngữ xem trước').selectOption('vi');
      const skill = preview.locator('#skills li[data-editor-target]').first();
      await skill.hover();
      await expect(skill.getByRole('button', { name: 'Thao tác khác' })).toHaveCSS('width', '34px');
      await page.screenshot({ path: info.outputPath('sidebar-skill-hover.png') });
      const more = skill.getByRole('button', { name: 'Thao tác khác' });
      await more.press('Enter');
      await expect(skill.getByRole('button', { name: 'Nhân bản Kỹ năng' })).toBeFocused();
      await page.screenshot({ path: info.outputPath('sidebar-skill-menu.png') });
      await page.keyboard.press('Escape');
      await expect(more).toBeFocused();
      await expect(more).toHaveAttribute('aria-expanded', 'false');
      for (const width of [768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.screenshot({ path: info.outputPath(`sidebar-${width}.png`) });
      }
    } else {
      await introduction.getByRole('button', { name: 'Hủy' }).click();
      await page.getByLabel('Ngôn ngữ xem trước').selectOption('en');
      await expect(preview.getByText('An introduction edited directly in Sidebar.')).toBeVisible();
    }
    const projects = preview.locator('#projects');
    const edit = projects.getByRole('button', { name: 'Sửa Dự án' }).first();
    await edit.focus();
    await edit.click();
    const projectDialog = page.getByRole('dialog', { name: 'Chỉnh sửa Dự án' });
    await expect(projectDialog.getByLabel('Tên dự án')).not.toHaveValue('');
    await projectDialog.getByRole('button', { name: 'Hủy' }).click();
  }
});

test('touch users can access edit controls without hover', async ({ browser, baseURL }, info) => {
  const password = process.env.CV_ADMIN_TEST_PASSWORD;
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto('/admin');
    await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
    const frame = page.frameLocator('iframe[title="CV để chỉnh sửa"]');
    const edit = frame.getByRole('button', { name: 'Sửa Giới thiệu' });
    await expect(edit).toBeVisible();
    await edit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('touch-editor.png') });
    await edit.tap();
    const dialog = page.getByRole('dialog', { name: 'Sửa Giới thiệu' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: info.outputPath('touch-intro.png') });
    await dialog.getByRole('button', { name: 'Hủy' }).tap();
  } finally { await context.close(); }
});
