/**
 * Article Card/Page Object
 * 
 * Represents individual article cards and their interactions
 */

const BasePage = require('./BasePage');

class ArticlePage extends BasePage {
  constructor(page, articleIndex = 0) {
    super(page);
    this.articleIndex = articleIndex;
    this.cardSelector = `.article-card, [class*="article-card"]:nth-of-type(${articleIndex + 1})`;
  }

  /**
   * Get the article card locator
   * @returns {Locator} - Article card locator
   */
  getCard() {
    return this.page.locator('.article-card, [class*="article-card"]').nth(this.articleIndex);
  }

  /**
   * Get article title
   * @returns {Promise<string>} - Article title
   */
  async getTitle() {
    const card = this.getCard();
    return await card.locator('h3').textContent();
  }

  /**
   * Get article authors
   * @returns {Promise<string>} - Authors text
   */
  async getAuthors() {
    const card = this.getCard();
    return await card.locator('p.text-xs, p:has-text("et al")').first().textContent();
  }

  /**
   * Get article source/journal
   * @returns {Promise<string>} - Source text
   */
  async getSource() {
    const card = this.getCard();
    return await card.locator('text=/journal|source|PubMed|Lancet/i').first().textContent();
  }

  /**
   * Save article to collection
   */
  async save() {
    const card = this.getCard();
    const saveButton = card.locator('button:has(i.fas.fa-bookmark), button:has(i.far.fa-bookmark)').first();
    
    await saveButton.click();
    await this.wait(300);
  }

  /**
   * Check if article is saved
   * @returns {Promise<boolean>} - Is saved
   */
  async isSaved() {
    const card = this.getCard();
    const saveIcon = card.locator('button:has(i.fas.fa-bookmark)');
    return await saveIcon.count() > 0;
  }

  /**
   * Toggle article save state
   */
  async toggleSave() {
    const card = this.getCard();
    const saveButton = card.locator('button:has(.fa-bookmark)').first();
    await saveButton.click();
    await this.wait(300);
  }

  /**
   * Open article abstract
   */
  async openAbstract() {
    const card = this.getCard();
    const abstractButton = card.locator('button:has-text("Abstract"), button:has-text("Show Abstract")').first();
    await abstractButton.click();
    await this.wait(300);
  }

  /**
   * Close article abstract
   */
  async closeAbstract() {
    const card = this.getCard();
    const hideButton = card.locator('button:has-text("Hide"), button:has-text("Hide Abstract")').first();
    await hideButton.click();
    await this.wait(300);
  }

  /**
   * Check if abstract is visible
   * @returns {Promise<boolean>} - Abstract is visible
   */
  async isAbstractVisible() {
    const card = this.getCard();
    const abstract = card.locator('[class*="abstract"], p:has-text("Conclusion")');
    return await abstract.isVisible();
  }

  /**
   * Open AI Analysis panel
   */
  async openAIAnalysis() {
    const card = this.getCard();
    const aiButton = card.locator('button:has-text("Cloud AI"), button:has(i.fas.fa-cloud)').first();
    await aiButton.click();
    await this.wait(500);
  }

  /**
   * Open Mistral AI Analysis
   * @param {string} analysisType - Type: 'quick', 'comprehensive', 'biomedical', 'layperson', 'critical'
   */
  async openMistralAnalysis(analysisType = 'comprehensive') {
    const card = this.getCard();
    
    // Click Mistral AI button to open menu
    const mistralButton = card.locator('button:has-text("Mistral AI")').first();
    await mistralButton.click();
    await this.wait(200);
    
    // Select analysis type from dropdown
    const typeMap = {
      'quick': 'Quick Scan',
      'comprehensive': 'Deep Analysis',
      'biomedical': 'Biomedical Entities',
      'layperson': 'Patient Summary',
      'critical': 'Critical Review',
    };
    
    const menuItem = this.page.locator(`button:has-text("${typeMap[analysisType]}")`);
    await menuItem.click();
    await this.wait(500);
  }

