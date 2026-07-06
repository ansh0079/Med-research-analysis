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

const mockAgentGuidance = {
  topic: 'sglt2 heart failure',
  status: 'ai_generated',
  confidence: 0.82,
  mentorMessage: 'Start with outcome trials, then compare heart-failure subgroup effects.',
  seminalPapers: [
    { sourceIndex: 1, title: 'DAPA-HF', clinicalPrinciple: 'Reduced worsening heart failure and cardiovascular death.' },
  ],
  teachingPoints: [
    { claim: 'SGLT2 inhibitors improve heart-failure outcomes beyond glucose lowering.', sourceIndices: [1], confidence: 'HIGH' },
  ],
};

test.describe('search → results → interaction flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Skip the cookie-consent banner and post-login onboarding modal — both were
    // added after this suite was written and otherwise intercept every click.
    await page.addInitScript(() => {
      localStorage.setItem('med_cookie_consent_v1', 'accepted');
      localStorage.setItem('med_onboarding_done', '1');
      void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        regs.forEach((reg) => { void reg.unregister(); });
      });
    });

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
      const url = route.request().url();
      if (route.request().method() !== 'GET' || !url.includes('q=')) {
        await route.continue();
        return;
      }
      if (url.includes('/api/search/intelligence')
        || url.includes('/api/search/impressions')
        || url.includes('/api/search/ai-enrichment')
        || url.includes('/api/search/mesh-suggest')) {
        await route.continue();
        return;
      }
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

    await page.route('**/api/evidence-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ alerts: [] }),
      });
    });
  });

  test('homepage loads with correct branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Signal MD.*Medical Evidence Intelligence/i);
    await expect(page.getByRole('button', { name: /Go to search/i })).toBeVisible();
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

    const statsBanner = page.locator('main .grid.grid-cols-2').first();
    await expect(statsBanner.getByText('Evidence found', { exact: true })).toBeVisible();
    await expect(statsBanner.getByText('Open access', { exact: true })).toBeVisible();
  });

  test('filter within results narrows list', async ({ page }) => {
    await page.goto('/search');

    await page.getByPlaceholder(/SGLT2 inhibitors/i).fill('sglt2 heart failure');
    await page.getByRole('banner').getByRole('button', { name: /^Search$/ }).click();

    const filterInput = page.getByPlaceholder(/Filter titles/i);
    await filterInput.fill('empagliflozin');

    const resultCards = page.locator('main .grid.grid-cols-1.gap-6').getByRole('article');
    await expect(resultCards.filter({ hasText: /Empagliflozin/i })).toHaveCount(1);
    await expect(resultCards.filter({ hasText: /SGLT2 inhibitors in heart failure/i })).toHaveCount(0);
  });

  test('deferred intelligence renders results first then mentor guidance', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('med_onboarding_done', '1');
    });

    await page.route('**/api/search?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockSearchResponse,
          agentGuidance: null,
          topicIntelligence: null,
          intelligenceStatus: 'deferred',
          learnerContext: {
            hasPersonalization: true,
            memoryTier: 'active',
            searchCount: 4,
            weakTopicCount: 0,
            profileWeakTopicCount: 0,
            claimMasteryCount: 3,
            weakClaimCount: 1,
            hasTrajectory: true,
            hasConversationMemory: false,
          },
        }),
      });
    });

    await page.route(/\/api\/search\/intelligence$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agentGuidance: mockAgentGuidance,
          knowledgeAvailable: true,
          topicIntelligence: null,
          learningContext: { personalized: true, memoryTier: 'active', searchCount: 4, topPaperCount: 0, savedPaperCount: 0, weakOutlineNodeCount: 0 },
          learnerContext: {
            hasPersonalization: true,
            memoryTier: 'active',
            searchCount: 4,
            weakTopicCount: 0,
            profileWeakTopicCount: 0,
            claimMasteryCount: 3,
            weakClaimCount: 1,
            hasTrajectory: true,
            hasConversationMemory: false,
          },
        }),
      });
    });

    await page.goto('/search');
    const dismiss = page.getByRole('button', { name: /Dismiss/i }).first();
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
    }
    await page.getByPlaceholder(/SGLT2 inhibitors/i).fill('sglt2 heart failure');
    await page.getByRole('banner').getByRole('button', { name: /^Search$/ }).click();

    await expect(page.getByRole('link', { name: /SGLT2 inhibitors in heart failure/i }).first()).toBeVisible();
    await expect(page.getByText(/Personalizing topic intelligence/i).first()).toBeVisible();
    await expect(page.getByText(/Personalized remediation/i)).toBeVisible();
    await expect(page.getByText(/1 weak claim/i)).toBeVisible();
    await expect(page.getByText(/Mentor Message/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Start with outcome trials/i)).toBeVisible();
    await expect(page.getByText(/Personalizing topic intelligence/i)).toHaveCount(0);
  });

  test('legal routes work', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/not for protected health information/i)).toBeVisible();

    await page.getByRole('link', { name: /Terms of Use/i }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
    await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible();
  });
});
