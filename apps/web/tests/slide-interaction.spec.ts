import { test, expect } from '@playwright/test';

const seedHostState = async (page: any) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify({
      name: 'Presenter',
      email: 'presenter@example.com',
      role: 'instructor',
    }));
    sessionStorage.setItem('room_code', 'SLIDE1');
    sessionStorage.setItem('session_role', 'host');
  });
};

test.describe('Slide Interaction Smoke', () => {
  test('presentation mode toggle button exists for host', async ({ page }) => {
    await seedHostState(page);
    await page.route('**/api/models/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/session/test-session');
    await expect(page.locator('button:has-text("Slide Mode")')).toBeVisible();
  });
});
