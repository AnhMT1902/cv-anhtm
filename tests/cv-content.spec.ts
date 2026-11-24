import { expect, test } from '@playwright/test';

const password = process.env.CV_ADMIN_TEST_PASSWORD;
async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/admin');
  await page.getByLabel('Tên tài khoản').fill(process.env.CV_ADMIN_TEST_USERNAME ?? 'admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
}

test('publishes a name edited in English for both locales with one save', async ({ page, browser, baseURL }) => {
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  await openEditor(page);
  const canvas = page.locator('.visual-canvas');
  const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
  const header = canvas.getByRole('button', { name: 'Sửa thông tin đầu trang' });
  await header.focus();
  await header.click();
  const dialog = page.getByRole('dialog', { name: 'Sửa thông tin đầu trang' });
  await dialog.getByLabel('Website').fill('invalid-url');
  await dialog.getByRole('button', { name: 'English' }).click();
  await dialog.getByLabel('Tên hiển thị').fill('Bilingual Candidate');
  await dialog.getByRole('textbox', { name: 'Chức danh', exact: true }).fill('Platform Developer');
  await dialog.getByLabel('Tiêu đề SEO').fill('Platform Developer CV');
  await dialog.getByRole('button', { name: 'Xong' }).click();
  await page.getByLabel('Ngôn ngữ xem trước').selectOption('en');
  await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(toolbar.getByRole('alert')).toContainText('http');
  await page.locator('.visual-extra summary').click();
  await page.getByRole('button', { name: 'Sửa thông tin đầu trang', exact: true }).last().click();
  await dialog.getByLabel('Website').fill('https://example.com/');
  await dialog.getByRole('button', { name: 'Tiếng Việt' }).click();
  const viRole = dialog.getByRole('textbox', { name: 'Chức danh', exact: true });
  const originalRole = await viRole.inputValue();
  await viRole.fill('');
  await dialog.getByRole('button', { name: 'Xong' }).click();
  const visitor = await browser.newPage({ baseURL });
  try {
    await visitor.goto('/?lang=en');
    await expect(visitor.getByText('Platform Developer', { exact: true })).toHaveCount(0);
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('alert')).toContainText('Tiếng Việt: Cần nhập Chức danh.');
    for (const url of ['/', '/?lang=en']) {
      await visitor.goto(url);
      await expect(visitor.getByRole('heading', { name: 'Bilingual Candidate', exact: true })).toHaveCount(0);
    }
    await page.locator('.visual-extra').getByRole('button', { name: 'Sửa thông tin đầu trang', exact: true }).click();
    await dialog.getByRole('button', { name: 'Tiếng Việt' }).click();
    await viRole.fill(originalRole);
    await dialog.getByRole('button', { name: 'Xong' }).click();
    await toolbar.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toolbar.getByRole('status')).toHaveText('Đã xuất bản cả tiếng Việt và tiếng Anh.');
    await visitor.reload();
    await expect(visitor).toHaveTitle('Platform Developer CV');
    await expect(visitor.getByText('Platform Developer', { exact: true })).toBeVisible();
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Bilingual Candidate');
    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Bilingual Candidate');
    await expect(visitor.getByText('Platform Developer', { exact: true })).toHaveCount(0);
  } finally { await visitor.close(); }
});

test('edits skills and preserves education details across reorder and reload', async ({ page }) => {
  test.skip(!password, 'Set credentials for the isolated Compose stack.');
  await openEditor(page);
  const canvas = page.locator('.visual-canvas');
  const toolbar = page.getByRole('group', { name: 'Thao tác nội dung CV' });
  await page.locator('.visual-extra summary').click();
  const skillRow = page.locator('.visual-extra-row').filter({ has: page.getByText('Kỹ năng', { exact: true }) });
  await skillRow.getByRole('button', { name: '+ Thêm' }).click();
  const skillDialog = page.getByRole('dialog', { name: 'Chỉnh sửa Kỹ năng' });
  await skillDialog.getByLabel('Kỹ năng', { exact: true }).fill('Kiểm thử giao diện');
  await skillDialog.getByLabel('Nhóm kỹ năng').fill('Đảm bảo chất lượng');
  await skillDialog.getByLabel('Mô tả').fill('Kiểm tra trên trình duyệt');
  await skillDialog.getByRole('button', { name: 'English' }).click();
  await skillDialog.getByLabel('Kỹ năng', { exact: true }).fill('Browser testing');
  await skillDialog.getByRole('button', { name: 'Xong' }).click();

  const educationRow = page.locator('.visual-extra-row').filter({ has: page.getByText('Học vấn', { exact: true }) });
  await educationRow.getByRole('button', { name: '+ Thêm' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa Học vấn' });
  await dialog.getByLabel('Bằng cấp hoặc chuyên ngành').fill('Cử nhân hệ thống');
  await dialog.getByLabel('Trường').fill('Trường kiểm thử');
  await dialog.getByLabel('Bắt đầu (YYYY-MM)').fill('2018-09');
  await dialog.getByLabel('Kết thúc (YYYY-MM)').fill('2022-06');
  await dialog.getByLabel('GPA').fill('3.2/4');
  await dialog.getByRole('button', { name: 'English' }).click();
  await dialog.getByLabel('Bằng cấp hoặc chuyên ngành').fill('Systems degree');
  await dialog.getByLabel('Trường').fill('Test university');
  await dialog.getByRole('button', { name: 'Xong' }).click();
  const entry = canvas.locator('#education article').filter({ hasText: 'Cử nhân hệ thống' });
  await entry.hover();
  await entry.getByRole('button', { name: 'Thao tác khác' }).click();
  await entry.getByRole('button', { name: 'Di chuyển lên Học vấn' }).click();
  await expect(canvas.locator('#education article').first()).toContainText('Cử nhân hệ thống');
  await toolbar.getByRole('button', { name: 'Lưu vào nháp' }).click();
  await expect(toolbar.getByRole('status')).toHaveText('Đã lưu bản nháp.');
  await page.reload();
  await page.getByRole('button', { name: 'Nội dung CV', exact: true }).click();
  const restored = canvas.locator('#education article').first();
  await restored.hover();
  await restored.getByRole('button', { name: 'Sửa Học vấn' }).click();
  await expect(dialog.getByLabel('GPA')).toHaveValue('3.2/4');
  await expect(dialog.getByLabel('Bắt đầu (YYYY-MM)')).toHaveValue('2018-09');
  await dialog.getByRole('button', { name: 'English' }).click();
  await expect(dialog.getByLabel('Bằng cấp hoặc chuyên ngành')).toHaveValue('Systems degree');
  await dialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByLabel('Ngôn ngữ xem trước').selectOption('en');
  await expect(canvas.getByText('Browser testing')).toBeVisible();
});
