/**
 * Analytics Page Object
 * 
 * Represents the analytics dashboard and visualizations
 */

const BasePage = require('./BasePage');

class AnalyticsPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Research Visualization section
      container: '[class*="Research Intelligence"], [class*="rounded-3xl"]:has-text("Research Intelligence")',
      title: 'text=/Research Intelligence/i',
      
      // Chart tabs
      tabs: {
        timeline: 'button:has-text("Timeline")',
        journals: 'button:has-text("Journals")',
        citations: 'button:has-text("Citations")',
        topics: 'button:has-text("Topics")',
      },
      
      // Chart containers
      charts: {
        timeline: 'svg:has(rect), [class*="TimelineChart"]',
        journals: '[class*="JournalChart"], [class*="overflow-y-auto"]',
        citations: '[class*="CitationChart"], [class*="flex items-end"]',
        topics: '[class*="TopicChart"], [class*="flex-wrap gap-2"]',
      },
      
      // Chart elements
      chartElements: {
        bars: 'rect',
        labels: 'text',
        dataPoints: '[class*="bg-indigo-500"]',
      },
      
      // Stats
      stats: {
        studiesCount: 'text=/Studies Synthesized/i',
        sorting: 'text=/neural impact score/i',
      },
      
      // Batch/Synthesis buttons
      actions: {
        batchAnalysis: 'button:has-text("Batch Analysis")',
        generateSynthesis: 'button:has-text("Generate Synthesis")',
        precisionSelector: 'text=/Search Precision/i',
      },
    };
  }

  /**
   * Check if analytics visualization is visible
   * @returns {Promise<boolean>} - Is visible
   */
  async isVisible() {
    return await super.isVisible(this.selectors.container) || 
           await super.isVisible(this.selectors.title);
  }

  /**
   * Switch to specific chart view
   * @param {string} view - View name: 'timeline', 'journals', 'citations', 'topics'
   */
  async switchView(view) {
    const tabSelector = this.selectors.tabs[view];
    if (tabSelector) {
      await this.click(tabSelector);
      await this.wait(500);
    }
  }

  /**
   * Get current active view
   * @returns {Promise<string>} - Current view name
   */
  async getCurrentView() {
    for (const [view, selector] of Object.entries(this.selectors.tabs)) {
      const tab = this.page.locator(selector);
      const isActive = await tab.evaluate(el => 
        el.classList.contains('bg-white') || 
        el.classList.contains('shadow-sm') ||
        el.classList.contains('text-indigo')
      ).catch(() => false);
      
      if (isActive) return view;
    }
    return 'timeline'; // default
  }

  /**
   * Get studies count from visualization
   * @returns {Promise<number>} - Number of studies
   */
  async getStudiesCount() {
    const text = await this.getText(this.selectors.stats.studiesCount);
    const match = text.match(/(\d+)\s*Studies/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Check if chart has data
   * @param {string} chartType - Chart type to check
   * @returns {Promise<boolean>} - Has data
   */
  async chartHasData(chartType = 'timeline') {
    const chartSelector = this.selectors.charts[chartType];
    if (!chartSelector) return false;
    
    const chart = this.page.locator(chartSelector).first();
    
    // Check for data elements
    const hasElements = await chart.locator('rect, div[class*="bg-indigo"], span').count() > 0;
    
    return hasElements;
  }

  /**
   * Get chart data points
   * @param {string} chartType - Chart type
   * @returns {Promise<Array>} - Data points
   */
  async getChartData(chartType = 'timeline') {
    const chartSelector = this.selectors.charts[chartType];
    const chart = this.page.locator(chartSelector).first();
    
    const dataPoints = [];
    
    if (chartType === 'timeline') {
      const bars = chart.locator('rect');
      const count = await bars.count();
      for (let i = 0; i < count; i++) {
        const title = await bars.nth(i).getAttribute('title');
        dataPoints.push(title);
      }
    } else if (chartType === 'journals') {
      const items = chart.locator('[class*="mb-3"], div:has(> div.flex)');
      const count = await items.count();
      for (let i = 0; i < count; i++) {
        const text = await items.nth(i).textContent();
        dataPoints.push(text);
      }
    } else if (chartType === 'citations') {
      const bars = chart.locator('[class*="w-12"], [class*="bg-indigo"]');
      const count = await bars.count();
      for (let i = 0; i < count; i++) {
        const height = await bars.nth(i).getAttribute('style');
        dataPoints.push(height);
      }
    } else if (chartType === 'topics') {
      const tags = chart.locator('span');
      const count = await tags.count();
      for (let i = 0; i < count; i++) {
        const text = await tags.nth(i).textContent();
        dataPoints.push(text);
      }
    }
    
    return dataPoints;
  }

  /**
   * Click on chart element (for interactive charts)
   * @param {number} index - Element index
   */
  async clickChartElement(index = 0) {
    const chart = this.page.locator(this.selectors.charts.timeline).first();
    const element = chart.locator('rect').nth(index);
    await element.click();
    await this.wait(300);
  }

  /**
   * Open batch analysis
   */
  async openBatchAnalysis() {
    await this.click(this.selectors.actions.batchAnalysis);
    await this.wait(500);
  }

  /**
   * Open synthesis report
   */
  async openSynthesis() {
    await this.click(this.selectors.actions.generateSynthesis);
    await this.wait(500);
  }

  /**
   * Set search precision
   * @param {string} precision - 'moderate', 'strict', 'experimental'
   */
  async setPrecision(precision) {
    const button = this.page.locator(`button:has-text("${precision}")`).filter({ hasText: /^moderate$|^strict$|^experimental$/ }).first();
    await button.click();
    await this.wait(500);
  }

  /**
   * Get all available views
   * @returns {Promise<Array>} - Array of view names
   */
  async getAvailableViews() {
    const views = [];
    for (const [view, selector] of Object.entries(this.selectors.tabs)) {
      if (await this.exists(selector)) {
        views.push(view);
      }
    }
    return views;
  }

  /**
   * Wait for charts to render
   */
  async waitForCharts() {
    // Wait for SVG or chart container to be visible
    await this.page.waitForSelector('svg, [class*="Chart"]', { timeout: 10000 });
    await this.wait(500);
  }

  /**
   * Check if visualization has timeline data
   * @returns {Promise<boolean>} - Has timeline data
   */
  async hasTimelineData() {
    const timeline = this.page.locator(this.selectors.charts.timeline);
    const rects = await timeline.locator('rect').count();
    return rects > 0;
  }

  /**
   * Check if visualization has journal data
   * @returns {Promise<boolean>} - Has journal data
   */
  async hasJournalData() {
    const journals = this.page.locator(this.selectors.charts.journals);
    const items = await journals.locator('[class*="mb-3"]').count();
    return items > 0;
  }

  /**
   * Check if visualization has citation data
   * @returns {Promise<boolean>} - Has citation data
   */
  async hasCitationData() {
    const citations = this.page.locator(this.selectors.charts.citations);
    const bars = await citations.locator('[class*="w-12"]').count();
    return bars > 0;
  }

  /**
   * Check if visualization has topic data
   * @returns {Promise<boolean>} - Has topic data
   */
  async hasTopicData() {
    const topics = this.page.locator(this.selectors.charts.topics);
    const tags = await topics.locator('span').count();
    return tags > 0;
  }

  /**
   * Get top journal from journal chart
   * @returns {Promise<string|null>} - Top journal name
   */
  async getTopJournal() {
    const journals = this.page.locator(this.selectors.charts.journals);
    const firstItem = journals.locator('div').first();
    try {
      const text = await firstItem.textContent();
      return text.split(/\d+/)[0].trim();
    } catch {
      return null;
    }
  }

  /**
   * Get top cited article
   * @returns {Promise<string|null>} - Article UID
   */
  async getTopCitedArticle() {
    const citations = this.page.locator(this.selectors.charts.citations);
    const firstBar = citations.locator('[class*="text-xs"]').first();
    try {
      return await firstBar.textContent();
    } catch {
      return null;
    }
  }
}

module.exports = AnalyticsPage;
