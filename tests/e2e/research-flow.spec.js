/**
 * Core E2E flow: search → results → article interaction
 * Replaces legacy Antigravity-targeted suite.
 */

const { test, expect } = require('@playwright/test');

const mockSearchResponse = {
  articles: [
    {
      uid: 'pmid-123',
      title: 'SGLT2 inhibitors in heart failure with preserved ejection fraction',
      abstract: 'A randomized trial summary for E2E testing.',
      journal: 'Journal of Evidence Medicine',
      source: 'PubMed',
      _source: 'pubmed',
      pubdate: '2025',
      authors: [{ name: 'Doe J' }, { name: 'Smith A' }],
      pmid: '123',
      doi: '10.1000/e2e-test',
      isFree: true,
      pmcid: 'PMC123',
      pmcrefcount: 12,
      pubtype: ['Randomized Controlled Trial'],
      _quality: { grade: 'A', score: 92, signals: ['RCT'], factors: ['Randomized design'] },
      _impact: { score: 0.86, factors: ['Recent', 'Cited'] },
      _retraction: null,
    },
    {
      uid: 'pmid-456',
      title: 'Empagliflozin and cardiovascular outcomes in diabetes',
      abstract: 'Secondary abstract for testing.',
      journal: 'Lancet',
      source: 'PubMed',
      _source: 'pubmed',
      pubdate: '2024',
      authors: [{ name: 'Brown K' }],
      pmid: '456',
      doi: '10.1000/e2e-test-2',
      isFree: false,
      pmcrefcount: 45,
      pubtype: ['Meta-Analysis'],
      _quality: { grade: 'B', score: 78, signals: ['Meta'], factors: ['Large N'] },
      _impact: { score: 0.72, factors: ['Cited'] },
      _retraction: null,
    },
  ],
  count: 2,
  query: 'sglt2 heart failure',
  sources: ['pubmed'],
  agentGuidance: null,
  topicIntelligence: null,
  knowledgeAvailable: true,
};

test.describe('search → results → interaction flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '2.0.0',
          features: { vectorSearch: false },
          keys: {},
        }),
      });
    });

    await page.route('**/api/search?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSearchResponse),
      });
    });

    await page.route('**/api/search/mesh-suggest?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggestions: [] }),
      });
    });
  });

  test('homepage loads with correct branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MedResearch.*Medical Evidence Intelligence/i);
    await expect(page.getByRole('button', { name: /MedResearch/i })).toBeVisible();
  });

  test('search returns results and renders article cards', async ({ page }) => {
    await page.goto('/search');

    const searchBox = page.getByPlaceholder(/SGLT2 inhibitors/i);
    await searchBox.fill('sglt2 heart failure');

    const submitButton = page.getByRole('banner').getByRole('button', { name: /^Search$/ });
    await submitButton.click();

    await expect(page.getByRole('link', { name: /SGLT2 inhibitors in heart failure/i })).toBeVisible();
    await expect(page.getByText(/Journal of Evidence Medicine/i)).toBeVisible();
    await expect(page.getByText(/Lancet/i)).toBeVisible();
  });

  test('result stats banner shows counts', async ({ page }) => {
    await page.goto('/search');

    await page.getByPlaceholder(/SGLT2 inhibitors/i).fill('sglt2 heart failure');
    await page.getByRole('banner').getByRole('button', { name: /^Search$/ }).click();

    await expect(page.getByText(/Evidence found/i)).toBeVisible();
    await expect(page.getByText(/Open access/i)).toBeVisible();
  });

  test('filter within results narrows list', async ({ page }) => {
    await page.goto('/search');

    await page.getByPlaceholder(/SGLT2 inhibitors/i).fill('sglt2 heart failure');
    await page.getByRole('banner').getByRole('button', { name: /^Search$/ }).click();

    const filterInput = page.getByPlaceholder(/Filter titles/i);
    await filterInput.fill('empagliflozin');

    await expect(page.getByText(/Empagliflozin/i)).toBeVisible();
    await expect(page.getByText(/SGLT2 inhibitors in heart failure/i)).not.toBeVisible();
  });

  test('legal routes work', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/not for protected health information/i)).toBeVisible();

    await page.getByRole('link', { name: /Terms of Use/i }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
    await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible();
  });
});
