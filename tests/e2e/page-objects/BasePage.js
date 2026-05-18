/**
 * Base Page Object
 * 
 * Common functionality shared across all page objects
 * Provides wrapper methods for common Playwright operations
 */

class BasePage {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  }

  /**
   * Navigate to a specific path
   * @param {string} path - URL path (relative to base URL)
   */
  async navigate(path = '') {
    await this.page.goto(`${this.baseUrl}${path}`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible and click
   * @param {string|Locator} selector - Element selector or locator
   * @param {Object} options - Click options
   */
  async click(selector, options = {}) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: options.timeout || 10000 });
    await locator.click(options);
  }

  /**
   * Fill input field with value
   * @param {string|Locator} selector - Input selector or locator
   * @param {string} value - Value to fill
   */
  async fill(selector, value) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible' });
    await locator.fill(value);
  }

  /**
   * Clear input field
   * @param {string|Locator} selector - Input selector or locator
   */
  async clearInput(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.fill('');
  }

  /**
   * Get text content of element
   * @param {string|Locator} selector - Element selector or locator
   * @returns {Promise<string>} - Element text content
   */
  async getText(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.textContent();
  }

  /**
   * Check if element exists
   * @param {string|Locator} selector - Element selector or locator
   * @returns {Promise<boolean>} - Element exists
   */
  async exists(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.count() > 0;
  }

  /**
   * Wait for element to be visible
   * @param {string|Locator} selector - Element selector or locator
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForVisible(selector, timeout = 10000) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   * @param {string|Locator} selector - Element selector or locator
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForHidden(selector, timeout = 10000) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Scroll element into view
   * @param {string|Locator} selector - Element selector or locator
   */
  async scrollTo(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   * @param {string|Locator} selector - Element selector or locator
   */
  async hover(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.hover();
  }

  /**
   * Press keyboard key
   * @param {string} key - Key to press
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /**
   * Take screenshot
   * @param {string} name - Screenshot filename
   */
  async screenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Get current URL
   * @returns {Promise<string>} - Current URL
   */
  async getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Wait for specific time
   * @param {number} ms - Milliseconds to wait
   */
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Execute JavaScript in page context
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments to pass
   * @returns {Promise<any>} - Function result
   */
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  /**
   * Set viewport size
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   */
  async setViewport(width, height) {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Check if element is visible
   * @param {string|Locator} selector - Element selector or locator
   * @returns {Promise<boolean>} - Element is visible
   */
  async isVisible(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.isVisible();
  }

  /**
   * Get element count
   * @param {string|Locator} selector - Element selector or locator
   * @returns {Promise<number>} - Element count
   */
  async getCount(selector) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.count();
  }
}

module.exports = BasePage;
