/**
 * Auth Fixtures for Playwright E2E Tests
 *
 * Provides an `authenticatedPage` fixture that reuses the globally
 * authenticated browser state saved by global-setup.js.
 */

const { test: base, expect } = require('@playwright/test');
const path = require('path');

const authStorageState = path.join(__dirname, '..', '.auth', 'user.json');

const test = base.extend({
  /**
   * Page that starts already logged in (reuses global setup storageState).
   */
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: authStorageState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

module.exports = { test, expect };
