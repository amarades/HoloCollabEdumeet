import { test, expect } from '@playwright/test';

const seedSessionState = async (page: any) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify({
      name: 'Host',
      email: 'host@example.com',
      role: 'instructor',
    }));
    sessionStorage.setItem('room_code', 'SYNC12');
    sessionStorage.setItem('session_role', 'host');
  });
};

test.describe('Realtime Sync Smoke', () => {
  test('session page renders core realtime surfaces', async ({ page }) => {
    await seedSessionState(page);
    await page.route('**/api/models/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/session/test-session');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('video').first()).toBeVisible();
    await expect(page.locator('button[title="Participants"]')).toBeVisible();
    await expect(page.locator('button[title="Chat"]')).toBeVisible();
  });

  test('chat panel opens and closes', async ({ page }) => {
    await seedSessionState(page);
    await page.route('**/api/models/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/session/test-session');
    await page.click('button[title="Chat"]');
    await expect(page.locator('text=In-Call Messages')).toBeVisible();
    await page.click('button[title="Chat"]');
  });
});
