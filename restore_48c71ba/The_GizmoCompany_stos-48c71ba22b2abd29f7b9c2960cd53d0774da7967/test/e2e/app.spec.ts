import { test, expect } from '@playwright/test';

test.describe('ZENO Browser - web build', () => {
  test('strona główna ładuje się i zawiera tytuł', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ZENO/i);
  });

  test('element root React istnieje w DOM', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('meta description jest ustawiona', async ({ page }) => {
    await page.goto('/');
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /ZENO/i);
  });
});
