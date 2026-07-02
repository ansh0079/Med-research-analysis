const { test, expect } = require('@playwright/test');

const mockSearchResponse = {
  articles: [
    {
      uid: 'pmid-123',
      title: 'SGLT2 inhibitors in heart failure with preserved ejection fraction',
      abstract: 'A randomized trial summary for beta smoke testing.',
      journal: 'Journal of Evidence Medicine',
      source: 'PubMed',
      _source: 'pubmed',
      pubdate: '2025',
      authors: [{ name: 'Doe J' }, { name: 'Smith A' }],
      pmid: '123',
      doi: '10.1000/beta-smoke',
      isFree: true,
      pmcrefcount: 12,
      pubtype: ['Randomized Controlled Trial'],
      _quality: { grade: 'A', score: 92, signals: ['RCT'], factors: ['Randomized design'] },
      _impact: { score: 0.86, factors: ['Recent', 'Cited'] },
    },
  ],
  count: 1,
  query: 'sglt2 hfpef',
  sources: ['pubmed'],
  agentGuidance: null,
  topicIntelligence: null,
  knowledgeAvailable: true,
};

test.describe('beta smoke', () => {
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

    await page.route('**/api/search**', async (route) => {
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

  test('serves the current app shell', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Signal MD.*Medical Evidence Intelligence/i);
    await expect(page.getByRole('button', { name: /Go to search/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i }).first()).toBeVisible();
    await expect(page.getByText(/Search 100 M\+/i)).toBeVisible();
  });

  test('loads the search route and returns mocked results', async ({ page }) => {
    await page.goto('/search');

    const searchBox = page.getByPlaceholder(/SGLT2 inhibitors/i);
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(searchBox).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await searchBox.fill('sglt2 hfpef');
    await submitButton.click();

    await expect(page.getByRole('link', { name: /SGLT2 inhibitors in heart/i })).toBeVisible();
    await expect(page.getByText(/Journal of Evidence Medicine/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /View on PubMed/i })).toBeVisible();
  });

  test('renders the compliance notice and legal routes', async ({ page }) => {
    await page.goto('/search');

    await expect(page.getByText(/not for protected health information/i)).toBeVisible();
    await page.getByLabel('Data use notice').getByRole('link', { name: /Privacy/i }).click();
    await expect(page).toHaveURL(/\/legal\/privacy$/);
    await expect(page.getByRole('heading', { name: /Privacy/i })).toBeVisible();
  });

  test('collects five-step learner onboarding preferences', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'u-e2e', email: 'e2e@example.com', role: 'user' } }),
      });
    });

    let savedProfile = null;
    await page.route('**/api/learning/profile', async (route) => {
      if (route.request().method() === 'POST') {
        savedProfile = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ profile: { id: 1, userId: 'u-e2e', ...savedProfile } }),
        });
        return;
      }
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Profile not found' }),
      });
    });

    await page.goto('/');

    await page.getByRole('button', { name: /Finals/i }).click();
    await page.getByRole('button', { name: /^Next$/ }).click();
    await page.getByRole('button', { name: /Cardiology/i }).click();
    await page.getByRole('button', { name: /^Next$/ }).click();
    await page.getByRole('button', { name: /Pass exams/i }).click();
    await page.getByRole('button', { name: /^Next$/ }).click();
    await page.getByRole('button', { name: /Mixed/i }).click();
    await page.getByRole('button', { name: /^Next$/ }).click();
    await page.getByRole('button', { name: /25 minutes per day/i }).click();
    await page.locator('.fixed').getByRole('button', { name: /^Search$/ }).click();

    await expect.poll(() => savedProfile).toMatchObject({
      trainingStage: 'finals',
      specialtyInterest: 'Cardiology',
      studyGoal: 'Pass exams',
      preferredDifficulty: 'mixed',
      dailyGoalMinutes: 25,
    });
  });
});
