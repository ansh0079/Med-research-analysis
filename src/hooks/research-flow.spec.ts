import { test, expect } from '@playwright/test';

/**
 * Medical Research Platform E2E Suite
 *
 * Covers: Search functionality, Selection Basket,
 * AI Synthesis, and Collaborative Presence.
 */

test.describe('Medical Research Platform E2E', () => {
  test('Search, Save, and Analyze Flow', async ({ page }) => {
    await page.goto('/');

    // Search for a topic
    const searchInput = page.locator('input[placeholder*="search"]');
    await searchInput.fill('Immunotherapy for cancer');
    await searchInput.press('Enter');

    // Wait for results
    const articleCount = await page.locator('.article-card').count();
    expect(articleCount).toBeGreaterThan(0);

    // Save an article
    const firstArticle = page.locator('.article-card').first();
    await firstArticle.locator('button:has-text("Save")').click();

    // Verify it's in the saved articles dashboard
    await page.click('button:has-text("Saved")');
    await expect(page.locator('.saved-dashboard')).toBeVisible();
    await expect(page.locator('.saved-dashboard .article-card')).toHaveCount(1);

    // Test Selection Basket for Synthesis
    await page.locator('.article-card').first().locator('button:has-text("Add to Basket")').click();
    await page.click('button:has-text("Synthesize")');
    await expect(page.locator('.synthesis-result')).toBeVisible();
    await expect(page.locator('.synthesis-result')).not.toBeEmpty();

    // Run AI analysis
    await firstArticle.locator('button:has-text("Analyze")').click();
    await expect(page.locator('.analysis-panel')).toBeVisible();
    await expect(page.locator('.analysis-content')).not.toBeEmpty();

    // Check search history
    await page.click('button:has-text("History")');
    await expect(page.locator('text=Immunotherapy for cancer')).toBeVisible();
  });

  test('Collaborative presence indicators', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('/article/test-id');

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const articleUrl = '/article/test-id';

    await page1.goto(articleUrl);
    await page2.goto(articleUrl);

    // Assert both users are visible in the presence list
    await expect(page1.locator('.presence-indicator')).toContainText('2');
    await expect(page2.locator('.presence-indicator')).toContainText('2');

    await page2.close();
    await expect(page1.locator('.presence-indicator')).toContainText('1');
  });
});