  /**
   * Open Med-Gemma Analysis
   */
  async openMedGemmaAnalysis() {
    const card = this.getCard();
    const gemmaButton = card.locator('button:has-text("Med-Gemma"), button:has(i.fab.fa-google)').first();
    await gemmaButton.click();
    await this.wait(500);
  }

  /**
   * Add to comparison
   */
  async addToComparison() {
    const card = this.getCard();
    const compareButton = card.locator('button:has-text("Compare")').first();
    await compareButton.click();
    await this.wait(300);
  }

  /**
   * Remove from comparison
   */
  async removeFromComparison() {
    const card = this.getCard();
    const comparingButton = card.locator('button:has-text("Comparing")').first();
    await comparingButton.click();
    await this.wait(300);
  }

  /**
   * Check if article is selected for comparison
   * @returns {Promise<boolean>} - Is selected
   */
  async isSelectedForComparison() {
    const card = this.getCard();
    const compareButton = card.locator('button:has-text("Comparing")');
    return await compareButton.count() > 0;
  }

  /**
   * Add to batch selection
   */
  async addToBatch() {
    const card = this.getCard();
    const batchButton = card.locator('button:has(i.fas.fa-plus)').last();
    await batchButton.click();
    await this.wait(300);
  }

  /**
   * Remove from batch selection
   */
  async removeFromBatch() {
    const card = this.getCard();
    const batchButton = card.locator('button:has(i.fas.fa-check)').last();
    await batchButton.click();
    await this.wait(300);
  }

  /**
   * Open citation graph
   */
  async openCitationGraph() {
    const card = this.getCard();
    const networkButton = card.locator('button:has-text("Network")').first();
    await networkButton.click();
    await this.wait(500);
  }

  /**
   * Open similar articles panel
   */
  async openSimilarArticles() {
    const card = this.getCard();
    const similarButton = card.locator('button:has-text("Semantic")').first();
    await similarButton.click();
    await this.wait(500);
  }

  /**
   * Open full text link
   */
  async openFullText() {
    const card = this.getCard();
    const fullTextButton = card.locator('button:has-text("Full Text"), a:has-text("Full Text")').first();
    
    // Get href if it's a link
    const href = await fullTextButton.getAttribute('href');
    if (href) {
      return href;
    }
    
    // Otherwise click
    await fullTextButton.click();
  }

  /**
   * View article on PubMed
   * @returns {Promise<string>} - PubMed URL
   */
  async getPubMedUrl() {
    const card = this.getCard();
    const link = card.locator('h3 a').first();
    return await link.getAttribute('href');
  }

  /**
   * Check if article is open access
   * @returns {Promise<boolean>} - Is open access
   */
  async isOpenAccess() {
    const card = this.getCard();
    const openAccessBadge = card.locator('text=/Open Access|Free/i');
    return await openAccessBadge.count() > 0;
  }

  /**
   * Get article badge (bias level, etc.)
   * @returns {Promise<string|null>} - Badge text
   */
  async getBiasBadge() {
    const card = this.getCard();
    const badge = card.locator('text=/Bias: .+/i').first();
    try {
      return await badge.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get article impact score
   * @returns {Promise<string|null>} - Impact level
   */
  async getImpactLevel() {
    const card = this.getCard();
    const hasHighImpact = await card.locator('[class*="ring-2"][class*="ring-indigo"]').count() > 0;
    return hasHighImpact ? 'high' : 'normal';
  }

  /**
   * Copy abstract to clipboard
   */
  async copyAbstract() {
    const card = this.getCard();
    const copyButton = card.locator('button:has-text("Copy")').first();
    await copyButton.click();
    await this.wait(200);
  }

  /**
   * Get all article actions/buttons
   * @returns {Promise<Array>} - Available actions
   */
  async getAvailableActions() {
    const card = this.getCard();
    const buttons = card.locator('button');
    const count = await buttons.count();
    const actions = [];
    
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      if (text) actions.push(text.trim());
    }
    
    return actions;
  }
}

module.exports = ArticlePage;
