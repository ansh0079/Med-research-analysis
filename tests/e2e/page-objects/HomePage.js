/**
 * Home Page Object
 * 
 * Represents the main application page with search functionality
 * Contains methods for search, filters, and navigation
 */

const BasePage = require('./BasePage');

class HomePage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors - organized by component
    this.selectors = {
      // Header
      appTitle: 'h1:has-text("Antigravity Research")',
      settingsButton: 'button:has(i.fas.fa-cog)',
      
      // Search section
      searchInput: 'input[placeholder*="research hypothesis"], input[placeholder*="research"]',
      executeButton: 'button:has-text("Execute")',
      agenticSearchButton: 'button[title*="Multi-vector"], button:has(i.fas.fa-magic):not(:has-text("AI"))',
      batchModeButton: 'button[title*="Batch Selection"], button:has(i.fas.fa-layer-group):not(:has-text("Clusters"))',
      
      // Source selector
      sourceSelector: {
        pubmed: 'button:has-text("PubMed")',
        semantic: 'button:has-text("Semantic Scholar")',
        crossref: 'button:has-text("Crossref")',
      },
      
      // Specificity selector
      specificity: {
        experimental: 'button:has-text("experimental")',
        broad: 'button:has-text("broad")',
        moderate: 'button:has-text("moderate")',
        strict: 'button:has-text("strict")',
      },
      
      // Navigation buttons
      memoryButton: 'button:has-text("Memory")',
      clustersButton: 'button:has-text("Clusters")',
      aiAssistantButton: 'button:has-text("AI Assistant")',
      eventLogButton: 'button:has-text("Event Log")',
      learnButton: 'button:has-text("Learn")',
      
      // Results section
      resultsContainer: '[class*="grid grid-cols-1"], section[class*="grid"]',
      articleCard: '.article-card, [class*="article-card"]',
      researchVisualization: 'text=/Research Intelligence|Timeline|Journals/',
      
      // Loading states
      skeletonLoader: '[class*="animate-pulse"]',
      spinner: '[class*="fa-spinner"], [class*="spinner"]',
      
      // Empty state
      emptyState: 'text=/Awaiting Protocol Input/',
    };
  }

  /**
   * Navigate to home page
   */
  async goto() {
    await this.navigate('/index.html');
    await this.waitForAppLoad();
  }

  /**
   * Wait for app to fully load
   */
  async waitForAppLoad() {
    await this.waitForVisible(this.selectors.appTitle);
    await this.waitForVisible(this.selectors.searchInput);
  }

  /**
   * Perform search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async search(query, options = {}) {
    const { waitForResults = true, timeout = 30000 } = options;
    
    // Clear any existing text and type query
    await this.clearInput(this.selectors.searchInput);
    await this.fill(this.selectors.searchInput, query);
    
    // Click execute
    await this.click(this.selectors.executeButton);
    
    if (waitForResults) {
      await this.waitForSearchComplete(timeout);
    }
  }

  /**
   * Perform agentic (AI-powered) search
   * @param {string} query - Search query
   */
  async agenticSearch(query) {
    await this.clearInput(this.selectors.searchInput);
    await this.fill(this.selectors.searchInput, query);
    await this.click(this.selectors.agenticSearchButton);
    await this.waitForSearchComplete(45000); // Agentic search takes longer
  }

  /**
   * Wait for search to complete
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForSearchComplete(timeout = 30000) {
    // Wait for loading to finish (spinner to disappear)
    try {
      await this.page.waitForSelector(this.selectors.spinner, { 
        state: 'visible', 
        timeout: 2000 
      });
    } catch {
      // Loading might be instant
    }
    
    // Wait for either results or empty state
    await Promise.race([
      this.waitForVisible(this.selectors.articleCard, timeout).catch(() => {}),
      this.waitForVisible(this.selectors.emptyState, timeout).catch(() => {}),
    ]);
    
    // Small delay for animations
    await this.wait(300);
  }

  /**
   * Get search results count
   * @returns {Promise<number>} - Number of results
   */
  async getResultsCount() {
    return await this.getCount(this.selectors.articleCard);
  }

  /**
   * Check if results are displayed
   * @returns {Promise<boolean>} - Has results
   */
  async hasResults() {
    return await this.getResultsCount() > 0;
  }

  /**
   * Get first result article data
   * @returns {Promise<Object>} - Article data
   */
  async getFirstResult() {
    const card = this.page.locator(this.selectors.articleCard).first();
    
    const title = await card.locator('h3').textContent().catch(() => null);
    const authors = await card.locator('text=/et al\.|, .+/').first().textContent().catch(() => null);
    const source = await card.locator('text=/journal|source|PubMed/i').first().textContent().catch(() => null);
    
    return { title, authors, source, element: card };
  }

  /**
   * Toggle search source
   * @param {string} source - Source name: 'pubmed', 'semantic', 'crossref'
   */
  async toggleSource(source) {
    const selector = this.selectors.sourceSelector[source];
    if (selector) {
      await this.click(selector);
    }
  }

  /**
   * Set search specificity
   * @param {string} level - Specificity level: 'experimental', 'broad', 'moderate', 'strict'
   */
  async setSpecificity(level) {
    const selector = this.selectors.specificity[level];
    if (selector) {
      await this.click(selector);
      await this.wait(500); // Wait for specificity change to apply
    }
  }

  /**
   * Open settings modal
   */
  async openSettings() {
    await this.click(this.selectors.settingsButton);
    await this.wait(500);
  }

  /**
   * Open memory/history modal
   */
  async openMemory() {
    await this.click(this.selectors.memoryButton);
    await this.wait(500);
  }

  /**
   * Open clusters/collections modal
   */
  async openClusters() {
    await this.click(this.selectors.clustersButton);
    await this.wait(500);
  }

  /**
   * Open AI Assistant
   */
  async openAIAssistant() {
    await this.click(this.selectors.aiAssistantButton);
    await this.wait(500);
  }

  /**
   * Get current specificity level
   * @returns {Promise<string>} - Current specificity
   */
  async getCurrentSpecificity() {
    // Try to find the active specificity button
    for (const [level, selector] of Object.entries(this.selectors.specificity)) {
      const locator = this.page.locator(selector);
      const hasActiveClass = await locator.evaluate(el => 
        el.classList.contains('bg-indigo-600') || 
        el.classList.contains('ring-2') ||
        el.classList.contains('border-indigo')
      ).catch(() => false);
      
      if (hasActiveClass) return level;
    }
    return 'moderate'; // default
  }

  /**
   * Get toast/notification message
   * @returns {Promise<string|null>} - Toast message
   */
  async getToastMessage() {
    const toast = this.page.locator('[class*="animate-slide-up"]').first();
    try {
      await toast.waitFor({ state: 'visible', timeout: 2000 });
      return await toast.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Wait for and get toast message
   * @param {string} type - Expected toast type: 'success', 'error', 'info'
   * @returns {Promise<string>} - Toast message
   */
  async waitForToast(type = null) {
    const toast = this.page.locator('[class*="animate-slide-up"]').first();
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    
    const text = await toast.textContent();
    
    if (type) {
      const expectedClass = type === 'success' ? 'bg-emerald' : 
                           type === 'error' ? 'bg-rose' : 'bg-indigo';
      const classes = await toast.getAttribute('class');
      if (!classes.includes(expectedClass)) {
        throw new Error(`Expected ${type} toast, got: ${classes}`);
      }
    }
    
    return text;
  }

  /**
   * Check if loading state is visible
   * @returns {Promise<boolean>} - Is loading
   */
  async isLoading() {
    return await this.isVisible(this.selectors.spinner) || 
           await this.getCount(this.selectors.skeletonLoader) > 0;
  }

  /**
   * Get parsed query pills
   * @returns {Promise<Array>} - Array of pill texts
   */
  async getQueryPills() {
    const pills = this.page.locator('[class*="rounded-full"]:has-text("TARGETING")').locator('..').locator('span');
    const count = await pills.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await pills.nth(i).textContent());
    }
    return texts;
  }
}

module.exports = HomePage;
