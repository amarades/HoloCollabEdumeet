import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - in real tests you'd login first
    await page.goto('/dashboard');
  });

  test('dashboard displays correctly', async ({ page }) => {
    // Check dashboard elements
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Join Session')).toBeVisible();
    await expect(page.locator('text=Create Session')).toBeVisible();
    await expect(page.locator('text=Sign Out')).toBeVisible();
  });

  test('join session navigation works', async ({ page }) => {
    await page.click('text=Join Session');
    await expect(page).toHaveURL(/.*join/);
    
    // Check join session page elements
    await expect(page.locator('text=Join Meeting')).toBeVisible();
    await expect(page.locator('input[placeholder*="XXXXXX"]')).toBeVisible();
  });

  test('create session button works', async ({ page }) => {
    // Mock the session creation API
    await page.route('**/api/sessions/create', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          room_code: 'TEST123',
          session_name: "Test User's Session",
          topic: 'General'
        })
      });
    });

    await page.click('text=Create Session');
    
    // Should show loading state
    await expect(page.locator('text=Creating...')).toBeVisible();
    
    // Should redirect to session page
    await expect(page).toHaveURL(/.*session\/test-session-id/, { timeout: 10000 });
  });

  test('session page loads correctly', async ({ page }) => {
    // Mock session data
    await page.goto('/session/test-session-id');
    
    // Check session elements
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('video')).toBeVisible();
    
    // Check control buttons
    await expect(page.locator('button[title*="Microphone"]')).toBeVisible();
    await expect(page.locator('button[title*="Camera"]')).toBeVisible();
    await expect(page.locator('button[title*="Hand Tracking"]')).toBeVisible();
    await expect(page.locator('text=Leave Call')).toBeVisible();
  });

  test('video controls work', async ({ page }) => {
    await page.goto('/session/test-session-id');
    
    // Test microphone toggle
    const micButton = page.locator('button:has(Mic), button:has(MicOff)');
    await micButton.click();
    
    // Test camera toggle
    const videoButton = page.locator('button:has(Video), button:has(VideoOff)');
    await videoButton.click();
    
    // Test hand tracking toggle
    const handButton = page.locator('button:has-text("✋")');
    await handButton.click();
  });

  test('sidebar tools are accessible', async ({ page }) => {
    await page.goto('/session/test-session-id');
    
    // Check for sidebar tools
    await expect(page.locator('[data-testid="sidebar-tools"]')).toBeVisible();
    
    // Test AI assistant button
    const aiButton = page.locator('button[title*="AI"]');
    if (await aiButton.isVisible()) {
      await aiButton.click();
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    }
  });
});
