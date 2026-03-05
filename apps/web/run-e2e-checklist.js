#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎯 HoloCollab EduMeet - E2E Checklist Runner\n');
console.log('📋 Complete End-to-End Testing Plan\n');

const checklist = `
╔══════════════════════════════════════════════════════════════╗
║                    E2E TESTING CHECKLIST                        ║
╚══════════════════════════════════════════════════════════════╝

1. 🏠 Verify Home Page (http://localhost:5174/)
   ├─ [ ] Responsive UI & Buttons
   └─ [ ] Styling looks good

2. 📊 Dashboard/Session Creation
   ├─ [ ] Navigate to Dashboard/Lobby
   └─ [ ] Create/Join a session

3. 🎥 Pre-Join Lobby
   ├─ [ ] Enter display name
   └─ [ ] Verify preview/settings

4. 🎮 Main Session UI (Tab 1 - "Host")
   ├─ [ ] Video Grid
   ├─ [ ] AR Scene
   └─ [ ] Sidebar tools

5. 👥 Multiplayer Verification (Tab 2 - "Guest")
   ├─ [ ] Open Guest tab in same room
   ├─ [ ] Join as Guest
   └─ [ ] Check User list updates

6. 🚀 Feature Testing (Cross-tab)
   ├─ [ ] 3D Object Sync (Spawn Box)
   ├─ [ ] AI Assistant message/response
   ├─ [ ] Raise Hand sync
   └─ [ ] Emoji reactions sync

7. 📝 Final Report/Fixing issues

`;

console.log(checklist);

const menu = `
Choose an option:

1. 🏠 Run Home Page Tests (Checklist Item 1)
2. 📊 Run Dashboard Tests (Checklist Item 2)
3. 🎥 Run Pre-Join Lobby Tests (Checklist Item 3)
4. 🎮 Run Session UI Tests (Checklist Item 4)
5. 👥 Run Multiplayer Tests (Checklist Item 5)
6. 🚀 Run Feature Tests (Checklist Item 6)
7. 📝 Run Final Report Tests (Checklist Item 7)
8. 🎯 RUN COMPLETE E2E SUITE (All Items)
9. 🎬 Run in Interactive UI Mode
10. 👀 Run in Headed Mode (See Browser)
11. 📊 View Last Test Report
12. ❌ Exit

`;

function showMenu() {
  rl.question(menu, (choice) => {
    switch(choice.trim()) {
      case '1':
        console.log('🏠 Running Home Page Tests...\n');
        console.log('✅ Testing: Responsive UI & Buttons, Styling\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Home Page Verification"', { stdio: 'inherit' });
        break;
      case '2':
        console.log('📊 Running Dashboard Tests...\n');
        console.log('✅ Testing: Navigate to Dashboard/Lobby, Create/Join session\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Dashboard/Session Creation"', { stdio: 'inherit' });
        break;
      case '3':
        console.log('🎥 Running Pre-Join Lobby Tests...\n');
        console.log('✅ Testing: Enter display name, Verify preview/settings\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Pre-Join Lobby"', { stdio: 'inherit' });
        break;
      case '4':
        console.log('🎮 Running Session UI Tests...\n');
        console.log('✅ Testing: Video Grid, AR Scene, Sidebar tools\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Main Session UI"', { stdio: 'inherit' });
        break;
      case '5':
        console.log('👥 Running Multiplayer Tests...\n');
        console.log('✅ Testing: Guest tab, Join as Guest, User list updates\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Multiplayer Verification"', { stdio: 'inherit' });
        break;
      case '6':
        console.log('🚀 Running Feature Tests...\n');
        console.log('✅ Testing: 3D Object Sync, AI Assistant, Raise Hand, Emoji reactions\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Feature Testing"', { stdio: 'inherit' });
        break;
      case '7':
        console.log('📝 Running Final Report Tests...\n');
        console.log('✅ Testing: Final Report/Issues\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --grep "Final Report"', { stdio: 'inherit' });
        break;
      case '8':
        console.log('🎯 RUNNING COMPLETE E2E SUITE...\n');
        console.log('🚀 Testing all checklist items from 1-7\n');
        console.log('⏱️  This may take a few minutes...\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts', { stdio: 'inherit' });
        console.log('\n✅ E2E Checklist Complete!');
        console.log('📊 Check the report for detailed results\n');
        break;
      case '9':
        console.log('🎬 Starting Interactive UI Mode...\n');
        console.log('📱 This will open the Playwright Test Runner in your browser\n');
        console.log('🎯 You can select individual tests from the E2E suite\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --ui', { stdio: 'inherit' });
        break;
      case '10':
        console.log('👀 Running Tests in Headed Mode...\n');
        console.log('🌐 You will see the browser window during testing\n');
        console.log('🎬 Perfect for debugging and visual verification\n');
        execSync('npx playwright test tests/e2e-complete.spec.ts --headed', { stdio: 'inherit' });
        break;
      case '11':
        console.log('📊 Opening Test Report...\n');
        console.log('📈 View detailed results and screenshots\n');
        execSync('npx playwright show-report', { stdio: 'inherit' });
        break;
      case '12':
        console.log('👋 Goodbye!');
        console.log('📝 Don\'t forget to check your test results!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid choice. Please try again.\n');
    }
    
    if (choice.trim() !== '12') {
      console.log('\n' + '='.repeat(60) + '\n');
      setTimeout(() => showMenu(), 1000);
    }
  });
}

console.log('🚀 Make sure your application is running on http://localhost:5174\n');
console.log('📋 All backend services should be running\n');
console.log('🎯 Let\'s start the E2E testing!\n');

showMenu();
