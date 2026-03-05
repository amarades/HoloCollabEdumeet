#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎭 HoloCollab EduMeet - Playwright Test Runner\n');

const menu = `
Choose a testing option:

1. 🏠 Run Home Page Tests
2. 🔐 Run Authentication Tests  
3. 🎥 Run Session Tests
4. 🚀 Run All Tests
5. 🎬 Run Tests in UI Mode (Interactive)
6. 👀 Run Tests in Headed Mode (See Browser)
7. 🐛 Debug Tests
8. 📊 View Last Test Report
9. ❌ Exit

`;

function showMenu() {
  rl.question(menu, (choice) => {
    switch(choice.trim()) {
      case '1':
        console.log('🏠 Running Home Page Tests...\n');
        execSync('npx playwright test tests/home-page.spec.ts', { stdio: 'inherit' });
        break;
      case '2':
        console.log('🔐 Running Authentication Tests...\n');
        execSync('npx playwright test tests/auth.spec.ts', { stdio: 'inherit' });
        break;
      case '3':
        console.log('🎥 Running Session Tests...\n');
        execSync('npx playwright test tests/session.spec.ts', { stdio: 'inherit' });
        break;
      case '4':
        console.log('🚀 Running All Tests...\n');
        execSync('npx playwright test', { stdio: 'inherit' });
        break;
      case '5':
        console.log('🎬 Starting UI Mode...\n');
        console.log('📱 This will open the Playwright Test Runner in your browser\n');
        execSync('npx playwright test --ui', { stdio: 'inherit' });
        break;
      case '6':
        console.log('👀 Running Tests in Headed Mode...\n');
        console.log('🌐 You will see the browser window during testing\n');
        execSync('npx playwright test --headed', { stdio: 'inherit' });
        break;
      case '7':
        console.log('🐛 Starting Debug Mode...\n');
        console.log('⏸️ Tests will pause for debugging\n');
        execSync('npx playwright test --debug', { stdio: 'inherit' });
        break;
      case '8':
        console.log('📊 Opening Test Report...\n');
        execSync('npx playwright show-report', { stdio: 'inherit' });
        break;
      case '9':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid choice. Please try again.\n');
    }
    
    if (choice.trim() !== '9') {
      setTimeout(() => showMenu(), 1000);
    }
  });
}

showMenu();
