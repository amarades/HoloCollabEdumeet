# Playwright Testing Guide

## 🎭 What's Playwright?

Playwright is a modern end-to-end testing framework that allows you to automate browser interactions for your HoloCollab EduMeet application.

## 🚀 Getting Started

### Installation
Playwright is already installed! The browsers have been downloaded for Chromium testing.

### Available Test Scripts

```bash
# Run all tests in headless mode
npm run test

# Run tests with UI (recommended for development)
npm run test:ui

# Run tests in headed mode (see browser window)
npm run test:headed

# Debug tests step-by-step
npm run test:debug
```

## 📁 Test Structure

```
tests/
├── home-page.spec.ts     # Home page functionality
├── auth.spec.ts          # Authentication flow
├── session.spec.ts       # Session management
└── README.md            # This file
```

## 🧪 Test Coverage

### Home Page Tests (`home-page.spec.ts`)
- ✅ Page title and headings
- ✅ Navigation elements
- ✅ Call-to-action buttons
- ✅ Feature cards
- ✅ Responsive design
- ✅ Stats section

### Authentication Tests (`auth.spec.ts`)
- ✅ Signup flow
- ✅ Login flow
- ✅ Form validation
- ✅ Role selection

### Session Tests (`session.spec.ts`)
- ✅ Dashboard display
- ✅ Join session navigation
- ✅ Create session functionality
- ✅ Session page loading
- ✅ Video controls
- ✅ Sidebar tools

## 🎯 Running Tests

### Quick Test Run
```bash
# Run home page tests only
npx playwright test tests/home-page.spec.ts

# Run specific test
npx playwright test --grep "has correct title"

# Run in headed mode to see the browser
npx playwright test --headed
```

### UI Mode (Recommended for Development)
```bash
# Opens interactive test runner
npm run test:ui
```

### Debug Mode
```bash
# Step through tests with debugging
npm run test:debug
```

## 📊 Test Reports

After running tests, you can view detailed reports:

```bash
# Open HTML report
npx playwright show-report

# Reports are served at http://localhost:9323
```

## 🔧 Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5174` (your frontend)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Features**: Screenshots on failure, video recording, trace viewing

## 📱 Cross-Browser Testing

Playwright automatically tests across:
- **Desktop Chrome** (Chromium)
- **Desktop Firefox**
- **Desktop Safari** (WebKit)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## 🛠️ Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    await expect(page.locator('h1')).toContainText('Expected Text');
  });
});
```

### Best Practices
1. **Use descriptive test names**
2. **Test user workflows, not implementation details**
3. **Use data-testid attributes for complex selectors**
4. **Mock APIs for consistent testing**
5. **Test both happy paths and error cases**

### Common Selectors
```typescript
// Text-based
page.locator('text=Submit')

// CSS selectors
page.locator('button[type="submit"]')

// Test IDs (recommended)
page.locator('[data-testid="submit-button"]')

// Combined selectors
page.locator('header nav >> text=Login')
```

## 🎬 Example: Testing a Feature

Here's how you might test the AI Assistant:

```typescript
test('AI Assistant responds to messages', async ({ page }) => {
  await page.goto('/session/test-session');
  
  // Open AI Assistant
  await page.click('[data-testid="ai-assistant-button"]');
  
  // Send a message
  await page.fill('[data-testid="ai-input"]', 'Hello AI');
  await page.click('[data-testid="ai-send"]');
  
  // Verify response
  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
});
```

## 🔍 Debugging Tips

1. **Use `--headed` flag** to see what's happening
2. **Use `page.pause()`** to stop execution
3. **Use VS Code Playwright extension** for better debugging
4. **Check screenshots and videos** in test results
5. **Use trace viewer** for detailed execution analysis

## 🚀 CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npx playwright test
```

## 📝 Next Steps

1. **Add more test files** for new features
2. **Add visual regression testing** with screenshots
3. **Add performance testing** with Playwright
4. **Integrate with CI/CD pipeline**
5. **Add API testing** alongside UI tests

## 🤝 Contributing

When adding new features, please include:
- Unit tests for logic
- Integration tests for components
- E2E tests for user workflows

Happy Testing! 🎭
