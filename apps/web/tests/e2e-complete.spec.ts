import { test, expect } from '@playwright/test';

const seedAuth = async (page: any, name = 'Host User', role = 'instructor') => {
  await page.addInitScript((payload: any) => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(payload));
  }, { name, email: `${name.replace(/\s+/g, '').toLowerCase()}@example.com`, role });
};

test.describe('HoloCollab End-to-End Smoke', () => {
  test('home -> signup -> dashboard', async ({ page }) => {
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          user_name: 'Final Test',
          role: 'student',
        }),
      });
    });

    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Premium 3D/i);
    await page.click('button:has-text("Get Started")');
    await expect(page).toHaveURL(/.*signup/);

    const inputs = page.locator('form input');
    await inputs.nth(0).fill('Final Test');
    await inputs.nth(1).fill('final@example.com');
    await inputs.nth(2).fill('password123');
    await page.click('button:has-text("START LEARNING")');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('dashboard -> create session -> lobby', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/sessions/create', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          room_code: 'TEST12',
          role: 'host',
          session_name: 'Test Host Session',
          topic: 'General',
        }),
      });
    });

    await page.goto('/dashboard');
    await page.click('text=Start New Session');
    await expect(page).toHaveURL(/.*lobby\?session=test-session-id/);
    await expect(page.locator('text=TEST12')).toBeVisible();
  });

  test('join flow from home room code', async ({ page }) => {
    await page.route('**/api/sessions/validate/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          session_name: 'Test Session',
          topic: 'General',
          participants: [{ id: 'p1', name: 'Host' }],
          host_id: 'host-1',
        }),
      });
    });
    await page.route('**/api/sessions/join', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          room_code: 'ABC123',
          role: 'student',
        }),
      });
    });

    await page.goto('/');
    await page.fill('input[placeholder="Enter code"]', 'ABC123');
    await page.click('button:has-text("Join")');
    await expect(page).toHaveURL(/.*join\?code=ABC123/);

    await page.fill('input[placeholder="Enter display name"]', 'Guest');
    await page.click('button:has-text("Join Now")');
    await expect(page).toHaveURL(/.*lobby\?session=test-session-id/);
  });
});
