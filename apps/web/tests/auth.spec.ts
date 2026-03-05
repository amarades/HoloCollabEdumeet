import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('signup flow works', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Get Started Free');
    await expect(page).toHaveURL(/.*signup/);

    // Fill out signup form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Select role
    await page.click('button:has-text("Student")');

    // Submit form
    await page.click('button:has-text("Create Account")');

    // Should redirect to dashboard on success
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('login flow works', async ({ page }) => {
    // Navigate to login
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);

    // Fill out login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Should redirect to dashboard on success
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    await page.click('button:has-text("Create Account")');
    
    // Should show validation errors
    await expect(page.locator('input[name="name"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="password"]:invalid')).toBeVisible();
  });

  test('role selection works', async ({ page }) => {
    await page.goto('/signup');

    // Test role buttons
    const studentButton = page.locator('button:has-text("Student")');
    const hostButton = page.locator('button:has-text("Host/Admin")');

    // Default should be student
    await expect(studentButton).toHaveClass(/bg-primary\/5/);
    
    // Click host button
    await hostButton.click();
    await expect(hostButton).toHaveClass(/bg-primary\/5/);
    await expect(studentButton).not.toHaveClass(/bg-primary\/5/);
  });
});
