import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('signup flow works', async ({ page }) => {
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          user_name: 'Test User',
          role: 'student',
        }),
      });
    });

    await page.click('button:has-text("Get Started")');
    await expect(page).toHaveURL(/.*signup/);

    const inputs = page.locator('form input');
    await inputs.nth(0).fill('Test User');
    await inputs.nth(1).fill('test@example.com');
    await inputs.nth(2).fill('password123');

    await page.click('button:has-text("Student")');
    await page.click('button:has-text("START LEARNING")');

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('login flow works', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          user_name: 'Test User',
          role: 'student',
        }),
      });
    });

    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);

    const inputs = page.locator('form input');
    await inputs.nth(0).fill('test@example.com');
    await inputs.nth(1).fill('password123');
    await page.click('button:has-text("SIGN IN")');

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('role selection works', async ({ page }) => {
    await page.goto('/signup');

    const studentButton = page.locator('button:has-text("Student")');
    const educatorButton = page.locator('button:has-text("Educator")');

    await expect(studentButton).toHaveClass(/bg-purple-600/);
    await educatorButton.click();
    await expect(educatorButton).toHaveClass(/bg-purple-600/);
  });
});
