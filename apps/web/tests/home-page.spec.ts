import { test, expect } from '@playwright/test';

test.describe('HoloCollab Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/HoloCollab/);
    await expect(page.locator('h1')).toContainText(/Premium 3D/i);
  });

  test('displays navigation elements', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header >> text=Sign In')).toBeVisible();
    await expect(page.locator('header >> text=Get Started')).toBeVisible();
  });

  test('main call-to-action buttons work', async ({ page }) => {
    const getStartedButton = page.locator('button', { hasText: 'Get Started' });
    await expect(getStartedButton).toBeVisible();
    await getStartedButton.click();
    await expect(page).toHaveURL(/.*signup/);

    // Go back and test room-code join flow
    await page.goBack();
    await page.locator('input[placeholder="Enter code"]').fill('ABC123');
    const joinButton = page.locator('button', { hasText: 'Join' });
    await expect(joinButton).toBeVisible();
    await joinButton.click();
    await expect(page).toHaveURL(/.*join\?code=ABC123/);
  });

  test('displays feature cards', async ({ page }) => {
    await expect(page.locator('text=Instant Holographic Meetings')).toBeVisible();
    await expect(page.locator('text=Infinite Spatial Canvas')).toBeVisible();
    await expect(page.locator('text=AI Meeting Assistant')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Join' })).toBeVisible();
  });
});
