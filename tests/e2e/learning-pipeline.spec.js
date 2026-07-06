/**
 * End-to-End Pipeline Test: search → appraisal → quiz → mastery update
 * Mocks all LLM and backend API calls to run fast and deterministically.
 */

const { test, expect } = require('@playwright/test');

const mockSearchResponse = {
  articles: [
    {
      uid: 'pmid-load-1',
      title: 'Metformin and cardiovascular outcomes in type 2 diabetes',
      abstract: 'Systematic review of metformin cardiovascular effects.',
      journal: 'Diabetes Care',
      source: 'PubMed',
      _source: 'pubmed',
      pubdate: '2024',
      authors: [{ name: 'Johnson A' }],
      pmid: 'load-1',
      doi: '10.1000/load-test-1',
      isFree: true,
      pubtype: ['Systematic Review'],
      _quality: { grade: 'A', score: 90, signals: ['SR'], factors: ['Large N'] },
      _impact: { score: 0.80, factors: ['Cited'] },
      _retraction: null,
    },
  ],
  count: 1,
  query: 'diabetes mellitus',
  sources: ['pubmed'],
  agentGuidance: null,
  topicIntelligence: null,
  knowledgeAvailable: true,
};

const mockSynopsisResponse = {
  synopsis: {
    takeaway: 'Metformin remains first-line therapy for T2DM.',
    clinicalQuestion: 'Is metformin safe for cardiovascular outcomes?',
    studyDesign: 'Systematic review',
    population: 'Adults with type 2 diabetes',
    intervention: 'Metformin',
    comparator: 'Standard care',
    outcomes: 'Cardiovascular events',
    mainFindings: 'Metformin shows cardiovascular safety in large cohorts.',
    clinicalMeaning: 'Metformin remains first-line therapy for T2DM, with proven cardiovascular safety.',
    limitations: 'Mostly observational data.',
    bottomLine: 'Continue metformin as first-line unless contraindicated.',
    trustRating: 'moderate',
    trustRationale: 'Consistent evidence from systematic reviews.',
  },
  status: 'completed',
};

const mockQuizFromEvidence = {
  questions: [
    {
      id: 'q-e2e-1',
      type: 'multiple_choice',
      questionType: 'recall',
      question: 'What is the primary mechanism of metformin?',
      options: [
        'A. Decreases hepatic glucose production',
        'B. Stimulates insulin secretion',
        'C. Inhibits intestinal glucose absorption',
        'D. Increases peripheral insulin sensitivity',
      ],
      correctAnswer: 'A',
      explanation: 'Metformin primarily suppresses hepatic gluconeogenesis.',
      difficulty: 'medium',
    },
    {
      id: 'q-e2e-2',
      type: 'multiple_choice',
      questionType: 'clinical_application',
      question: 'Which patient should NOT receive metformin?',
      options: [
        'A. eGFR 45 mL/min/1.73m²',
        'B. eGFR 25 mL/min/1.73m²',
        'C. BMI 32 kg/m²',
        'D. Age 55 years',
      ],
      correctAnswer: 'B',
      explanation: 'Metformin is contraindicated when eGFR < 30.',
      difficulty: 'medium',
    },
    {
      id: 'q-e2e-3',
      type: 'multiple_choice',
      questionType: 'guideline',
      question: 'According to ADA guidelines, metformin is:',
      options: [
        'A. Second-line after sulfonylureas',
        'B. First-line for most adults with T2DM',
        'C. Only for monotherapy',
        'D. Contraindicated in prediabetes',
      ],
      correctAnswer: 'B',
      explanation: 'ADA recommends metformin as first-line unless contraindicated.',
      difficulty: 'medium',
    },
  ],
  topic: 'diabetes mellitus',
  provider: 'mock',
  disclaimer: 'For education only',
};

const mockQuizAttemptResponse = {
  updated: true,
  score: 2,
  total: 3,
  masteryDelta: 0.15,
};

test.describe('learning pipeline: search → appraisal → quiz → mastery', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
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
        body: JSON.stringify({ version: '2.0.0', features: { vectorSearch: false }, keys: {} }),
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suggestions: [] }) });
    });

    await page.route('**/api/evidence-alerts**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ alerts: [] }) });
    });

    await page.route('**/api/ai/synopsis', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSynopsisResponse),
      });
    });

    await page.route('**/api/quiz/from-evidence', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQuizFromEvidence),
      });
    });

    await page.route('**/api/learning/quiz-attempt', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQuizAttemptResponse),
      });
    });
  });

  test('full pipeline from search to quiz completion', async ({ page }) => {
    await page.goto('/search');
    const searchBox = page.getByPlaceholder(/SGLT2 inhibitors/i);
    await expect(searchBox).toBeVisible();

    await searchBox.fill('diabetes mellitus');
    await page.getByRole('banner').getByRole('button', { name: /^Search$/ }).click();

    const articleCard = page.getByRole('article').filter({ hasText: /Metformin and cardiovascular outcomes/i });
    await expect(articleCard).toBeVisible();

    await articleCard.getByRole('button', { name: /Critically Appraise/i }).click();
    await expect(articleCard.getByText(/first-line therapy/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Quiz me on this/i }).click();
    await expect(page.getByText(/What is the primary mechanism of metformin/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /^A:/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Which patient should NOT receive metformin/i)).toBeVisible();
    await page.getByRole('button', { name: /^B:/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/According to ADA guidelines/i)).toBeVisible();
    await page.getByRole('button', { name: /^A:/ }).click();
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page.getByText(/2 of 3 correct/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Saved/i).first()).toBeVisible({ timeout: 10000 });
  });
});
