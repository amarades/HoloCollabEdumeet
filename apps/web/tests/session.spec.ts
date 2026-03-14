import { test, expect } from '@playwright/test';

const seedAuth = async (page: any, name = 'Test Host', role = 'instructor') => {
  await page.addInitScript((payload: any) => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(payload));
  }, { name, email: 'test@example.com', role });
};

test.describe('Session Management', () => {
  test('dashboard displays correctly', async ({ page }) => {
    await seedAuth(page);
    await page.goto('/dashboard');

    await expect(page.locator('text=Join Session')).toBeVisible();
    await expect(page.locator('text=Start New Session')).toBeVisible();
    await expect(page.locator('text=Log Out')).toBeVisible();
  });

  test('join session navigation works', async ({ page }) => {
    await seedAuth(page);
    await page.goto('/dashboard');
    await page.click('text=Join Session');
    await expect(page).toHaveURL(/.*join/);
    await expect(page.locator('text=Join Session')).toBeVisible();
  });

  test('create session flow works', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/sessions/create', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          room_code: 'ABC123',
          role: 'host',
          session_name: 'Test Session',
          topic: 'General',
        }),
      });
    });

    await page.goto('/dashboard');
    await page.click('text=Start New Session');
    await expect(page).toHaveURL(/.*lobby\?session=test-session-id/);
  });
});
