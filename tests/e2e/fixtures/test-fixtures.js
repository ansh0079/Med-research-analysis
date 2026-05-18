/**
 * Test Fixtures
 * 
 * Shared test fixtures for E2E tests using Playwright's test.extend()
 * Provides pre-configured page objects and test data
 */

const { test: baseTest } = require('@playwright/test');
const HomePage = require('../page-objects/HomePage');
const ArticlePage = require('../page-objects/ArticlePage');
const ModalPage = require('../page-objects/ModalPage');
const AnalyticsPage = require('../page-objects/AnalyticsPage');

/**
 * Extended test with page object fixtures
 */
const test = baseTest.extend({
  /**
   * Home page object
   */
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  /**
   * Article page object
   */
  articlePage: async ({ page }, use) => {
    const articlePage = new ArticlePage(page);
    await use(articlePage);
  },

  /**
   * Modal page object
   */
  modalPage: async ({ page }, use) => {
    const modalPage = new ModalPage(page);
    await use(modalPage);
  },

  /**
   * Analytics page object
   */
  analyticsPage: async ({ page }, use) => {
    const analyticsPage = new AnalyticsPage(page);
    await use(analyticsPage);
  },

  /**
   * Clean storage before each test
   */
  cleanStorage: async ({ page }, use) => {
    // localStorage/sessionStorage are unavailable on about:blank in Chromium.
    // Navigate to the app origin first so cleanup runs against the right origin.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await use();
  },

  /**
   * Test data fixture
   */
  testData: async ({}, use) => {
    const testData = {
      // Common search queries
      queries: {
        valid: 'diabetes treatment',
        specific: 'type 2 diabetes metformin randomized controlled trial',
        broad: 'cancer research',
        clinical: 'covid-19 vaccine efficacy',
        rare: 'xyzabc123nonsense', // For testing empty results
      },

      // Article test data
      articles: {
        diabetes: {
          title: /diabetes/i,
          category: 'endocrinology',
        },
        cancer: {
          title: /cancer|oncology|tumor/i,
          category: 'oncology',
        },
        cardiology: {
          title: /heart|cardiac|cardiovascular/i,
          category: 'cardiology',
        },
      },

      // Viewport sizes for responsive testing
      viewports: {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1280, height: 720 },
        largeDesktop: { width: 1920, height: 1080 },
      },

      // Specificity levels
      specificityLevels: ['experimental', 'broad', 'moderate', 'strict'],

      // AI providers
      aiProviders: ['algorithm', 'mistral', 'gpt3.5'],

      // Search sources
      sources: ['pubmed', 'semantic', 'crossref'],

      // Timeouts
      timeouts: {
        short: 5000,
        medium: 15000,
        long: 30000,
        agentic: 45000,
      },
    };

    await use(testData);
  },

  /**
   * Helper functions fixture
   */
  helpers: async ({ page }, use) => {
    const helpers = {
      /**
       * Wait for toast and return message
       */
      waitForToast: async (type = null, timeout = 5000) => {
        const toast = page.locator('[class*="animate-slide-up"]').first();
        await toast.waitFor({ state: 'visible', timeout });
        const text = await toast.textContent();
        
        if (type) {
          const classes = await toast.getAttribute('class');
          const typeClass = type === 'success' ? 'bg-emerald' : 
                           type === 'error' ? 'bg-rose' : 'bg-indigo';
          if (!classes.includes(typeClass)) {
            throw new Error(`Expected ${type} toast but got: ${classes}`);
          }
        }
        
        return text;
      },

      /**
       * Dismiss any open modal
       */
      dismissModal: async () => {
        const modal = page.locator('[class*="fixed"][class*="z-"]').first();
        if (await modal.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      },

      /**
       * Mock search API response
       */
      mockSearch: async (articles) => {
        await page.route('**/entrez/eutils/**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              esearchresult: { idlist: articles.map(a => a.uid) },
              result: articles.reduce((acc, a) => { acc[a.uid] = a; return acc; }, {}),
            }),
          });
        });
      },

      /**
       * Wait for search to complete
       */
      waitForSearchComplete: async (timeout = 30000) => {
        const startTime = Date.now();
        
        // Wait for loading spinner to appear and disappear
        try {
          await page.waitForSelector('[class*="spinner"], [class*="fa-spinner"]', { 
            state: 'visible', 
            timeout: 2000 
          });
        } catch {
          // Loading might be instant
        }
        
        // Wait for results or empty state
        while (Date.now() - startTime < timeout) {
          const hasResults = await page.locator('.article-card, [class*="article-card"]').count() > 0;
          const hasEmptyState = await page.locator('text=/Awaiting|No results/i').count() > 0;
          
          if (hasResults || hasEmptyState) {
            await page.waitForTimeout(300); // Wait for animations
            return;
          }
          
          await page.waitForTimeout(100);
        }
        
        throw new Error('Search did not complete within timeout');
      },

      /**
       * Get all visible text on page
       */
      getAllText: async () => {
        return await page.evaluate(() => document.body.innerText);
      },

      /**
       * Check if element is in viewport
       */
      isInViewport: async (selector) => {
        return await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return false;
          
          const rect = element.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        }, selector);
      },

      /**
       * Scroll to element
       */
      scrollToElement: async (selector) => {
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, selector);
        await page.waitForTimeout(300);
      },
    };

    await use(helpers);
  },
});

/**
 * Test with automatic cleanup after each test
 */
const testWithCleanup = test.extend({
  page: async ({ page }, use) => {
    await use(page);
    
    // Cleanup after each test
    await page.evaluate(() => {
      // Close any open modals
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
    });
  },
});

module.exports = { test, testWithCleanup };
