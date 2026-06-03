import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Tablet Chrome',
      use: { ...devices['Galaxy Tab S4'] },
    },
    {
      name: 'Tablet Safari',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'Desktop Chrome HiDPI',
      use: { ...devices['Desktop Chrome HiDPI'] },
    },
    // Authenticated project — reuses real login state from globalSetup
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: [],
    },
  ],
  webServer: {
    command: 'npm run build && npm run start:prod',
    url: 'http://localhost:3002/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: process.env.JWT_SECRET || 'playwright-local-jwt-secret-change-me',
      CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3002',
      BASE_URL: process.env.BASE_URL || 'http://localhost:3002',
    },
  },
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  expect: {
    timeout: 10000,
  },
  outputDir: 'test-results/',
});
