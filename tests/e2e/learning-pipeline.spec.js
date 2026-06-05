/**
 * End-to-End Pipeline Test: search → synopsis → quiz → mastery update
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

const mockSynopsis = {
  synopsis: 'Metformin remains first-line therapy for T2DM, with proven cardiovascular safety.',
  keyPoints: ['First-line therapy', 'Cardiovascular safety'],
  clinicalPearls: ['Start low and titrate to minimize GI side effects.'],
};

const mockQuiz = {
  questions: [
    {
      id: 'q-e2e-1',
      type: 'recall',
      text: 'What is the primary mechanism of metformin?',
      options: [
        { id: 'opt-a', text: 'Decreases hepatic glucose production' },
        { id: 'opt-b', text: 'Stimulates insulin secretion' },
        { id: 'opt-c', text: 'Inhibits intestinal glucose absorption' },
        { id: 'opt-d', text: 'Increases peripheral insulin sensitivity' },
      ],
      correctOptionId: 'opt-a',
      explanation: 'Metformin primarily suppresses hepatic gluconeogenesis.',
    },
    {
      id: 'q-e2e-2',
      type: 'clinical_application',
      text: 'Which patient should NOT receive metformin?',
      options: [
        { id: 'opt-a', text: 'eGFR 45 mL/min/1.73m²' },
        { id: 'opt-b', text: 'eGFR 25 mL/min/1.73m²' },
        { id: 'opt-c', text: 'BMI 32 kg/m²' },
        { id: 'opt-d', text: 'Age 55 years' },
      ],
      correctOptionId: 'opt-b',
      explanation: 'Metformin is contraindicated when eGFR < 30.',
    },
    {
      id: 'q-e2e-3',
      type: 'guideline',
      text: 'According to ADA guidelines, metformin is:',
      options: [
        { id: 'opt-a', text: 'Second-line after sulfonylureas' },
        { id: 'opt-b', text: 'First-line for most adults with T2DM' },
        { id: 'opt-c', text: 'Only for monotherapy' },
        { id: 'opt-d', text: 'Contraindicated in prediabetes' },
      ],
      correctOptionId: 'opt-b',
      explanation: 'ADA recommends metformin as first-line unless contraindicated.',
    },
  ],
};

const mockQuizAttemptResponse = {
  updated: true,
  score: 2,
  total: 3,
  masteryDelta: 0.15,
};

const mockMastery = {
  topic: 'diabetes mellitus',
  overall: 0.72,
  claimMastery: { 'metformin-mechanism': 0.90, 'metformin-contraindication': 0.50, 'ada-guideline': 0.75 },
  history: [
    { date: new Date().toISOString(), score: 2, total: 3 },
  ],
};

test.describe('learning pipeline: search → synopsis → quiz → mastery', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Mock config
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '2.0.0', features: { vectorSearch: false }, keys: {} }),
      });
    });

    // Mock search
    await page.route(/\/api\/search\?.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSearchResponse),
      });
    });

    // Mock MeSH suggest
    await page.route('**/api/search/mesh-suggest?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suggestions: [] }) });
    });

    // Mock alerts
    await page.route('**/api/evidence-alerts**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ alerts: [] }) });
    });

    // Mock synopsis
    await page.route('**/api/ai/synopsis', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSynopsis),
      });
    });

    // Mock quiz generate
    await page.route('**/api/quiz/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQuiz),
      });
    });

    // Mock quiz attempt
    await page.route('**/api/learning/quiz-attempt', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQuizAttemptResponse),
      });
    });

    // Mock mastery
    await page.route('**/api/learning/mastery/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMastery),
      });
    });
  });

  test('full pipeline from search to mastery update', async ({ page }) => {
    // ── 1. Search ──
    await page.goto('/search');
    await expect(page.getByPlaceholder(/diabetes/i)).toBeVisible();

    const searchBox = page.getByPlaceholder(/diabetes/i);
    await searchBox.fill('diabetes mellitus');

    const submitButton = page.getByRole('banner').getByRole('button', { name: /^Search$/ });
    await submitButton.click();

    await expect(page.getByRole('link', { name: /Metformin and cardiovascular outcomes/i })).toBeVisible();

    // ── 2. Synopsis ──
    await page.getByRole('link', { name: /Metformin and cardiovascular outcomes/i }).click();

    // Wait for synopsis to appear (UI may show it inline or in a drawer)
    await expect(page.getByText(/Synopsis/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/first-line therapy/i)).toBeVisible();

    // ── 3. Quiz Generation ──
    // Click quiz generation trigger (adapt selector to actual UI)
    const quizTrigger = page.getByRole('button', { name: /Quiz|Test|Study/i }).first();
    if (await quizTrigger.isVisible().catch(() => false)) {
      await quizTrigger.click();
    }

    // Wait for quiz questions to render
    await expect(page.getByText(/What is the primary mechanism of metformin/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Which patient should NOT receive metformin/i)).toBeVisible();
    await expect(page.getByText(/According to ADA guidelines/i)).toBeVisible();

    // ── 4. Quiz Attempt ──
    // Answer Q1 correctly
    await page.getByText(/Decreases hepatic glucose production/i).click();
    // Answer Q2 correctly
    await page.getByText(/eGFR 25 mL\/min\/1\.73m²/i).click();
    // Answer Q3 correctly
    await page.getByText(/First-line for most adults with T2DM/i).click();

    // Submit quiz
    const submitQuiz = page.getByRole('button', { name: /Submit|Finish|Done/i });
    await submitQuiz.click();

    // ── 5. Mastery Update ──
    await expect(page.getByText(/2\s*\/\s*3/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Score/i)).toBeVisible();

    // Verify mastery dashboard link/content is visible
    await expect(page.getByText(/Mastery/i).first()).toBeVisible();
  });
});
