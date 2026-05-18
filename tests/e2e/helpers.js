/**
 * E2E Test Helpers
 * 
 * Shared utility functions for Playwright E2E tests
 * Includes: mock data generators, DOM helpers, validation functions
 */

const { expect } = require('@playwright/test');

/**
 * Mock article data for testing
 */
const mockArticles = [
  {
    uid: '12345678',
    title: 'Diabetes Treatment: A Comprehensive Review of Modern Therapies',
    authors: [{ name: 'Smith J' }, { name: 'Johnson A' }],
    source: 'New England Journal of Medicine',
    pubdate: '2024 Jan',
    abstract: 'This comprehensive review examines modern therapeutic approaches to diabetes management, including novel pharmacological interventions and lifestyle modifications.',
    pmcrefcount: 150,
    isFree: true,
  },
  {
    uid: '87654321',
    title: 'Cardiovascular Outcomes in Diabetes: A Meta-Analysis',
    authors: [{ name: 'Williams R' }, { name: 'Brown K' }],
    source: 'The Lancet',
    pubdate: '2023 Dec',
    abstract: 'A meta-analysis of cardiovascular outcomes in diabetic patients across multiple clinical trials.',
    pmcrefcount: 89,
    isFree: false,
  },
  {
    uid: '11223344',
    title: 'Insulin Resistance: Pathophysiology and Treatment Options',
    authors: [{ name: 'Davis M' }],
    source: 'Diabetes Care',
    pubdate: '2024 Feb',
    abstract: 'Understanding the mechanisms of insulin resistance and current treatment paradigms.',
    pmcrefcount: 45,
    isFree: true,
  },
];

/**
 * Wait for page to be fully loaded and ready for interaction
 * @param {Page} page - Playwright page object
 */
async function waitForPageReady(page) {
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded');
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  // Wait for React to render
  await page.waitForSelector('#root');
  // Additional wait for app initialization
  await page.waitForTimeout(500);
}

/**
 * Clear all local storage and session data
 * @param {Page} page - Playwright page object
 */
async function clearAppData(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('medsearch');
  });
}

/**
 * Get toast message element
 * @param {Page} page - Playwright page object
 * @returns {Locator} - Toast message locator
 */
function getToastLocator(page) {
  return page.locator('[class*="animate-slide-up"]').or(
    page.locator('div').filter({ hasText: /success|error|info/i }).first()
  );
}

/**
 * Wait for and get toast message text
 * @param {Page} page - Playwright page object
 * @param {string} type - Toast type: 'success', 'error', 'info'
 * @returns {Promise<string>} - Toast message text
 */
async function waitForToast(page, type = null) {
  const toast = getToastLocator(page);
  await toast.waitFor({ state: 'visible', timeout: 5000 });
  
  if (type) {
    const bgClass = type === 'success' ? 'bg-emerald' : 
                    type === 'error' ? 'bg-rose' : 'bg-indigo';
    await expect(toast).toHaveClass(new RegExp(bgClass));
  }
  
  return await toast.textContent();
}

/**
 * Mock search API response
 * @param {Page} page - Playwright page object
 * @param {Array} articles - Array of article objects to return
 */
async function mockSearchResults(page, articles = mockArticles) {
  await page.route('**/entrez/eutils/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        esearchresult: {
          idlist: articles.map(a => a.uid),
        },
        result: articles.reduce((acc, article) => {
          acc[article.uid] = article;
          return acc;
        }, {}),
      }),
    });
  });
}

/**
 * Perform a search with retry logic
 * @param {Page} page - Playwright page object
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<boolean>} - Success status
 */
async function performSearch(page, query, options = {}) {
  const { waitForResults = true, timeout = 30000 } = options;
  
  // Find and fill search input
  const searchInput = page.locator('input[placeholder*="research"], input[placeholder*="search"]').first();
  await searchInput.fill(query);
  
  // Click execute button
  const executeButton = page.locator('button:has-text("Execute"), button[type="submit"]').first();
  await executeButton.click();
  
  if (waitForResults) {
    try {
      // Wait for either results or empty state
      await Promise.race([
        page.waitForSelector('.article-card, [class*="article-card"]', { timeout }),
        page.waitForSelector('text=/Awaiting|No results|empty/', { timeout }),
      ]);
      return true;
    } catch (e) {
      return false;
    }
  }
  return true;
}

