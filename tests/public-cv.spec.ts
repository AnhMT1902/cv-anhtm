import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`renders the bilingual CV and preserves navigation at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (request) => errors.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page).toHaveTitle('Nguyễn Minh An | CV mẫu');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nguyễn Minh An');
    await expect(page.locator('#experience time').first()).toHaveText(/thg 8,? 2022/i);
    await expect(page.getByRole('link', { name: 'minh-an@example.com' })).toHaveAttribute('href', 'mailto:minh-an@example.com');
    await expect(page.getByRole('link', { name: '+12025550101' })).toHaveAttribute('href', 'tel:+12025550101');
    await expect(page.getByRole('link', { name: 'Trang web' })).toHaveAttribute('href', 'https://example.com/');
    const hasNoOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(await hasNoOverflow()).toBe(true);

    await page.getByRole('link', { name: 'Kinh nghiệm' }).click();
    await expect(page).toHaveURL(/\/#experience$/);
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/\?lang=en#experience$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Nguyễn Minh An | Sample CV');
    await expect(page.locator('#experience time').first()).toHaveText('Aug 2022');
    await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
    expect(await hasNoOverflow()).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page).toHaveURL(/\?lang=en#experience$/);
    await page.getByRole('link', { name: 'Tiếng Việt' }).click();
    await expect(page).toHaveURL(/\/#experience$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

    await page.goto('/?lang=en');
    await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('english.png'), fullPage: true, animations: 'disabled' });
    await page.goto('/?lang=fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.getByRole('heading', { name: 'Kinh nghiệm' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('vietnamese.png'), fullPage: true, animations: 'disabled' });
    await page.goto('/?lang=en&lang=vi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    expect(errors).toEqual([]);
  });
}
