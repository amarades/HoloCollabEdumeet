import { test, expect } from '@playwright/test';

test.describe('HoloCollab Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/HoloCollab/);
    await expect(page.locator('h1')).toContainText('Learning Revolution');
  });

  test('displays navigation elements', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header >> text=Sign In')).toBeVisible();
    await expect(page.locator('header nav >> text=Get Started Free')).toBeVisible();
  });

  test('main call-to-action buttons work', async ({ page }) => {
    // Test "Start Learning Free" button
    const startButton = page.locator('text=Start Learning Free');
    await expect(startButton).toBeVisible();
    await startButton.click();
    await expect(page).toHaveURL(/.*signup/);

    // Go back and test "Join Session" button
    await page.goBack();
    const joinButton = page.locator('text=Join Session');
    await expect(joinButton).toBeVisible();
    await joinButton.click();
    await expect(page).toHaveURL(/.*join/);
  });

  test('displays feature cards', async ({ page }) => {
    await expect(page.locator('text=Real-time 3D Collaboration')).toBeVisible();
    await expect(page.locator('text=AI-Powered Insights')).toBeVisible();
    await expect(page.locator('text=HD Video Conferencing')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Navigation should be hidden on mobile (hamburger menu)
    const navLinks = page.locator('header nav');
    await expect(navLinks).toBeHidden();
  });

  test('stats section displays correctly', async ({ page }) => {
    await expect(page.locator('text=50K+')).toBeVisible();
    await expect(page.locator('text=Active Students')).toBeVisible();
    await expect(page.locator('text=1000+')).toBeVisible();
    await expect(page.locator('div:has-text("3D Models")').first()).toBeVisible(); // First occurrence in stats
  });
});