/**
 * Check if element has proper ARIA attributes
 * @param {Locator} locator - Playwright locator
 * @returns {Promise<boolean>} - Has ARIA attributes
 */
async function hasARIAAttributes(locator) {
  const element = await locator.elementHandle();
  if (!element) return false;
  
  const ariaLabel = await element.getAttribute('aria-label');
  const ariaDescribedBy = await element.getAttribute('aria-describedby');
  const role = await element.getAttribute('role');
  
  return !!(ariaLabel || ariaDescribedBy || role);
}

/**
 * Validate accessibility of a component
 * @param {Page} page - Playwright page object
 * @param {string} selector - Component selector
 */
async function validateAccessibility(page, selector) {
  const element = page.locator(selector).first();
  
  // Check visibility
  await expect(element).toBeVisible();
  
  // Check for ARIA attributes
  const hasAria = await hasARIAAttributes(element);
  
  // Check color contrast (basic check)
  const hasProperContrast = await element.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;
    return color !== 'transparent' && bgColor !== 'transparent';
  });
  
  return { hasAria, hasProperContrast };
}

/**
 * Generate unique test identifier
 * @returns {string} - Unique ID
 */
function generateTestId() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for loading state to complete
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Maximum wait time
 */
async function waitForLoadingComplete(page, timeout = 30000) {
  const loadingSelector = '[class*="spinner"], [class*="loading"], .fa-spinner';
  
  // Wait for loading indicator to appear (if it does)
  try {
    await page.waitForSelector(loadingSelector, { state: 'visible', timeout: 2000 });
  } catch {
    // Loading might be too fast, that's okay
  }
  
  // Wait for loading to disappear
  await page.waitForSelector(loadingSelector, { state: 'hidden', timeout });
}

/**
 * Get article card data
 * @param {Page} page - Playwright page object
 * @param {number} index - Article index (0-based)
 * @returns {Promise<Object>} - Article data
 */
async function getArticleData(page, index = 0) {
  const card = page.locator('.article-card, [class*="article-card"]').nth(index);
  
  const title = await card.locator('h3').textContent().catch(() => null);
  const authors = await card.locator('text=/et al\./, .text-xs').first().textContent().catch(() => null);
  const source = await card.locator('text=/journal|source/i').first().textContent().catch(() => null);
  
  return { title, authors, source };
}

/**
 * Save screenshot with timestamp
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Simulate network conditions
 * @param {Page} page - Playwright page object
 * @param {string} condition - Network condition: 'fast', 'slow', 'offline'
 */
async function setNetworkCondition(page, condition) {
  const conditions = {
    fast: { downloadThroughput: 10 * 1024 * 1024, uploadThroughput: 5 * 1024 * 1024, latency: 10 },
    slow: { downloadThroughput: 100 * 1024, uploadThroughput: 50 * 1024, latency: 500 },
    offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
  };
  
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: condition === 'offline',
    ...conditions[condition],
  });
}

/**
 * Wait for modal to open/close
 * @param {Page} page - Playwright page object
 * @param {boolean} shouldBeOpen - Expected modal state
 * @param {string} modalSelector - Modal container selector
 */
async function waitForModalState(page, shouldBeOpen = true, modalSelector = '[class*="fixed"][class*="z-"], [class*="modal"]') {
  const modal = page.locator(modalSelector).first();
  
  if (shouldBeOpen) {
    await expect(modal).toBeVisible({ timeout: 5000 });
  } else {
    await expect(modal).toBeHidden({ timeout: 5000 });
  }
}

module.exports = {
  // Data
  mockArticles,
  
  // Page helpers
  waitForPageReady,
  clearAppData,
  
  // Toast helpers
  getToastLocator,
  waitForToast,
  
  // API mocking
  mockSearchResults,
  
  // Search helpers
  performSearch,
  
  // Accessibility
  hasARIAAttributes,
  validateAccessibility,
  
  // Utilities
  generateTestId,
  waitForLoadingComplete,
  getArticleData,
  takeScreenshot,
  setNetworkCondition,
  waitForModalState,
};
