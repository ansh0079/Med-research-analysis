/**
 * Modal/Page Object
 * 
 * Represents various modals in the application
 */

const BasePage = require('./BasePage');

class ModalPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Generic modal elements
      modalOverlay: '[class*="fixed"][class*="z-"]:has([class*="rounded-3xl"]), [class*="modal-overlay"]',
      modalContainer: '[class*="rounded-3xl"][class*="shadow-2xl"]',
      closeButton: 'button:has(i.fas.fa-times), button[aria-label*="close" i]',
      
      // Settings Modal
      settings: {
        title: 'text=/Settings/i',
        specificityButtons: 'button:has-text("moderate"), button:has-text("strict"), button:has-text("experimental")',
        aiProviderOptions: 'input[name="aiProvider"]',
        saveButton: 'button:has-text("Save Configuration")',
      },
      
      // Memory/History Modal
      memory: {
        title: 'text=/Research Neural Memory|Memory/i',
        sessionItem: '[class*="rounded-2xl"]:has-text("SEARCH_EXECUTED")',
        emptyState: 'text=/Memory banks empty/i',
      },
      
      // Collections/Clusters Modal
      clusters: {
        title: 'text=/Intellectual Collections|Clusters/i',
        collectionCard: '[class*="rounded-3xl"][class*="bg-purple"]',
        emptyState: 'text=/No collections/i',
      },
      
      // AI Analysis Panel
      aiAnalysis: {
        title: 'text=/AI RESEARCH INTELLIGENCE/i',
        tabs: 'button:has-text("Overview"), button:has-text("Key Pillars"), button:has-text("Methodology")',
        confidenceScore: 'text=/Confidence Score/i',
        closeButton: 'button:has-text("FINISH REVIEW")',
      },
      
      // Comparative Analysis Modal
      comparative: {
        title: 'text=/Comparative Intelligence Matrix|AI Comparative Analysis/i',
        articleSelection: '[class*="rounded-xl"][class*="cursor-pointer"]',
        compareButton: 'button:has-text("Compare")',
        similarityScore: 'text=/Similarity Index/i',
        tabs: 'button:has-text("overview"), button:has-text("methodology"), button:has-text("findings")',
      },
      
      // Citation Graph Modal
      citationGraph: {
        title: 'text=/CITATION NETWORK GRAPH/i',
        loading: 'text=/Mapping Scientific Influence/i',
      },
      
      // Synthesis Report Modal
      synthesis: {
        title: 'text=/Evidence Synthesis/i',
        summary: 'text=/Executive Summary/i',
        findings: '[class*="rounded-xl"]:has([class*="rounded-full"])',
      },
      
      // Batch Analysis Modal
      batch: {
        title: 'text=/Batch Intelligence/i',
        generateButton: 'button:has-text("Generate Batch Report")',
        consensusLevel: 'text=/Landscape Consensus/i',
      },
      
      // Learning Hub Modal
      learning: {
        title: 'text=/Learning Hub/i',
        modules: '[class*="rounded-3xl"][class*="cursor-pointer"]',
      },
      
      // Research Log Modal
      log: {
        title: 'text=/Event Protocol Log/i',
        logEntry: '[class*="rounded-2xl"]:has(i.fas.fa-search)',
      },
    };
  }

  /**
   * Check if any modal is open
   * @returns {Promise<boolean>} - Modal is open
   */
  async isModalOpen() {
    return await this.isVisible(this.selectors.modalOverlay);
  }

  /**
   * Close current modal
   */
  async closeModal() {
    // Try clicking close button first
    const closeBtn = this.page.locator(this.selectors.closeButton).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      // Try pressing Escape key
      await this.pressKey('Escape');
    }
    await this.wait(300);
  }

  /**
   * Close modal by clicking overlay
   */
  async closeByOverlay() {
    const overlay = this.page.locator(this.selectors.modalOverlay).first();
    const box = await overlay.boundingBox();
    if (box) {
      // Click on the edge (overlay area)
      await overlay.click({ position: { x: 10, y: 10 } });
    }
    await this.wait(300);
  }

  /**
   * Get modal title
   * @returns {Promise<string|null>} - Modal title
   */
  async getModalTitle() {
    const modal = this.page.locator(this.selectors.modalContainer).first();
    const title = modal.locator('h2, h3').first();
    try {
      return await title.textContent();
    } catch {
      return null;
    }
  }

  // ==================== Settings Modal ====================

  /**
   * Check if settings modal is open
   * @returns {Promise<boolean>} - Is open
   */
  async isSettingsOpen() {
    return await this.isVisible(this.selectors.settings.title);
  }

  /**
   * Set AI provider in settings
   * @param {string} provider - Provider: 'algorithm', 'mistral', 'gpt3.5'
   */
  async setAIProvider(provider) {
    const radio = this.page.locator(`input[name="aiProvider"][value="${provider}"]`);
    await radio.click();
    await this.wait(200);
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.click(this.selectors.settings.saveButton);
    await this.wait(500);
  }

  /**
   * Set search specificity in settings
   * @param {string} specificity - 'moderate', 'strict', 'experimental'
   */
  async setSpecificity(specificity) {
    const button = this.page.locator(`button:has-text("${specificity}")`).first();
    await button.click();
    await this.wait(200);
  }

  /**
   * Set API key
   * @param {string} service - Service name: 'openai', 'semantic', 'openalex'
   * @param {string} key - API key
   */
  async setApiKey(service, key) {
    const input = this.page.locator(`input[placeholder*="${service}"], input[name*="${service}"]`).first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(key);
    }
  }

  // ==================== Memory/History Modal ====================

  /**
   * Check if memory modal is open
   * @returns {Promise<boolean>} - Is open
   */
  async isMemoryOpen() {
    return await this.isVisible(this.selectors.memory.title);
  }

  /**
   * Get search history items
   * @returns {Promise<Array>} - History items
   */
  async getHistoryItems() {
    const items = this.page.locator(this.selectors.memory.sessionItem);
    const count = await items.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      history.push(text);
    }
    
    return history;
  }

  /**
   * Check if history is empty
   * @returns {Promise<boolean>} - Is empty
   */
  async isHistoryEmpty() {
    return await this.isVisible(this.selectors.memory.emptyState);
  }

  /**
   * Click on a history item to re-run search
   * @param {number} index - Item index
   */
  async clickHistoryItem(index = 0) {
    const item = this.page.locator(this.selectors.memory.sessionItem).nth(index);
    await item.click();
    await this.wait(500);
  }

  // ==================== Collections/Clusters Modal ====================

  /**
   * Check if clusters modal is open
   * @returns {Promise<boolean>} - Is open
   */
  async isClustersOpen() {
    return await this.isVisible(this.selectors.clusters.title);
  }

  /**
   * Get collection count
   * @returns {Promise<number>} - Number of collections
   */
  async getCollectionCount() {
    return await this.getCount(this.selectors.clusters.collectionCard);
  }

  /**
   * Click on a collection
   * @param {number} index - Collection index
   */
  async clickCollection(index = 0) {
    const collection = this.page.locator(this.selectors.clusters.collectionCard).nth(index);
    await collection.click();
    await this.wait(300);
  }

  // ==================== AI Analysis Panel ====================

  /**
   * Check if AI analysis panel is open
   * @returns {Promise<boolean>} - Is open
   */
  async isAIAnalysisOpen() {
    return await this.isVisible(this.selectors.aiAnalysis.title);
  }

  /**
   * Get confidence score
   * @returns {Promise<string|null>} - Confidence score
   */
  async getConfidenceScore() {
    const score = this.page.locator(this.selectors.aiAnalysis.confidenceScore);
    try {
      const text = await score.textContent();
      const match = text.match(/(\d+)%/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Switch AI analysis tab
   * @param {string} tab - Tab name: 'Overview', 'Key Pillars', 'Methodology', 'Statistics'
   */
  async switchTab(tab) {
    const button = this.page.locator(`button:has-text("${tab}")`);
    await button.click();
    await this.wait(300);
  }

  /**
   * Close AI analysis panel
   */
  async closeAIAnalysis() {
    await this.click(this.selectors.aiAnalysis.closeButton);
    await this.wait(300);
  }

  // ==================== Comparative Analysis ====================

  /**
   * Check if comparative analysis is open
   * @returns {Promise<boolean>} - Is open
   */
  async isComparativeOpen() {
    return await this.isVisible(this.selectors.comparative.title);
  }

  /**
   * Select article for comparison
   * @param {number} index - Article index in list
   */
  async selectArticleForComparison(index) {
    const article = this.page.locator(this.selectors.comparative.articleSelection).nth(index);
    await article.click();
    await this.wait(200);
  }

  /**
   * Run comparison
   */
  async runComparison() {
    const button = this.page.locator(this.selectors.comparative.compareButton);
    await button.click();
    await this.wait(3000); // Wait for analysis
  }

  /**
   * Get similarity score
   * @returns {Promise<string|null>} - Similarity score
   */
  async getSimilarityScore() {
    const score = this.page.locator(this.selectors.comparative.similarityScore);
    try {
      const text = await score.textContent();
      const match = text.match(/(\d+)%/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Switch comparative tab
   * @param {string} tab - Tab: 'overview', 'methodology', 'findings', 'populations', 'quality', 'synthesis'
   */
  async switchComparativeTab(tab) {
    const button = this.page.locator(`button:has-text("${tab}")`).first();
    await button.click();
    await this.wait(300);
  }

  // ==================== Synthesis Report ====================

  /**
   * Check if synthesis report is open
   * @returns {Promise<boolean>} - Is open
   */
  async isSynthesisOpen() {
    return await this.isVisible(this.selectors.synthesis.title);
  }

  /**
   * Get synthesis summary
   * @returns {Promise<string|null>} - Summary text
   */
  async getSynthesisSummary() {
    const summary = this.page.locator(this.selectors.synthesis.summary);
    try {
      return await summary.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get findings count
   * @returns {Promise<number>} - Number of findings
   */
  async getFindingsCount() {
    return await this.getCount(this.selectors.synthesis.findings);
  }

  // ==================== Batch Analysis ====================

  /**
   * Check if batch analysis is open
   * @returns {Promise<boolean>} - Is open
   */
  async isBatchOpen() {
    return await this.isVisible(this.selectors.batch.title);
  }

  /**
   * Generate batch report
   */
  async generateBatchReport() {
    await this.click(this.selectors.batch.generateButton);
    await this.wait(3000);
  }

  /**
   * Get consensus level
   * @returns {Promise<string|null>} - Consensus level
   */
  async getConsensusLevel() {
    const level = this.page.locator(this.selectors.batch.consensusLevel);
    try {
      return await level.textContent();
    } catch {
      return null;
    }
  }

  // ==================== Research Log ====================

  /**
   * Check if log modal is open
   * @returns {Promise<boolean>} - Is open
   */
  async isLogOpen() {
    return await this.isVisible(this.selectors.log.title);
  }

  /**
   * Get log entry count
   * @returns {Promise<number>} - Number of log entries
   */
  async getLogEntryCount() {
    return await this.getCount(this.selectors.log.logEntry);
  }

  // ==================== Citation Graph ====================

  /**
   * Check if citation graph is open
   * @returns {Promise<boolean>} - Is open
   */
  async isCitationGraphOpen() {
    return await this.isVisible(this.selectors.citationGraph.title);
  }

  /**
   * Wait for citation graph to load
   */
  async waitForCitationGraph() {
    // The graph shows loading first then content
    await this.waitForHidden(this.selectors.citationGraph.loading, 5000).catch(() => {});
    await this.wait(500);
  }
}

module.exports = ModalPage;
