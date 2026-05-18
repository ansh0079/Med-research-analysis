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

  console.log('✅ Setup complete\n');
}

module.exports = globalSetup;
