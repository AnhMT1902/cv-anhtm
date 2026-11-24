import { expect, test } from '@playwright/test';

const password = process.env.CV_ADMIN_TEST_PASSWORD;
const username = process.env.CV_ADMIN_TEST_USERNAME ?? 'admin';

test('shows backend field errors and accepts login by keyboard', async ({ page }) => {
  test.skip(!password, 'Set CV_ADMIN_TEST_PASSWORD to exercise login.');
  const form = page.locator('form.admin-login');
  const userInput = page.getByLabel('Tên tài khoản');
  const passwordInput = page.getByLabel('Mật khẩu', { exact: true });
  const waitForLogin = () => page.waitForResponse((response) => response.url().endsWith('/api/admin/login'));
  await page.goto('/admin');
  await expect(form).toHaveAttribute('novalidate', '');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Về CV công khai' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(userInput).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(passwordInput).toBeFocused();
  const emptyRequest = waitForLogin();
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const emptyResponse = await emptyRequest;
  expect(emptyResponse.status()).toBe(400);
  const validation = await emptyResponse.json();
  await expect(page.locator('#username-error')).toHaveText(validation.fieldErrors.username);
  await expect(page.locator('#password-error')).toHaveText(validation.fieldErrors.password);
  await expect(userInput).toBeFocused();
  await expect(userInput).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({ path: test.info().outputPath('login-validation.png'), animations: 'disabled' });

  await userInput.fill(username);
  await passwordInput.fill('wrong-password');
  const wrongRequest = waitForLogin();
  await passwordInput.press('Enter');
  const wrongResponse = await wrongRequest;
  expect(wrongResponse.status()).toBe(401);
  await expect(form.getByRole('alert')).toHaveText((await wrongResponse.json()).message);
  await passwordInput.fill(password ?? '');
  await passwordInput.press('Enter');
  await expect(page.getByRole('heading', { name: 'Quản trị template' })).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`shows a complete login screen at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Đăng nhập' });
    await expect(submit).toBeInViewport();
    const layout = await page.locator('.admin-signin-card').evaluate((card) => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      center: Math.round(card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2),
    }));
    expect(layout.overflow).toBe(0);
    expect(layout.center).toBe(Math.round(viewport.width / 2));
    await page.screenshot({ path: info.outputPath(`login-${viewport.width}.png`), animations: 'disabled' });
  });
}
