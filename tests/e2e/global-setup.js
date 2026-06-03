/**
 * Global Setup for Playwright Tests
 * 
 * Runs once before all test suites
 * - Starts test server if needed
 * - Prepares test environment
 * - Sets up global test data
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup() {
  console.log('\n🔧 Setting up E2E test environment...\n');

  // Create test results directories
  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  ✓ Created directory: ${dir}`);
    }
  });

  // Verify test server is accessible
  const baseURL = process.env.BASE_URL || 'http://localhost:3002';
  console.log(`  ℹ️  Testing server at ${baseURL}...`);

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Attempt to connect to server
    const response = await page.goto(baseURL, { timeout: 10000 }).catch(() => null);
    
    if (response && response.ok()) {
      console.log('  ✓ Server is accessible\n');
    } else {
      console.log('  ⚠️  Server may not be running. Tests will attempt to start it.\n');
    }
    
    await browser.close();
  } catch (error) {
    console.log('  ⚠️  Could not verify server. Tests will attempt to start it.\n');
    if (browser) await browser.close();
  }

  // Set environment variables for tests
  process.env.TEST_RUN_ID = `run-${Date.now()}`;
  process.env.NODE_ENV = 'test';

  // --- Real auth setup (for authenticated E2E flows) ---
  console.log('  ℹ️  Setting up real auth test user...');
  try {
    const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const runId = Date.now();
    const testEmail = `e2e-${runId}@test.local`;
    const testPassword = 'TestPass123!';

    const registerRes = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Test User', email: testEmail, password: testPassword }),
    });

    if (!registerRes.ok && registerRes.status !== 409) {
      const body = await registerRes.text().catch(() => '');
      console.log(`  ⚠️  Registration warning: ${registerRes.status} ${body}`);
    }

    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    if (loginRes.ok) {
      const setCookie = loginRes.headers.get('set-cookie');
      if (setCookie) {
        const cookieName = setCookie.split('=')[0];
        const cookieValue = setCookie.split(';')[0].split('=').slice(1).join('=');
        const storageState = {
          cookies: [
            {
              name: cookieName,
              value: cookieValue,
              domain: new URL(baseURL).hostname,
              path: '/',
              expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
              httpOnly: true,
              secure: new URL(baseURL).protocol === 'https:',
              sameSite: 'Lax',
            },
          ],
          origins: [],
        };
        fs.writeFileSync(path.join(authDir, 'user.json'), JSON.stringify(storageState, null, 2));
        fs.writeFileSync(path.join(authDir, 'test-user-meta.json'), JSON.stringify({ email: testEmail, runId }, null, 2));
        console.log('  ✓ Auth state saved\n');
      }
    } else {
      console.log('  ⚠️  Login failed; authenticated tests may not work\n');
    }
  } catch (err) {
    console.log(`  ⚠️  Auth setup failed: ${err.message}\n`);
  }

  console.log('✅ Setup complete\n');
}

module.exports = globalSetup;
